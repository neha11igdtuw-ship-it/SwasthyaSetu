import httpx

OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
]


async def search_osm_health_facilities(
    lat: float,
    lng: float,
    radius_m: int = 10000,
):
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

    last_error = None
    data = None

    async with httpx.AsyncClient(timeout=30) as client:
        for url in OVERPASS_URLS:
            try:
                response = await client.post(url, data={"data": query})
                response.raise_for_status()
                data = response.json()
                break
            except Exception as e:
                last_error = e

    if data is None:
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

        facilities.append({
            "name": name,
            "facility_type": tags.get("amenity") or tags.get("healthcare") or "healthcare",
            "latitude": facility_lat,
            "longitude": facility_lng,
            "phone": tags.get("phone") or tags.get("contact:phone"),
            "address": ", ".join(
                filter(None, [
                    tags.get("addr:housename"),
                    tags.get("addr:street"),
                    tags.get("addr:city"),
                    tags.get("addr:postcode"),
                ])
            ) or None,
            "capabilities": "Public map listing",
            "data_source": "OpenStreetMap",
            "verification_status": "Unverified public listing",
        })

    return facilities