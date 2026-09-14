import type { LucideIcon } from "lucide-react";
import type { RoleType } from "@/components/RoleBadge";

/** Who may see a navigation search result. */
export type SearchAudience = "public" | "patient" | "hw" | "doctor" | "facility";

export interface SearchableItem {
  id: string;
  title: string;
  category: string;
  href: string;
  keywords: string[];
  icon: LucideIcon;
  audiences: SearchAudience[];
}

export interface SearchResultGroup {
  category: string;
  items: SearchableItem[];
}

export interface HeaderSearchQuery {
  query: string;
  audience: SearchAudience;
  limit?: number;
}

export interface ResolveAudienceInput {
  jwtRole?: string | null;
  shellRole?: RoleType;
}

/**
 * Placeholder for a future FastAPI global search response.
 * Do not populate this from fake data; wire it only when a real endpoint exists.
 */
export interface FutureEntitySearchHit {
  id: string;
  type: "doctor" | "facility" | "medicine" | "patient" | "lab" | "care_request" | "record";
  title: string;
  href: string;
  category: string;
}
