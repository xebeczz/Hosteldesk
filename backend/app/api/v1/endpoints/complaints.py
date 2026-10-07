"""Complaints: CRUD, assignment, status workflow, comments, ratings, photos."""
import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.deps import get_current_user, require_admin, require_warden
from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.enums import ALLOWED_TRANSITIONS, SLA_HOURS, Category, Priority, Status, UserRole
from app.models.feedback import Comment, Rating
from app.models.user import User
from app.schemas.complaint import (
    ComplaintAssign,
    ComplaintCreate,
    ComplaintOut,
    ComplaintStatusChange,
    ComplaintUpdate,
)
from app.schemas.misc import CommentCreate, CommentOut, RatingCreate, RatingOut

router = APIRouter()

TERMINAL = {Status.resolved.value, Status.closed.value}


def _sla_due(priority: str) -> datetime:
    hours = SLA_HOURS[Priority(priority)]
    return datetime.now(timezone.utc) + timedelta(hours=hours)


def _breached(c: Complaint) -> bool:
    if c.status in TERMINAL or c.sla_due is None:
        return False
    due = c.sla_due if c.sla_due.tzinfo else c.sla_due.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) > due


def _serialize(c: Complaint) -> ComplaintOut:
    return ComplaintOut(
        id=c.id,
        title=c.title,
        description=c.description,
        category=c.category,
        priority=c.priority,
        status=c.status,
        room_number=c.room_number,
        hostel_block=c.hostel_block,
        photo_urls=c.photos,
        student_id=c.student_id,
        assigned_warden_id=c.assigned_warden_id,
        sla_due=c.sla_due,
        created_at=c.created_at,
        updated_at=c.updated_at,
        acknowledged_at=c.acknowledged_at,
        resolved_at=c.resolved_at,
        closed_at=c.closed_at,
        student_name=c.student.full_name if c.student else None,
        warden_name=c.warden.full_name if c.warden else None,
        rating_score=c.rating.score if c.rating else None,
        sla_breached=_breached(c),
    )


def _visible_query(db: Session, user: User):
    q = db.query(Complaint).options(
        joinedload(Complaint.student), joinedload(Complaint.warden), joinedload(Complaint.rating)
    )
    if user.role == UserRole.student.value:
        q = q.filter(Complaint.student_id == user.id)
    elif user.role == UserRole.warden.value:
        q = q.filter((Complaint.assigned_warden_id == user.id) | (Complaint.assigned_warden_id.is_(None)))
    return q


def _get_visible(complaint_id: int, db: Session, user: User) -> Complaint:
    c = _visible_query(db, user).filter(Complaint.id == complaint_id).first()
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")
    return c


@router.get("", response_model=list[ComplaintOut])
def list_complaints(
    status_: Status | None = Query(default=None, alias="status"),
    category: Category | None = None,
    priority: Priority | None = None,
    unassigned: bool = False,
    search: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = _visible_query(db, user)
    if status_ is not None:
        q = q.filter(Complaint.status == status_.value)
    if category is not None:
        q = q.filter(Complaint.category == category.value)
    if priority is not None:
        q = q.filter(Complaint.priority == priority.value)
    if unassigned:
        q = q.filter(Complaint.assigned_warden_id.is_(None))
    if search:
        like = f"%{search}%"
        q = q.filter((Complaint.title.ilike(like)) | (Complaint.description.ilike(like)))
    rows = q.order_by(Complaint.created_at.desc()).offset(offset).limit(limit).all()
    return [_serialize(c) for c in rows]


@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def create_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role not in {UserRole.student.value, UserRole.admin.value}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only students can raise complaints")
    c = Complaint(
        title=payload.title,
        description=payload.description,
        category=payload.category.value,
        priority=payload.priority.value,
        room_number=payload.room_number,
        hostel_block=payload.hostel_block,
        student_id=user.id if user.role == UserRole.student.value else user.id,
        sla_due=_sla_due(payload.priority.value),
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _serialize(c)


@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(complaint_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _serialize(_get_visible(complaint_id, db, user))


@router.patch("/{complaint_id}", response_model=ComplaintOut)
def update_complaint(
    complaint_id: int,
    payload: ComplaintUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    c = _get_visible(complaint_id, db, user)
    is_owner = c.student_id == user.id
    if not (user.role == UserRole.admin.value or (is_owner and c.status == Status.open.value)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the owner (while open) or admin can edit")
    for field in ("title", "description", "room_number", "hostel_block"):
        value = getattr(payload, field)
        if value is not None:
            setattr(c, field, value)
    if payload.category is not None:
        c.category = payload.category.value
    if payload.priority is not None:
        c.priority = payload.priority.value
        c.sla_due = _sla_due(payload.priority.value)
    db.commit()
    db.refresh(c)
    return _serialize(c)


@router.delete("/{complaint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_complaint(complaint_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = _get_visible(complaint_id, db, user)
    if not (user.role == UserRole.admin.value or (c.student_id == user.id and c.status == Status.open.value)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot delete this complaint")
    db.delete(c)
    db.commit()


@router.post("/{complaint_id}/assign", response_model=ComplaintOut)
def assign_complaint(
    complaint_id: int,
    payload: ComplaintAssign,
    db: Session = Depends(get_db),
    user: User = Depends(require_warden),
):
    c = _get_visible(complaint_id, db, user)
    warden = db.get(User, payload.warden_id)
    if warden is None or warden.role != UserRole.warden.value or not warden.is_active:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Target user is not an active warden")
    c.assigned_warden_id = warden.id
    db.commit()
    db.refresh(c)
    return _serialize(c)


@router.post("/{complaint_id}/status", response_model=ComplaintOut)
def change_status(
    complaint_id: int,
    payload: ComplaintStatusChange,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    c = _get_visible(complaint_id, db, user)
    target = payload.status
    if target not in ALLOWED_TRANSITIONS[Status(c.status)]:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Cannot move from {c.status} to {target.value}",
        )
    is_owner = c.student_id == user.id
    staff = user.role in {UserRole.warden.value, UserRole.admin.value}
    if target == Status.closed:
        if not (is_owner or staff):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the owner or staff can close")
    elif not staff:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only wardens or admins can advance status")

    now = datetime.now(timezone.utc)
    c.status = target.value
    if target == Status.acknowledged:
        c.acknowledged_at = now
        if c.assigned_warden_id is None and user.role == UserRole.warden.value:
            c.assigned_warden_id = user.id
    elif target == Status.resolved:
        c.resolved_at = now
    elif target == Status.closed:
        c.closed_at = now
    db.commit()
    db.refresh(c)
    return _serialize(c)


@router.get("/{complaint_id}/comments", response_model=list[CommentOut])
def list_comments(complaint_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = _get_visible(complaint_id, db, user)
    rows = (
        db.query(Comment)
        .options(joinedload(Comment.user))
        .filter(Comment.complaint_id == c.id)
        .order_by(Comment.created_at)
        .all()
    )
    return [
        CommentOut(
            id=r.id, complaint_id=r.complaint_id, user_id=r.user_id, body=r.body,
            created_at=r.created_at, user_name=r.user.full_name, user_role=r.user.role,
        )
        for r in rows
    ]


@router.post("/{complaint_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def add_comment(
    complaint_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    c = _get_visible(complaint_id, db, user)
    comment = Comment(complaint_id=c.id, user_id=user.id, body=payload.body.strip())
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return CommentOut(
        id=comment.id, complaint_id=comment.complaint_id, user_id=comment.user_id,
        body=comment.body, created_at=comment.created_at,
        user_name=user.full_name, user_role=user.role,
    )


@router.post("/{complaint_id}/rating", response_model=RatingOut)
def rate_complaint(
    complaint_id: int,
    payload: RatingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    c = _get_visible(complaint_id, db, user)
    if c.student_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the complaint owner can rate")
    if c.status != Status.resolved.value:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Can only rate a resolved complaint")
    existing = db.query(Rating).filter(Rating.complaint_id == c.id).first()
    if existing:
        existing.score = payload.score
        db.commit()
        db.refresh(existing)
        return existing
    rating = Rating(complaint_id=c.id, student_id=user.id, score=payload.score)
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating


ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PHOTO_BYTES = 5 * 1024 * 1024


@router.post("/{complaint_id}/photos", response_model=ComplaintOut)
def upload_photo(
    complaint_id: int,
    file: UploadFile,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    c = _get_visible(complaint_id, db, user)
    if not (c.student_id == user.id or user.role == UserRole.admin.value):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the owner or admin can add photos")
    if file.content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Only JPEG, PNG or WebP images allowed")
    data = file.file.read()
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Image must be under 5 MB")
    ext = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" }[file.content_type]
    name = f"{uuid.uuid4().hex}{ext}"
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(os.path.join(settings.UPLOAD_DIR, name), "wb") as fh:
        fh.write(data)
    photos = c.photos + [f"/uploads/{name}"]
    c.photos = photos
    db.commit()
    db.refresh(c)
    return _serialize(c)
