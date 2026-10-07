"""Complaint model: a student's issue, tracked through a fixed workflow."""
import json
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import Category, Priority, Status


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(30), default=Category.other.value, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default=Priority.medium.value, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=Status.open.value, nullable=False)
    room_number: Mapped[str] = mapped_column(String(20), nullable=False)
    hostel_block: Mapped[str] = mapped_column(String(50), nullable=False)
    photo_urls: Mapped[str] = mapped_column(Text, default="[]", nullable=False)

    student_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assigned_warden_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    sla_due: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    student: Mapped["User"] = relationship("User", back_populates="complaints", foreign_keys=[student_id])
    warden: Mapped["User | None"] = relationship("User", back_populates="assigned", foreign_keys=[assigned_warden_id])
    comments: Mapped[list["Comment"]] = relationship(
        "Comment", back_populates="complaint", cascade="all, delete-orphan", order_by="Comment.created_at"
    )
    rating: Mapped["Rating | None"] = relationship("Rating", back_populates="complaint", uselist=False, cascade="all, delete-orphan")

    @property
    def photos(self) -> list[str]:
        try:
            return json.loads(self.photo_urls or "[]")
        except (json.JSONDecodeError, TypeError):
            return []

    @photos.setter
    def photos(self, value: list[str]) -> None:
        self.photo_urls = json.dumps(value)
