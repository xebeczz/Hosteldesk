"""AI chat endpoint — token-minimal: latest message + one-line complaint context."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.endpoints.complaints import _visible_query
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.user import User
from app.schemas.misc import ChatRequest, ChatResponse
from app.services import ai_service

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    context = None
    if payload.complaint_id is not None:
        c = _visible_query(db, user).filter(Complaint.id == payload.complaint_id).first()
        if c is not None:
            context = f"#{c.id} '{c.title}' [{c.category}, {c.priority} priority, {c.status}]"
    return await ai_service.chat(payload, context)
