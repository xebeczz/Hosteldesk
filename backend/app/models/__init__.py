"""Register all models so SQLAlchemy metadata is complete (Alembic, etc.)."""
from app.models.complaint import Complaint  # noqa: F401
from app.models.enums import (  # noqa: F401
    ALLOWED_TRANSITIONS,
    SLA_HOURS,
    Category,
    Priority,
    Status,
    UserRole,
)
from app.models.feedback import Comment, Rating  # noqa: F401
from app.models.user import User  # noqa: F401
