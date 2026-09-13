/**
 * Fetches nearby healthcare facilities from OpenStreetMap's free Overpass API.
 */
import { calculateHaversineDistance } from "@/lib/geo";
import { NearbyFacility } from "@/lib/mockData";

const OVERPASS_ENDPOINTS = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

const FETCH_TIMEOUT_MS = 8000;

// Cache keyed by "lat,lon" rounded to 2 decimals so repeated calls for the same area don't refetch.
const cache = new Map<string, NearbyFacility[]>();

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

function buildQuery(lat: number, lon: number, radiusMeters: number): string {
  const around = `around:${radiusMeters},${lat},${lon}`;
  return `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](${around});
      way["amenity"="hospital"](${around});
      node["amenity"="clinic"](${around});
      way["amenity"="clinic"](${around});
      node["healthcare"](${around});
      way["healthcare"](${around});
    );
    out center tags;
  `;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromOverpass(query: string): Promise<{ elements: OverpassElement[] }> {
  let lastError: unknown = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: query,
        },
        FETCH_TIMEOUT_MS
      );

      if (!res.ok) {
        lastError = new Error(`${endpoint} returned status ${res.status}`);
        continue;
      }

      return await res.json();
    } catch (err) {
      lastError = err;
      console.warn(`Overpass endpoint failed: ${endpoint}`, err);
      continue;
    }
  }

  throw lastError ?? new Error("All Overpass endpoints failed");
}

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function elementToFacility(el: OverpassElement): NearbyFacility | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;

  const tags = el.tags ?? {};
  return {
    id: `osm-${el.id}`,
    name: tags.name || "Unnamed Facility",
    type: "Primary Health Centre",
    distance: "",
    latitude: lat,
    longitude: lon,
    availableServices: [],
    doctorAvailability: "",
    status: "Available",
    lastUpdated: "",
    contactPhone: tags.phone || "",
    address: tags["addr:full"] || tags["addr:street"] || "",
  };
}

/**
 * Queries the Overpass API for nearby hospitals/clinics, sorted by distance, top 10.
 */
export async function getNearbyHospitals(
  lat: number,
  lon: number,
  radiusMeters = 15000
): Promise<NearbyFacility[]> {
  const key = cacheKey(lat, lon);
  const cached = cache.get(key);
  if (cached) return cached;

  const data = await fetchFromOverpass(buildQuery(lat, lon, radiusMeters));
  const elements: OverpassElement[] = data.elements || [];

  const facilities = elements
    .map(elementToFacility)
    .filter((f): f is NearbyFacility => f !== null)
    .map((f) => ({
      ...f,
      distance: `${calculateHaversineDistance(lat, lon, f.latitude!, f.longitude!)} km`,
    }))
    .sort(
      (a, b) =>
        calculateHaversineDistance(lat, lon, a.latitude!, a.longitude!) -
        calculateHaversineDistance(lat, lon, b.latitude!, b.longitude!)
    )
    .slice(0, 10);

  cache.set(key, facilities);
  return facilities;
}
