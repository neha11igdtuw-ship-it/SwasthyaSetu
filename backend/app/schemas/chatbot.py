import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

_CONVERSATION_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

MAX_MESSAGE_CHARS = 6000  # pasted report text can be long


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class ChatRequest(BaseModel):
    """A chat message plus the recent turns of the CURRENT conversation.

    The server is stateless: the client sends the conversation so far, so the
    assistant can resolve follow-ups ("what foods help prevent it?"). Nothing
    else — no patient record data — is ever part of this request.
    """

    message: str = Field(max_length=MAX_MESSAGE_CHARS)
    conversation_id: str | None = None
    history: list[ChatTurn] = Field(default_factory=list, max_length=40)
    # The app's selected UI language code (e.g. "en", "hi", "local"). The
    # assistant answers in this language unless the message asks otherwise.
    ui_language: str | None = Field(default=None, max_length=8)

    @field_validator("message")
    @classmethod
    def _message_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be empty")
        return value

    @field_validator("conversation_id")
    @classmethod
    def _valid_conversation_id(cls, value: str | None) -> str | None:
        if value is None:
            return None  # the service generates one
        if not _CONVERSATION_ID_RE.match(value):
            raise ValueError("Invalid conversation_id")
        return value


class ChatRedirect(BaseModel):
    """Pointer to an existing SwasthyaSetu section (not a second workflow)."""

    label: str
    path: str


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    redirect: ChatRedirect | None = None
