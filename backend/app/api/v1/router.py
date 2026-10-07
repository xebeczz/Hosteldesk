"""v1 API router — mounts all endpoint modules."""
from fastapi import APIRouter

from app.api.v1.endpoints import ai, auth, complaints, dashboard, users

router = APIRouter()
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(complaints.router, prefix="/complaints", tags=["complaints"])
router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(ai.router, prefix="/ai", tags=["ai"])
