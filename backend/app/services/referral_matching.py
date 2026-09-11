"""Smart referral matching: ranks candidate facilities for a referral by
specialty/capability match and proximity to the referring facility.

Scoring (higher is better, 0-100):
  - 60 pts if the facility lists the needed specialty/capability
  - up to 40 pts for proximity, linearly decayed to 0 at MAX_DISTANCE_KM
This is intentionally simple/explainable rather than ML-based, matching the
"why was this suggested" transparency insurance/health workflows need.
"""

import math
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.facility import Facility
from app.repositories.facilities import FacilityRepository
from app.schemas.referral import MatchCandidate

MAX_DISTANCE_KM = 150.0
CAPABILITY_MATCH_POINTS = 60.0
MAX_PROXIMITY_POINTS = 40.0


def _haversine_km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


class ReferralMatchingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.facilities = FacilityRepository(db)

    async def find_candidates(
        self,
        from_facility_id: uuid.UUID | None,
        specialty_needed: str | None,
        limit: int = 5,
    ) -> list[MatchCandidate]:
        all_facilities = await self.facilities.list_all()
        origin: Facility | None = None
        if from_facility_id:
            origin = next((f for f in all_facilities if f.id == from_facility_id), None)

        candidates: list[MatchCandidate] = []
        for facility in all_facilities:
            if from_facility_id and facility.id == from_facility_id:
                continue

            reasons: list[str] = []
            score = 0.0

            capabilities = {
                c.strip().lower() for c in (facility.capabilities or "").split(",") if c.strip()
            }
            capability_matched = bool(
                specialty_needed and specialty_needed.strip().lower() in capabilities
            )
            if capability_matched:
                score += CAPABILITY_MATCH_POINTS
                reasons.append(f"Offers required specialty: {specialty_needed}")
            elif not specialty_needed:
                reasons.append("No specific specialty required")
            else:
                # Specialty was required and this facility doesn't offer it -
                # skip it entirely rather than surfacing an unusable referral target.
                continue

            distance_km: float | None = None
            if (
                origin
                and origin.latitude is not None
                and origin.longitude is not None
                and facility.latitude is not None
                and facility.longitude is not None
            ):
                distance_km = _haversine_km(
                    origin.latitude, origin.longitude, facility.latitude, facility.longitude
                )
                proximity_score = max(
                    0.0, MAX_PROXIMITY_POINTS * (1 - distance_km / MAX_DISTANCE_KM)
                )
                score += proximity_score
                reasons.append(f"{distance_km:.1f} km from referring facility")

            if score > 0 or not specialty_needed:
                candidates.append(
                    MatchCandidate(
                        facility_id=facility.id,
                        facility_name=facility.name,
                        score=round(score, 1),
                        distance_km=round(distance_km, 1) if distance_km is not None else None,
                        reasons=reasons,
                    )
                )

        candidates.sort(key=lambda c: c.score, reverse=True)
        return candidates[:limit]
