from pydantic import BaseModel, Field


class CarePathwayClassifyRequest(BaseModel):
    """Free-text (or voice-transcribed) description of why the patient is
    seeking care. Never treated as a diagnosis input — only classified into
    a care pathway bucket for the patient to confirm or change."""

    description: str = Field(min_length=1, max_length=2000)
    language: str = "en"


class CarePathwayClassification(BaseModel):
    care_pathway: str
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str
    requires_confirmation: bool = True
