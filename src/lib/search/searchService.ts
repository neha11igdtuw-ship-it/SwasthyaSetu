import type { Role } from "@/lib/api/types";
import { SEARCHABLE_ROUTES } from "./searchableRoutes";
import type {
  HeaderSearchQuery,
  ResolveAudienceInput,
  SearchAudience,
  SearchResultGroup,
  SearchableItem,
} from "./searchTypes";

const JWT_AUDIENCE: Record<string, SearchAudience> = {
  PATIENT: "patient",
  HEALTH_WORKER: "hw",
  DOCTOR: "doctor",
  FACILITY_STAFF: "facility",
  FACILITY_ADMIN: "facility",
  ADMIN: "facility",
};

export function resolveSearchAudience({
  jwtRole,
  shellRole,
}: ResolveAudienceInput): SearchAudience {
  if (jwtRole && JWT_AUDIENCE[jwtRole]) {
    return JWT_AUDIENCE[jwtRole];
  }

  if (shellRole === "Patient") return "patient";
  if (shellRole === "Health Worker") return "hw";
  if (shellRole === "Doctor") return "doctor";
  if (shellRole === "Healthcare Facility") return "facility";

  return "public";
}

function matchesQuery(item: SearchableItem, query: string): boolean {
  const q = query.toLowerCase();
  if (item.title.toLowerCase().includes(q)) return true;
  if (item.category.toLowerCase().includes(q)) return true;
  return item.keywords.some((keyword) => keyword.toLowerCase().includes(q));
}

/** Lightweight, in-memory navigation search. No backend call. */
export function searchNavigation({
  query,
  audience,
  limit = 5,
}: HeaderSearchQuery): SearchableItem[] {
  const q = query.trim();
  if (!q) return [];

  return SEARCHABLE_ROUTES.filter(
    (item) => item.audiences.includes(audience) && matchesQuery(item, q)
  ).slice(0, limit);
}

export function groupSearchResults(items: SearchableItem[]): SearchResultGroup[] {
  const groups: SearchResultGroup[] = [];

  for (const item of items) {
    const existing = groups.find((group) => group.category === item.category);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ category: item.category, items: [item] });
    }
  }

  return groups;
}

export function dashboardPathForJwtRole(role: string | null | undefined): string | null {
  if (!role) return null;
  const map: Partial<Record<Role, string>> = {
    PATIENT: "/patient/dashboard",
    HEALTH_WORKER: "/hw/dashboard",
    DOCTOR: "/doctor/dashboard",
    FACILITY_STAFF: "/facility/dashboard",
    FACILITY_ADMIN: "/facility/dashboard",
    ADMIN: "/facility/dashboard",
  };
  return map[role as Role] ?? null;
}

/**
 * Single entry point for header search.
 * Today this is navigation-only. When FastAPI adds a global search endpoint,
 * append authorized entity hits here instead of scattering fetch calls in the header.
 */
export async function runHeaderSearch(
  input: HeaderSearchQuery
): Promise<SearchableItem[]> {
  return searchNavigation(input);
}
