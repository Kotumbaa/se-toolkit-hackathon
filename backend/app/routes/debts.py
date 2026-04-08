from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from collections import defaultdict

router = APIRouter()


def build_debt_items(group_id: int, db: Session):
    members = db.query(models.Member).filter(models.Member.group_id == group_id).all()
    if not members:
        return []

    member_names = {m.id: m.name for m in members}

    # Calculate net balance for each member
    # Positive = they are owed money, Negative = they owe money
    balances = defaultdict(float)

    expenses = db.query(models.Expense).filter(models.Expense.group_id == group_id).all()

    for expense in expenses:
        # The payer gets money back
        balances[expense.paid_by_id] += expense.amount

        # Each share owes money
        shares = db.query(models.ExpenseShare).filter(
            models.ExpenseShare.expense_id == expense.id
        ).all()

        for share in shares:
            balances[share.member_id] -= share.amount

    # Subtract payments (from_member paid to_member, so from_member owes less)
    payments = db.query(models.Payment).filter(models.Payment.group_id == group_id).all()
    for payment in payments:
        balances[payment.from_member_id] += payment.amount  # they paid, so balance increases
        balances[payment.to_member_id] -= payment.amount    # they received, so balance decreases

    # Simplify debts: debtors pay to creditors
    debtors = []  # negative balance (owe money)
    creditors = []  # positive balance (are owed money)

    for member_id, balance in balances.items():
        if balance < -0.01:
            debtors.append((member_id, -balance))  # how much they owe
        elif balance > 0.01:
            creditors.append((member_id, balance))  # how much they are owed

    # Calculate who pays whom
    debts = []
    i, j = 0, 0

    while i < len(debtors) and j < len(creditors):
        debtor_id, debtor_amount = debtors[i]
        creditor_id, creditor_amount = creditors[j]

        payment = min(debtor_amount, creditor_amount)

        # Get creditor (to_member) payment details
        creditor_member = db.query(models.Member).filter(models.Member.id == creditor_id).first()
        creditor_user = None
        if creditor_member and creditor_member.user_id:
            creditor_user = db.query(models.User).filter(models.User.id == creditor_member.user_id).first()

        debts.append(schemas.DebtItem(
            from_member=member_names[debtor_id],
            from_member_id=debtor_id,
            to_member=member_names[creditor_id],
            to_member_id=creditor_id,
            amount=round(payment, 2),
            to_member_phone=creditor_user.phone if creditor_user else "",
            to_member_card=creditor_user.card_number if creditor_user else "",
            to_member_payment_details=creditor_user.payment_details if creditor_user else ""
        ))

        if debtor_amount > creditor_amount:
            debtors[i] = (debtor_id, debtor_amount - creditor_amount)
            j += 1
        elif creditor_amount > debtor_amount:
            creditors[j] = (creditor_id, creditor_amount - debtor_amount)
            i += 1
        else:
            i += 1
            j += 1

    return debts


@router.get("/group/{group_id}", response_model=schemas.DebtResponse)
def calculate_debts(group_id: int, db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    debts = build_debt_items(group_id, db)
    return schemas.DebtResponse(group_id=group_id, group_name=group.name, debts=debts)


@router.post("/", response_model=schemas.PaymentResponse)
def record_payment(payment: schemas.PaymentCreate, db: Session = Depends(get_db)):
    """Record a debt settlement payment between two members."""
    if payment.from_member_id == payment.to_member_id:
        raise HTTPException(status_code=400, detail="Cannot pay yourself")

    # Validate members belong to group
    from_member = db.query(models.Member).filter(
        models.Member.id == payment.from_member_id,
        models.Member.group_id == payment.group_id
    ).first()
    if not from_member:
        raise HTTPException(status_code=400, detail="From member not in group")

    to_member = db.query(models.Member).filter(
        models.Member.id == payment.to_member_id,
        models.Member.group_id == payment.group_id
    ).first()
    if not to_member:
        raise HTTPException(status_code=400, detail="To member not in group")

    current_debt = next((
        debt for debt in build_debt_items(payment.group_id, db)
        if debt.from_member_id == payment.from_member_id
        and debt.to_member_id == payment.to_member_id
    ), None)
    if not current_debt:
        raise HTTPException(status_code=400, detail="No outstanding debt for these members")
    if payment.amount > current_debt.amount + 0.01:
        raise HTTPException(status_code=400, detail="Payment exceeds outstanding debt")

    db_payment = models.Payment(
        from_member_id=payment.from_member_id,
        to_member_id=payment.to_member_id,
        amount=payment.amount,
        group_id=payment.group_id
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


@router.get("/group/{group_id}/payments", response_model=list[schemas.PaymentResponse])
def get_group_payments(group_id: int, db: Session = Depends(get_db)):
    """Get all payments for a group."""
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return db.query(models.Payment).filter(models.Payment.group_id == group_id).all()
