from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

router = APIRouter()


@router.get("/group/{group_id}", response_model=list[schemas.ExpenseResponse])
def get_group_expenses(group_id: int, db: Session = Depends(get_db)):
    return db.query(models.Expense).filter(models.Expense.group_id == group_id).all()


@router.post("/", response_model=schemas.ExpenseResponse)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    # Validate paid_by member belongs to the group
    member = db.query(models.Member).filter(
        models.Member.id == expense.paid_by_id,
        models.Member.group_id == expense.group_id
    ).first()
    if not member:
        raise HTTPException(status_code=400, detail="Paid by member not in group")

    # Create expense
    db_expense = models.Expense(
        description=expense.description,
        amount=expense.amount,
        paid_by_id=expense.paid_by_id,
        group_id=expense.group_id
    )
    db.add(db_expense)
    db.flush()

    # Create shares
    num_shares = len(expense.split_between)
    if num_shares == 0:
        raise HTTPException(status_code=400, detail="Must split between at least one member")

    share_amount = expense.amount / num_shares
    for member_id in expense.split_between:
        # Validate member belongs to group
        m = db.query(models.Member).filter(
            models.Member.id == member_id,
            models.Member.group_id == expense.group_id
        ).first()
        if not m:
            raise HTTPException(status_code=400, detail=f"Member {member_id} not in group")

        db_share = models.ExpenseShare(
            expense_id=db_expense.id,
            member_id=member_id,
            amount=share_amount
        )
        db.add(db_share)

    db.commit()
    db.refresh(db_expense)
    return db_expense
