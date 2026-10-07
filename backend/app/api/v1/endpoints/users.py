"""User management — admin only."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.core.security import hash_password
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserCreateByAdmin, UserOut, UserUpdate

router = APIRouter()


@router.get("", response_model=list[UserOut])
def list_users(
    role: UserRole | None = None,
    search: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    q = db.query(User)
    if role is not None:
        q = q.filter(User.role == role.value)
    if search:
        like = f"%{search}%"
        q = q.filter((User.full_name.ilike(like)) | (User.email.ilike(like)))
    return q.order_by(User.created_at.desc()).limit(limit).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreateByAdmin, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role.value,
        hostel_block=payload.hostel_block,
        room_number=payload.room_number,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.id == admin.id and payload.is_active is False:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Cannot deactivate your own account")
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        user.role = payload.role.value
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.hostel_block is not None:
        user.hostel_block = payload.hostel_block
    if payload.room_number is not None:
        user.room_number = payload.room_number
    db.commit()
    db.refresh(user)
    return user
