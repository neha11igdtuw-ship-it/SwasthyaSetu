from pydantic import BaseModel, Field


class SymptomSummarizeRequest(BaseModel):
    transcript: str = Field(min_length=1)
    selected_symptoms: list[str] = Field(default_factory=list)
    manual_symptoms: list[str] = Field(default_factory=list)
    language: str = "en"
    duration: str | None = None
    severity: str | None = None


class AISymptomSummary(BaseModel):
    """The structured summary Gemini is asked to return. Every field has a
    safe default so a partially-valid model response still round-trips."""

    reportedSymptoms: list[str] = Field(default_factory=list)
    duration: str = "Not specified"
    severity: str = "Not specified"
    additionalContext: str = ""
    possibleWarningSigns: list[str] = Field(default_factory=list)
    summary: str = ""
    language: str = "en"


class SymptomSummarizeResponse(BaseModel):
    """Response shape for POST /symptoms/summarize.

    `accepted` is always true once the transcript is received/validated —
    the original transcript is never dropped even if the AI summary
    sub-step fails. `ai_summary` is null and `ai_summary_error` is set with
    a human-readable reason when Gemini could not produce a usable summary
    (timeout, rate limit, invalid JSON, empty response, missing API key).
    """

    accepted: bool = True
    transcript: str
    ai_summary: AISymptomSummary | None = None
    ai_summary_error: str | None = None
