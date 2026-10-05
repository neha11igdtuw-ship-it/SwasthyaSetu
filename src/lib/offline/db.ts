import Dexie, { type EntityTable } from "dexie";
import type { CareGapOut, PatientOut, ReferralOut } from "@/lib/api/types";

export type SyncEntityType = "PATIENT" | "REFERRAL" | "CARE_GAP";
export type SyncOperation = "CREATE" | "UPDATE" | "DELETE";

export interface OutboxItem {
  id?: number;
  type: "patient_registration" | "screening" | "referral_creation" | "followup_update" | "symptom_summary";
  title: string;
  payload: unknown;
  status: "queued" | "sent" | "conflict" | "error";
  createdAt: string;
  // Fields needed to build a real /api/v1/sync/push change from this item.
  clientChangeId?: string;
  entityType?: SyncEntityType;
  operation?: SyncOperation;
  entityId?: string | null;
  baseVersion?: number | null;
  resultMessage?: string | null;
}

export interface DocumentRecord {
  id?: number;
  name: string;
  fileType: string;
  size: number;
  blob: Blob;
  addedAt: string;
}

export interface PatientDraftRecord {
  id: string;
  value: unknown;
  updatedAt: string;
}

export interface PatientCareCacheRecord {
  id: string;
  cachedAt: string;
  patient: PatientOut;
  referrals: ReferralOut[];
  careGaps: CareGapOut[];
  facilityName: string | null;
  nextVisit: string | null;
}

const db = new Dexie("SwasthyaSetuDB") as Dexie & {
  outbox: EntityTable<OutboxItem, "id">;
  documents: EntityTable<DocumentRecord, "id">;
  patientDrafts: EntityTable<PatientDraftRecord, "id">;
  patientCareCache: EntityTable<PatientCareCacheRecord, "id">;
};

db.version(3).stores({
  outbox: "++id, type, status, createdAt",
  documents: "++id, name, addedAt",
});

db.version(4).stores({
  outbox: "++id, type, status, createdAt",
  documents: "++id, name, addedAt",
  patientDrafts: "id, updatedAt",
  patientCareCache: "id, cachedAt",
});

export { db };
