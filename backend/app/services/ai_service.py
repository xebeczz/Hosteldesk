"""AI assistant: NVIDIA-hosted chat when a key is configured, offline fallback otherwise.

The NVIDIA_API_KEY lives only in the backend environment — it is never sent
to the frontend. When empty, chat() returns keyword-based troubleshooting
guidance plus an offer to draft the complaint.
"""
import httpx

from app.core.config import settings
from app.schemas.misc import ChatRequest, ChatResponse

NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

# Short system prompt (~40 words) — prompt tokens are billed on every call.
SYSTEM_PROMPT = (
    "You are HostelDesk's assistant for a college hostel. "
    "Troubleshoot hostel issues (plumbing, electrical, WiFi, mess, "
    "housekeeping, security) in 2-4 short, practical steps. "
    "If the issue needs staff, say so briefly and offer to draft a complaint."
)

# Keywords -> (category, troubleshooting tips) for the offline fallback.
OFFLINE_GUIDE: list[tuple[tuple[str, ...], str, list[str]]] = [
    (("plumbing", "leak", "tap", "pipe", "drain", "toilet", "bathroom"), "plumbing", [
        "Turn off the nearest stop-cock/valve to stop the flow.",
        "Place a bucket or towel to contain the leak and note the exact spot.",
        "File a complaint under Plumbing with priority high if water is flowing.",
    ]),
    (("electrical", "power", "socket", "wire", "spark", "light", "fan", "switch"), "electrical", [
        "Do not touch exposed wires or sparking sockets — keep distance.",
        "Switch off the room's MCB/breaker if it is safe to reach.",
        "File a complaint under Electrical with priority urgent for sparks or outage.",
    ]),
    (("wifi", "internet", "network"), "wifi", [
        "Forget the hostel WiFi network on your device and reconnect.",
        "Restart your device's WiFi, then try a different room/corridor.",
        "File a complaint under WiFi/Internet noting your block, room and device.",
    ]),
    (("mess", "food", "meal", "canteen"), "mess", [
        "Note the meal, date and counter where the issue occurred.",
        "If it is a health concern, inform the mess supervisor immediately.",
        "File a complaint under Mess/Food with the details.",
    ]),
    (("clean", "housekeeping", "garbage", "mosquito"), "housekeeping", [
        "Note the exact location (block, floor, room/corridor).",
        "File a complaint under Housekeeping describing what needs attention.",
    ]),
    (("security", "theft", "gate", "guard"), "security", [
        "If anyone is in immediate danger, contact hostel security right away.",
        "Note the time, place and description of what happened.",
        "File a complaint under Security with priority high.",
    ]),
]

CATEGORY_LABELS = {
    "plumbing": "Plumbing",
    "electrical": "Electrical",
    "wifi": "WiFi/Internet",
    "mess": "Mess/Food",
    "housekeeping": "Housekeeping",
    "security": "Security",
    "other": "Other",
}


def offline_reply(message: str) -> ChatResponse:
    lowered = message.lower()
    for keywords, category, tips in OFFLINE_GUIDE:
        if any(k in lowered for k in keywords):
            label = CATEGORY_LABELS[category]
            reply = (
                f"This sounds like a **{label}** issue. Quick things to try:\n"
                + "\n".join(f"{i + 1}. {tip}" for i, tip in enumerate(tips))
                + "\n\nWant me to draft the complaint for you? Just say 'draft it' "
                f"and I'll prepare a {label} complaint you can submit in one tap."
            )
            return ChatResponse(
                reply=reply,
                mode="offline",
                suggested_draft={
                    "category": category,
                    "priority": "high" if category in {"electrical", "security"} else "medium",
                    "title": f"{label} issue",
                    "description": message.strip(),
                },
            )
    return ChatResponse(
        reply=(
            "I can help troubleshoot hostel issues — plumbing, electrical, WiFi, "
            "mess/food, housekeeping or security. Tell me what's wrong (and your "
            "block/room if you like), and I'll suggest fixes or draft a complaint."
        ),
        mode="offline",
    )


async def online_reply(req: ChatRequest, complaint_context: str | None) -> ChatResponse | None:
    """Call the NVIDIA OpenAI-compatible API. Returns None on any failure.

    Token-minimal by design: short system prompt, optional one-line complaint
    context, and ONLY the latest user message — no conversation history.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if complaint_context:
        messages.append({"role": "user", "content": f"My complaint for context: {complaint_context}"})
    messages.append({"role": "user", "content": req.message})
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                NVIDIA_URL,
                headers={"Authorization": f"Bearer {settings.NVIDIA_API_KEY}"},
                json={
                    "model": settings.NVIDIA_MODEL,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_tokens": 300,
                },
            )
            resp.raise_for_status()
            data = resp.json()
        text = data["choices"][0]["message"]["content"].strip()
        return ChatResponse(reply=text, mode="online")
    except Exception:
        return None


async def chat(req: ChatRequest, complaint_context: str | None = None) -> ChatResponse:
    if settings.NVIDIA_API_KEY:
        result = await online_reply(req, complaint_context)
        if result is not None:
            return result
        # Key present but the call failed — fall back gracefully.
        fallback = offline_reply(req.message)
        fallback.reply = "(AI service unreachable — offline guidance)\n\n" + fallback.reply
        return fallback
    return offline_reply(req.message)
