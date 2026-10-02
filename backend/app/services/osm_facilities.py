import asyncio
import time

import httpx

from app.services.doctor_availability import get_facility_availability

OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
]

# Per-mirror timeout. Queried concurrently (not sequentially) so a dead/slow
# mirror can't block the others — worst case is one timeout, not N stacked.
MIRROR_TIMEOUT_S = 10

# In-memory cache so repeat lookups for roughly the same spot (a) don't
# hammer the free public Overpass mirrors, which rate-limit aggressively on
# shared cloud egress IPs, and (b) can fall back to a recent result instead
# of an error when every mirror is momentarily down/throttled.
_CACHE: dict[tuple[float, float, int], tuple[float, list[dict]]] = {}
_FRESH_TTL_S = 600  # serve instantly without hitting Overpass again
_STALE_TTL_S = 6 * 3600  # still usable as a fallback if every mirror fails


def _cache_key(lat: float, lng: float, radius_m: int) -> tuple[float, float, int]:
    # ~1.1km grid — plenty precise for "nearby hospitals" and keeps nearby
    # repeat requests (e.g. GPS jitter) hitting the same cache entry.
    return (round(lat, 2), round(lng, 2), radius_m)


async def search_osm_health_facilities(
    lat: float,
    lng: float,
    radius_m: int = 10000,
):
    key = _cache_key(lat, lng, radius_m)
    cached = _CACHE.get(key)
    now = time.monotonic()
    if cached and now - cached[0] < _FRESH_TTL_S:
        return cached[1]
    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:{radius_m},{lat},{lng});
      node["amenity"="clinic"](around:{radius_m},{lat},{lng});
      node["amenity"="doctors"](around:{radius_m},{lat},{lng});
      node["healthcare"="hospital"](around:{radius_m},{lat},{lng});
      node["healthcare"="clinic"](around:{radius_m},{lat},{lng});
      way["amenity"="hospital"](around:{radius_m},{lat},{lng});
      way["amenity"="clinic"](around:{radius_m},{lat},{lng});
      relation["amenity"="hospital"](around:{radius_m},{lat},{lng});
      relation["amenity"="clinic"](around:{radius_m},{lat},{lng});
    );
    out center tags;
    """

    # Overpass's usage policy requires an identifying User-Agent — without
    # one, overpass-api.de rejects every request with a 406 outright.
    headers = {"User-Agent": "SwasthyaSetu/1.0 (contact: support@swasthyasetu.app)"}

    async def _query(client: httpx.AsyncClient, url: str) -> dict:
        response = await client.post(url, data={"data": query}, timeout=MIRROR_TIMEOUT_S)
        response.raise_for_status()
        return response.json()

    data = None
    last_error: Exception | None = None

    async with httpx.AsyncClient(headers=headers) as client:
        tasks = [asyncio.create_task(_query(client, url)) for url in OVERPASS_URLS]
        for task in asyncio.as_completed(tasks):
            try:
                data = await task
                break
            except Exception as e:
                last_error = e
        for task in tasks:
            task.cancel()

    if data is None:
        if cached and now - cached[0] < _STALE_TTL_S:
            return cached[1]
        raise RuntimeError(f"All Overpass endpoints failed: {last_error}")

    facilities = []

    for item in data.get("elements", []):
        tags = item.get("tags", {})

        facility_lat = item.get("lat") or item.get("center", {}).get("lat")
        facility_lng = item.get("lon") or item.get("center", {}).get("lon")

        if facility_lat is None or facility_lng is None:
            continue

        name = tags.get("name")
        if not name:
            continue

        facility_type = tags.get("amenity") or tags.get("healthcare") or "healthcare"
        availability = get_facility_availability(name, facility_type)

        facilities.append(
            {
                "name": name,
                "facility_type": facility_type,
                "latitude": facility_lat,
                "longitude": facility_lng,
                "phone": tags.get("phone") or tags.get("contact:phone"),
                "address": ", ".join(
                    filter(
                        None,
                        [
                            tags.get("addr:housename"),
                            tags.get("addr:street"),
                            tags.get("addr:city"),
                            tags.get("addr:postcode"),
                        ],
                    )
                )
                or None,
                "capabilities": "Public map listing",
                "data_source": "OpenStreetMap",
                "verification_status": "Unverified public listing",
                "doctor_status": availability["doctor_status"],
                "doctors": availability["doctors"],
                "services_available": availability["services_available"],
                "checked_at": availability["checked_at"],
            }
        )

    _CACHE[key] = (now, facilities)
    return facilities
