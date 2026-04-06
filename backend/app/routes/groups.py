from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
import random
import string

router = APIRouter()


def generate_invite_code(length=6):
    """Generate a random uppercase invite code."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


@router.post("/", response_model=schemas.GroupResponse)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    """Create a new group. Creator is automatically added as a member."""
    # Generate unique invite code
    invite_code = generate_invite_code()
    while db.query(models.Group).filter(models.Group.invite_code == invite_code).first():
        invite_code = generate_invite_code()

    # Get user's display name
    user = db.query(models.User).filter(models.User.id == group.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db_group = models.Group(
        name=group.name,
        invite_code=invite_code,
        created_by_id=group.user_id
    )
    db.add(db_group)
    db.flush()

    # Add creator as first member
    db_member = models.Member(
        name=user.display_name,
        group_id=db_group.id,
        user_id=group.user_id
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_group)
    return db_group


@router.post("/join", response_model=schemas.GroupResponse)
def join_group(join_req: schemas.JoinGroup, db: Session = Depends(get_db)):
    """Join an existing group by invite code."""
    group = db.query(models.Group).filter(models.Group.invite_code == join_req.invite_code.upper()).first()
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    user = db.query(models.User).filter(models.User.id == join_req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already a member
    existing = db.query(models.Member).filter(
        models.Member.group_id == group.id,
        models.Member.user_id == join_req.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already a member of this group")

    # Add as member
    db_member = models.Member(
        name=user.display_name,
        group_id=group.id,
        user_id=join_req.user_id
    )
    db.add(db_member)
    db.commit()
    db.refresh(group)
    return group


@router.get("/user/{user_id}", response_model=list[schemas.GroupResponse])
def get_user_groups(user_id: int, db: Session = Depends(get_db)):
    """Get all groups a user is a member of."""
    members = db.query(models.Member).filter(models.Member.user_id == user_id).all()
    group_ids = [m.group_id for m in members]
    if not group_ids:
        return []
    return db.query(models.Group).filter(models.Group.id.in_(group_ids)).all()


@router.get("/{group_id}", response_model=schemas.GroupResponse)
def get_group(group_id: int, db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


@router.get("/{group_id}/members", response_model=list[schemas.MemberResponse])
def get_group_members(group_id: int, db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return db.query(models.Member).filter(models.Member.group_id == group_id).all()
