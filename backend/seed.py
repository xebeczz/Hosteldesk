"""Seed the database: admin + warden + student users and sample complaints.

Usage:  python seed.py            (fresh demo data; skips if users exist)
        python seed.py --reset     (wipe tables first, then seed)
"""
import sys
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models.complaint import Complaint
from app.models.enums import Category, Priority, Status, UserRole
from app.models.feedback import Comment, Rating
from app.models.user import User


def get_or_create_user(db, email, password, full_name, role, block=None, room=None):
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user, False
    user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
        role=role,
        hostel_block=block,
        room_number=room,
    )
    db.add(user)
    db.flush()
    return user, True


SAMPLE_COMPLAINTS = [
    # (title, description, category, priority, status, block, room, days_ago, warden_assigned)
    ("Leaking tap in bathroom", "The bathroom tap in 204 has been dripping non-stop for two days, wasting water.", "plumbing", "high", "in_progress", "A", "204", 3, True),
    ("No hot water in Block B", "Geyser not working on the 2nd floor of Block B since yesterday morning.", "plumbing", "medium", "acknowledged", "B", "215", 2, True),
    ("Tube light flickering", "The tube light in room 112 flickers constantly and makes a buzzing noise.", "electrical", "medium", "open", "A", "112", 1, False),
    ("Power socket sparking", "Socket near the study table sparks when plugging in a charger. Feels unsafe.", "electrical", "urgent", "in_progress", "C", "308", 0, True),
    ("WiFi down in Block C", "No internet in Block C 3rd floor since evening. Router lights are off.", "wifi", "high", "open", "C", "312", 0, False),
    ("Slow WiFi during classes", "WiFi speed drops to unusable levels every evening between 7-10 PM.", "wifi", "low", "resolved", "A", "107", 9, True),
    ("Stale food at dinner", "Rice served at dinner on Friday smelled stale. Several students skipped the meal.", "mess", "high", "acknowledged", "B", "201", 4, True),
    ("Water cooler not working", "The water cooler on Block A ground floor dispenses warm water only.", "electrical", "medium", "closed", "A", "101", 12, True),
    ("Washroom not cleaned", "Common washroom on 1st floor Block B hasn't been cleaned in three days.", "housekeeping", "medium", "open", "B", "118", 1, False),
    ("Broken main gate lock", "The side gate lock is broken and the gate stays open all night.", "security", "urgent", "in_progress", "C", "301", 2, True),
    ("Mosquitoes in corridor", "Heavy mosquito problem in Block A corridors after 8 PM.", "housekeeping", "low", "resolved", "A", "122", 8, True),
    ("Washing machine queue", "Only one washing machine works in Block B laundry; long queues on weekends.", "other", "low", "open", "B", "225", 1, False),
]


def main() -> None:
    reset = "--reset" in sys.argv
    if reset:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    db = SessionLocal()
    try:
        admin, _ = get_or_create_user(db, settings.SEED_ADMIN_EMAIL, settings.SEED_ADMIN_PASSWORD, "Hostel Admin", UserRole.admin.value)
        warden, _ = get_or_create_user(db, settings.SEED_WARDEN_EMAIL, settings.SEED_WARDEN_PASSWORD, "Ravi Warden", UserRole.warden.value, "A", "001")
        student, created = get_or_create_user(db, settings.SEED_STUDENT_EMAIL, settings.SEED_STUDENT_PASSWORD, "Demo Student", UserRole.student.value, "A", "204")
        warden2, _ = get_or_create_user(db, "warden2@hosteldesk.io", "Warden@12345", "Meena Warden", UserRole.warden.value, "B", "002")
        student2, _ = get_or_create_user(db, "student2@hosteldesk.io", "Student@12345", "Arun Kumar", UserRole.student.value, "B", "201")
        db.commit()

        if not created and not reset:
            print("Users already exist — skipping sample complaints. Use --reset for a fresh seed.")
            return

        from app.api.v1.endpoints.complaints import _sla_due  # noqa: E402

        now = datetime.now(timezone.utc)
        for i, (title, desc, cat, pri, st, block, room, days_ago, assign) in enumerate(SAMPLE_COMPLAINTS):
            owner = student if i % 2 == 0 else student2
            created_at = now - timedelta(days=days_ago, hours=i)
            c = Complaint(
                title=title,
                description=desc,
                category=cat,
                priority=pri,
                status=st,
                room_number=room,
                hostel_block=block,
                student_id=owner.id,
                assigned_warden_id=(warden.id if assign and i % 3 else warden2.id if assign else None),
                sla_due=_sla_due(pri),
                created_at=created_at,
                updated_at=created_at,
            )
            if st in ("acknowledged", "in_progress", "resolved", "closed"):
                c.acknowledged_at = created_at + timedelta(hours=2)
            if st in ("resolved", "closed"):
                c.resolved_at = created_at + timedelta(hours=30)
            if st == "closed":
                c.closed_at = created_at + timedelta(hours=50)
            db.add(c)
            db.flush()

            db.add(Comment(complaint_id=c.id, user_id=owner.id, body="Please look into this at the earliest."))
            if c.assigned_warden_id:
                db.add(Comment(complaint_id=c.id, user_id=c.assigned_warden_id, body="Noted. Our maintenance team will attend to this shortly."))
            if st in ("resolved", "closed"):
                db.add(Rating(complaint_id=c.id, student_id=owner.id, score=4 if i % 2 == 0 else 5))
        db.commit()
        print("Seeded users + 12 sample complaints.")
        print(f"  admin:   {settings.SEED_ADMIN_EMAIL} / {settings.SEED_ADMIN_PASSWORD}")
        print(f"  warden:  {settings.SEED_WARDEN_EMAIL} / {settings.SEED_WARDEN_PASSWORD}")
        print(f"  student: {settings.SEED_STUDENT_EMAIL} / {settings.SEED_STUDENT_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
