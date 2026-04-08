from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from typing import Optional

router = APIRouter()


def require_admin(user_id: int, db: Session):
    """Check if user is admin. Raises 403 if not."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---- Users ----

@router.get("/users", response_model=list[schemas.UserResponse])
def list_users(user_id: int, db: Session = Depends(get_db)):
    require_admin(user_id, db)
    return db.query(models.User).all()


@router.put("/users/{user_id}/admin")
def toggle_admin(target_id: int, user_id: int, db: Session = Depends(get_db)):
    require_admin(user_id, db)
    user = db.query(models.User).filter(models.User.id == target_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = 1 if not user.is_admin else 0
    db.commit()
    return {"user_id": target_id, "is_admin": user.is_admin}


@router.delete("/users/{user_id}")
def delete_user(target_id: int, user_id: int, db: Session = Depends(get_db)):
    admin = require_admin(user_id, db)
    if target_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = db.query(models.User).filter(models.User.id == target_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"deleted": target_id}


# ---- Groups ----

@router.get("/groups", response_model=list[schemas.GroupResponse])
def list_all_groups(user_id: int, db: Session = Depends(get_db)):
    require_admin(user_id, db)
    return db.query(models.Group).all()


@router.delete("/groups/{group_id}")
def delete_group(group_id: int, user_id: int, db: Session = Depends(get_db)):
    require_admin(user_id, db)
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    db.delete(group)
    db.commit()
    return {"deleted": group_id}


# ---- Expenses ----

@router.get("/expenses", response_model=list[schemas.ExpenseResponse])
def list_all_expenses(user_id: int, db: Session = Depends(get_db)):
    require_admin(user_id, db)
    return db.query(models.Expense).all()


@router.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, user_id: int, db: Session = Depends(get_db)):
    require_admin(user_id, db)
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()
    return {"deleted": expense_id}


# ---- Stats ----

@router.get("/stats")
def get_stats(user_id: int, db: Session = Depends(get_db)):
    require_admin(user_id, db)
    return {
        "total_users": db.query(models.User).count(),
        "total_groups": db.query(models.Group).count(),
        "total_expenses": db.query(models.Expense).count(),
        "total_payments": db.query(models.Payment).count(),
    }
