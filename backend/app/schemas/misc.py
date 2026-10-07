"""Comment / rating / AI / dashboard schemas."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    complaint_id: int
    user_id: int
    body: str
    created_at: datetime
    user_name: str | None = None
    user_role: str | None = None


class RatingCreate(BaseModel):
    score: int = Field(ge=1, le=5)


class RatingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    complaint_id: int
    student_id: int
    score: int
    created_at: datetime


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    # Kept for API compatibility; the service intentionally ignores history and
    # sends only the latest message to the model to minimize token usage.
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)
    # Optional: minimal context about one complaint (title/category/priority/status).
    complaint_id: int | None = None


class ChatResponse(BaseModel):
    reply: str
    mode: str  # "online" | "offline"
    suggested_draft: dict | None = None


class DashboardStats(BaseModel):
    total: int
    by_status: dict[str, int]
    by_category: dict[str, int]
    by_priority: dict[str, int]
    sla_breaches: int
    avg_resolution_hours: float | None
    avg_rating: float | None
    unassigned: int
