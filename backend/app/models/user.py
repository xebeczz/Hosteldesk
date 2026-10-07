"""User model: students raise complaints, wardens handle them, admins manage."""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default=UserRole.student.value, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    hostel_block: Mapped[str | None] = mapped_column(String(50), nullable=True)
    room_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    complaints: Mapped[list["Complaint"]] = relationship(
        "Complaint", back_populates="student", foreign_keys="Complaint.student_id", cascade="all, delete-orphan"
    )
    assigned: Mapped[list["Complaint"]] = relationship(
        "Complaint", back_populates="warden", foreign_keys="Complaint.assigned_warden_id"
    )
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
