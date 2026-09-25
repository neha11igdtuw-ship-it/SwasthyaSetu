"""Consistent JSON error envelope for the whole API.

Every error response has the shape:
{
  "error": {
    "code": "SOME_MACHINE_CODE",
    "message": "human readable message",
    "details": { ... optional ... }
  }
}
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    """Base class for domain errors that should map to a specific HTTP status."""

    status_code: int = 400
    code: str = "APP_ERROR"

    def __init__(self, message: str, *, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.message = message
        self.details = details


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class ConflictError(AppError):
    """Used for optimistic-concurrency / sync conflicts. Carries current server state."""

    status_code = 409
    code = "CONFLICT"


class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"


class UnauthorizedError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"


class ValidationAppError(AppError):
    status_code = 422
    code = "VALIDATION_ERROR"


class EmailNotVerifiedError(AppError):
    status_code = 403
    code = "EMAIL_NOT_VERIFIED"


class RateLimitError(AppError):
    status_code = 429
    code = "RATE_LIMITED"


def _envelope(code: str, message: str, details: Any = None) -> dict:
    return {"error": {"code": code, "message": message, "details": jsonable_encoder(details)}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        headers = None
        if exc.details and "retry_after_seconds" in exc.details:
            headers = {"Retry-After": str(exc.details["retry_after_seconds"])}
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(exc.code, exc.message, exc.details),
            headers=headers,
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope("HTTP_ERROR", str(exc.detail)),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content=_envelope("VALIDATION_ERROR", "Request validation failed", exc.errors()),
        )
