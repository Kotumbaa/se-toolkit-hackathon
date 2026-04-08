from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime


# User schemas
class UserCreate(BaseModel):
    username: str
    display_name: str
    phone: str = ""
    card_number: str = ""
    payment_details: str = ""


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    phone: Optional[str] = None
    card_number: Optional[str] = None
    payment_details: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    display_name: str
    phone: str = ""
    card_number: str = ""
    payment_details: str = ""
    is_admin: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str


# Group schemas
class GroupCreate(BaseModel):
    name: str
    user_id: int  # creator


class JoinGroup(BaseModel):
    invite_code: str
    user_id: int


class GroupResponse(BaseModel):
    id: int
    name: str
    invite_code: str
    created_by_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Member schemas
class MemberCreate(BaseModel):
    name: str
    group_id: int


class MemberResponse(BaseModel):
    id: int
    name: str
    group_id: int
    user_id: Optional[int] = None

    class Config:
        from_attributes = True


# Expense schemas
class ExpenseCreate(BaseModel):
    description: str
    amount: float = Field(gt=0)
    paid_by_id: int
    group_id: int
    split_between: List[int]  # member IDs who share the expense

    @field_validator("split_between")
    @classmethod
    def split_members_must_be_unique(cls, member_ids: List[int]) -> List[int]:
        if len(member_ids) != len(set(member_ids)):
            raise ValueError("split_between must not contain duplicate members")
        return member_ids


class ExpenseResponse(BaseModel):
    id: int
    description: str
    amount: float
    paid_by_id: int
    group_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Debt schemas
class DebtItem(BaseModel):
    from_member: str
    from_member_id: int
    to_member: str
    to_member_id: int
    amount: float
    to_member_phone: str = ""
    to_member_card: str = ""
    to_member_payment_details: str = ""


class DebtResponse(BaseModel):
    group_id: int
    group_name: str
    debts: List[DebtItem]


# Payment schemas
class PaymentCreate(BaseModel):
    from_member_id: int
    to_member_id: int
    amount: float = Field(gt=0)
    group_id: int


class PaymentResponse(BaseModel):
    id: int
    from_member_id: int
    to_member_id: int
    amount: float
    group_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
