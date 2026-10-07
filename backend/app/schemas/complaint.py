"""Complaint schemas."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Category, Priority, Status


class ComplaintCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10)
    category: Category = Category.other
    priority: Priority = Priority.medium
    room_number: str = Field(min_length=1, max_length=20)
    hostel_block: str = Field(min_length=1, max_length=50)


class ComplaintUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, min_length=10)
    category: Category | None = None
    priority: Priority | None = None
    room_number: str | None = Field(default=None, min_length=1, max_length=20)
    hostel_block: str | None = Field(default=None, min_length=1, max_length=50)


class ComplaintStatusChange(BaseModel):
    status: Status


class ComplaintAssign(BaseModel):
    warden_id: int


class ComplaintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    category: str
    priority: str
    status: str
    room_number: str
    hostel_block: str
    photo_urls: list[str] = Field(default_factory=list)
    student_id: int
    assigned_warden_id: int | None
    sla_due: datetime | None
    created_at: datetime
    updated_at: datetime
    acknowledged_at: datetime | None
    resolved_at: datetime | None
    closed_at: datetime | None
    student_name: str | None = None
    warden_name: str | None = None
    rating_score: int | None = None
    sla_breached: bool = False
