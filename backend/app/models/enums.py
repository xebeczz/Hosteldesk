"""Shared enums for the domain."""
import enum


class UserRole(str, enum.Enum):
    student = "student"
    warden = "warden"
    admin = "admin"


class Category(str, enum.Enum):
    plumbing = "plumbing"
    electrical = "electrical"
    wifi = "wifi"
    mess = "mess"
    housekeeping = "housekeeping"
    security = "security"
    other = "other"


class Priority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class Status(str, enum.Enum):
    open = "open"
    acknowledged = "acknowledged"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


# Hours of SLA per priority: urgent 4h, high 24h, medium 72h, low 7 days.
SLA_HOURS = {
    Priority.urgent: 4,
    Priority.high: 24,
    Priority.medium: 72,
    Priority.low: 168,
}

# Forward-only workflow (resolved -> closed is the terminal student step).
ALLOWED_TRANSITIONS: dict[Status, set[Status]] = {
    Status.open: {Status.acknowledged},
    Status.acknowledged: {Status.in_progress},
    Status.in_progress: {Status.resolved},
    Status.resolved: {Status.closed},
    Status.closed: set(),
}
