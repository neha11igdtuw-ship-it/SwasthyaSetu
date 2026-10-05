"""Small in-process sliding-window rate limiter.

No Redis/slowapi in this project (single-uvicorn-process deployment), so a
hand-rolled in-memory limiter is used instead of adding a dependency.

Known limitation (documented, not a bug to fix here): counters are
per-process and reset on restart. Horizontal scaling to multiple workers
needs a shared store (e.g. Redis) instead.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import Request

from app.core.config import get_settings
from app.core.errors import RateLimitError


class RateLimiter:
    def __init__(self, limit: int, window_seconds: int, name: str):
        self.limit = limit
        self.window_seconds = window_seconds
        self.name = name
        self._buckets: dict[str, deque[float]] = defaultdict(deque)
        self._checks_since_sweep = 0

    def check(self, key: str) -> None:
        if not get_settings().rate_limit_enabled:
            return
        now = time.monotonic()
        bucket = self._buckets[key]
        while bucket and now - bucket[0] > self.window_seconds:
            bucket.popleft()
        if len(bucket) >= self.limit:
            retry_after = max(1, int(self.window_seconds - (now - bucket[0])))
            raise RateLimitError(
                "Too many attempts. Please try again later.",
                details={"retry_after_seconds": retry_after},
            )
        bucket.append(now)
        self._checks_since_sweep += 1
        if self._checks_since_sweep >= 500:
            self._sweep(now)

    def _sweep(self, now: float) -> None:
        self._checks_since_sweep = 0
        stale = [
            key
            for key, bucket in self._buckets.items()
            if not bucket or now - bucket[-1] > self.window_seconds
        ]
        for key in stale:
            del self._buckets[key]

    def reset(self) -> None:
        self._buckets.clear()
        self._checks_since_sweep = 0


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(limiter: RateLimiter, *, by_email: bool = False, by_field: str | None = None):
    """Rate limit by client IP, optionally combined with a normalized body field."""

    async def _checker(request: Request) -> None:
        key = client_ip(request)
        field_name = by_field or ("email" if by_email else None)
        if field_name:
            try:
                body = await request.json()
                field_value = str(body.get(field_name, "")).strip().lower()
                if by_field == "phone" and field_value:
                    from app.core.validators import normalize_indian_phone

                    field_value = normalize_indian_phone(field_value)
            except Exception:
                field_value = ""
            if by_field and field_value:
                limiter.check(f"{field_name}:{field_value}")
            key = f"{key}:{field_value}"
        limiter.check(key)

    return _checker
