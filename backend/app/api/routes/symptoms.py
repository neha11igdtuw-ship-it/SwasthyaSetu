from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.symptom_summary import SymptomSummarizeRequest, SymptomSummarizeResponse
from app.services.symptom_summary import SymptomSummaryService

router = APIRouter(prefix="/symptoms", tags=["symptoms"])


@router.post("/summarize", response_model=SymptomSummarizeResponse)
async def summarize_symptoms(
    data: SymptomSummarizeRequest,
    user: User = Depends(get_current_user),
):
    """AI-assisted preliminary symptom summary (Gemini). Always acknowledges
    receipt of the transcript; `ai_summary` is null with `ai_summary_error`
    set if the AI sub-step fails for any reason."""
    return await SymptomSummaryService().summarize(data)
