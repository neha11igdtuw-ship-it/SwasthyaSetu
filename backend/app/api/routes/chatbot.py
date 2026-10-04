from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.ratelimit import RateLimiter
from app.models.user import User
from app.schemas.chatbot import ChatRequest, ChatResponse
from app.services.chatbot_service import ChatbotService

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

# Per authenticated user (not per IP), so one user can't exhaust the AI quota.
_chat_limiter = RateLimiter(limit=20, window_seconds=60, name="chatbot")


@router.post("/chat", response_model=ChatResponse)
async def chat(data: ChatRequest, user: User = Depends(get_current_user)):
    """General health-education chat (Gemini, server-side). Receives only the
    user's chat messages; it never reads patient records."""
    _chat_limiter.check(str(user.id))
    return await ChatbotService().chat(data)
