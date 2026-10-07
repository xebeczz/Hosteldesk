"""Dashboard statistics — scoped by role."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.enums import Category, Priority, Status, UserRole
from app.models.feedback import Rating
from app.models.user import User
from app.schemas.misc import DashboardStats

router = APIRouter()


def _breach_filter(now):
    return (Complaint.sla_due < now) & (~Complaint.status.in_([Status.resolved.value, Status.closed.value]))


@router.get("/stats", response_model=DashboardStats)
def stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Complaint)
    if user.role == UserRole.student.value:
        q = q.filter(Complaint.student_id == user.id)
    elif user.role == UserRole.warden.value:
        q = q.filter((Complaint.assigned_warden_id == user.id) | (Complaint.assigned_warden_id.is_(None)))

    total = q.count()
    by_status = {s.value: 0 for s in Status}
    for value, count in q.with_entities(Complaint.status, func.count()).group_by(Complaint.status).all():
        by_status[value] = count
    by_category = {c.value: 0 for c in Category}
    for value, count in q.with_entities(Complaint.category, func.count()).group_by(Complaint.category).all():
        by_category[value] = count
    by_priority = {p.value: 0 for p in Priority}
    for value, count in q.with_entities(Complaint.priority, func.count()).group_by(Complaint.priority).all():
        by_priority[value] = count

    now = datetime.now(timezone.utc)
    sla_breaches = q.filter(_breach_filter(now)).count()
    unassigned = q.filter(Complaint.assigned_warden_id.is_(None), Complaint.status == Status.open.value).count()

    avg_resolution_hours = None
    resolved = q.filter(Complaint.resolved_at.is_not(None)).all()
    if resolved:
        deltas = [(c.resolved_at - c.created_at).total_seconds() / 3600 for c in resolved]
        avg_resolution_hours = round(sum(deltas) / len(deltas), 1)

    avg_rating = None
    if user.role != UserRole.student.value:
        avg = db.query(func.avg(Rating.score)).scalar()
        avg_rating = round(float(avg), 2) if avg is not None else None
    else:
        avg = (
            db.query(func.avg(Rating.score))
            .join(Complaint, Rating.complaint_id == Complaint.id)
            .filter(Complaint.student_id == user.id)
            .scalar()
        )
        avg_rating = round(float(avg), 2) if avg is not None else None

    return DashboardStats(
        total=total,
        by_status=by_status,
        by_category=by_category,
        by_priority=by_priority,
        sla_breaches=sla_breaches,
        avg_resolution_hours=avg_resolution_hours,
        avg_rating=avg_rating,
        unassigned=unassigned,
    )
