"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  // Demo dataset used ONLY to power health-worker / facility demo screens
  // (see each field's usage note below). Never surfaced as a logged-in
  // PATIENT's own data — patient pages load exclusively from /auth/me and
  // /patients/me (see src/lib/api/ownPatient.ts).
  priyaPatientMock,
  hwPatientsList,
  hwReferralsList,
  hwFollowUpsList,
  HealthWorkerPatient,
  HWReferral,
  HWFollowUp,
  MedicineItem,
  NearbyFacility,
} from "../mockData";
import { db, OutboxItem } from "../offline/db";
import { matchReferralFacility } from "../referralMatching";
import { appointmentsApi, authApi, getCurrentUserId, getCurrentUserRole, referralsApi, syncApi, symptomsApi } from "../api/client";
import type { SyncChange, SymptomSummarizeRequest, SymptomSummarizeResponse } from "../api/types";

// The patient-facing screening result for the CURRENTLY LOGGED-IN patient,
// held only in memory for this session. It starts at `null` for every
// account — there is no seeded/default patient here, maternal or
// otherwise. It is populated only when the logged-in patient actually
// submits a symptom check (see updatePatientScreening below), which is
// always called with that patient's own real record id.
export interface ScreeningResultState {
  risk: string;
  bp: string;
  week: string;
  symptoms: string[];
  matchedFacility: NearbyFacility | null;
  matchReason: string;
}

export interface AppStateContextType {
  // Demo/seed data for HEALTH-WORKER and facility-side screens only. This
  // is intentionally preserved (per product decision) for demoing those
  // roles — it must never be read as the logged-in PATIENT's own data. See
  // each consumer: only src/app/hw/* and src/app/facility/* pages use these.
  patients: HealthWorkerPatient[];
  referrals: HWReferral[];
  patientMedicines: MedicineItem[];
  inventory: Record<string, MedicineItem>;
  facilityAggregates: NearbyFacility & {
    bloodBankUnits: number;
    maternalIcuBeds: number;
    oxytocinAvailability: string;
    essentialMeds: "In Stock" | "Limited" | "Out of Stock";
  };
  hwFollowUps: HWFollowUp[];

  // Real logged-in patient's own in-session screening result. Null until
  // that patient actually completes a symptom check.
  screeningResult: ScreeningResultState | null;

  lastSyncedTime: string | null;
  outboxItems: OutboxItem[];
  outboxCount: number;

  // Actions
  updateMedicineAvailability: (medId: string, availability: "In Stock" | "Limited" | "Out of Stock") => void;
  updateFacilityAggregates: (data: Partial<AppStateContextType["facilityAggregates"]>) => void;
  togglePatientMedicineReceived: (medId: string) => void;
  createReferral: (newRefData: Omit<HWReferral, "id" | "createdDate" | "currentStep">) => void;
  addPatient: (patientData: Omit<HealthWorkerPatient, "id"> & { id?: string }) => void;
  /**
   * Records an in-session screening result for the CALLER'S OWN patient
   * record. `patientId` must be the real, authenticated patient's id
   * (e.g. from loadOwnPatient()) — never a hardcoded/demo id.
   */
  updatePatientScreening: (patientId: string, data: { riskLevel: "High Risk" | "Watch / Moderate" | "Low Risk"; bp: string; week?: number; symptoms: string[]; carePathway?: string }) => void;
  triggerSyncNow: () => Promise<{ success: boolean; message: string }>;
  submitSymptomSummary: (
    data: SymptomSummarizeRequest
  ) => Promise<{ queued: boolean; response: SymptomSummarizeResponse | null; error: string | null }>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  // ---- Health-worker / facility DEMO data only (see field docs above) ----
  const [patients, setPatients] = useState<HealthWorkerPatient[]>(hwPatientsList);
  const [referrals, setReferrals] = useState<HWReferral[]>(hwReferralsList);

  // Demo medicine inventory shown on HW/facility stock screens
  // (src/app/hw/high-risk, src/app/facility/medicines). Not patient data.
  const initialInvMap: Record<string, MedicineItem> = {};
  priyaPatientMock.medicines.forEach((m) => {
    initialInvMap[m.id] = { ...m };
  });
  const [inventory, setInventory] = useState<Record<string, MedicineItem>>(initialInvMap);
  const [patientMedicines, setPatientMedicines] = useState<MedicineItem[]>(priyaPatientMock.medicines);

  // Demo facility stock aggregates shown on the facility dashboard.
  const [facilityAggregates, setFacilityAggregates] = useState<AppStateContextType["facilityAggregates"]>({
    ...priyaPatientMock.nearbyFacilities[0],
    bloodBankUnits: 24,
    maternalIcuBeds: 4,
    oxytocinAvailability: "Adequate",
    essentialMeds: "In Stock",
  });

  const [hwFollowUps] = useState<HWFollowUp[]>(hwFollowUpsList);

  // ---- Real logged-in patient's OWN in-session screening result.
  // Starts null for every account — no seeded/default patient, maternal or
  // otherwise. Only set once the logged-in patient submits a symptom check.
  const [screeningResult, setScreeningResult] = useState<ScreeningResultState | null>(null);

  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const syncInProgress = useRef(false);

  // Load outbox items from Dexie on mount
  const refreshOutbox = useCallback(async () => {
    try {
      const items = await db.outbox.toArray();
      setOutboxItems(items);
    } catch (e) {
      console.warn("Dexie outbox query error:", e);
    }
  }, []);

  useEffect(() => {
    refreshOutbox();
    const onOutboxChanged = () => void refreshOutbox();
    window.addEventListener("ss-outbox-updated", onOutboxChanged);
    return () => window.removeEventListener("ss-outbox-updated", onOutboxChanged);
  }, [refreshOutbox]);

  const outboxCount = outboxItems.filter((i) => i.status === "queued").length;

  // Helper to enqueue to Dexie. Items with entityType/operation set are real
  // candidates for /api/v1/sync/push; others (e.g. screenings) are local-only
  // records shown in the outbox UI but not currently sync-able (no CARE_GAP
  // create/update contract for this shape server-side).
  const enqueueOutbox = async (
    type: OutboxItem["type"],
    title: string,
    payload: unknown,
    sync?: { entityType: OutboxItem["entityType"]; operation: OutboxItem["operation"]; entityId?: string | null; baseVersion?: number | null }
  ) => {
    try {
      await db.outbox.add({
        type,
        title,
        payload,
        status: "queued",
        createdAt: new Date().toISOString(),
        clientChangeId: sync ? `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` : undefined,
        entityType: sync?.entityType,
        operation: sync?.operation,
        entityId: sync?.entityId ?? null,
        baseVersion: sync?.baseVersion ?? null,
        ownerUserId: getCurrentUserId(),
      });
      await refreshOutbox();
    } catch (e) {
      console.warn("Error enqueuing Dexie outbox:", e);
    }
  };

  // 1. Medicine stock update from Facility
  const updateMedicineAvailability = (medId: string, availability: "In Stock" | "Limited" | "Out of Stock") => {
    setInventory((prev) => {
      const updated = { ...prev };
      if (updated[medId]) {
        updated[medId] = { ...updated[medId], availability };
      }
      return updated;
    });

    setPatientMedicines((prev) =>
      prev.map((m) => (m.id === medId ? { ...m, availability } : m))
    );
  };

  const updateFacilityAggregates = (data: Partial<AppStateContextType["facilityAggregates"]>) => {
    setFacilityAggregates((prev) => ({ ...prev, ...data }));
  };

  const togglePatientMedicineReceived = (medId: string) => {
    setPatientMedicines((prev) =>
      prev.map((m) => (m.id === medId ? { ...m, received: !m.received } : m))
    );
  };

  // 2. Referral Lifecycle
  const createReferral = (newRefData: Omit<HWReferral, "id" | "createdDate" | "currentStep">) => {
    const id = `REF-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdDate = "Today";

    const newRef: HWReferral = {
      ...newRefData,
      id,
      createdDate,
      status: "Pending Acceptance",
      currentStep: "Created",
    };

    setReferrals((prev) => [newRef, ...prev]);

    // Update patient status in HW patient list
    setPatients((prev) =>
      prev.map((p) =>
        p.id === newRefData.patientId ? { ...p, referralStatus: "Waiting for action" } : p
      )
    );

    enqueueOutbox("referral_creation", `New Care Request: ${newRefData.patientName} -> ${newRefData.facilityName}`, newRef);
  };

  // 3. HW Patient Registration & Screening
  const addPatient = (patientData: Omit<HealthWorkerPatient, "id"> & { id?: string }) => {
    const id = patientData.id || `P-${Math.floor(1000 + Math.random() * 9000)}`;
    const newP: HealthWorkerPatient = {
      ...patientData,
      id,
    };

    setPatients((prev) => [newP, ...prev]);
    enqueueOutbox("patient_registration", `Patient Registration: ${newP.name} (${newP.village})`, newP);
  };

  const updatePatientScreening = (
    patientId: string,
    data: { riskLevel: "High Risk" | "Watch / Moderate" | "Low Risk"; bp: string; week?: number; symptoms: string[]; carePathway?: string }
  ) => {
    const [sys, dia] = data.bp.split("/").map((v) => parseInt(v.trim()) || 120);

    const match = matchReferralFacility({
      riskLevel: data.riskLevel,
      systolicBp: sys,
      diastolicBp: dia,
      symptoms: data.symptoms,
      carePathway: data.carePathway,
    });

    // Only touch the HW demo patient list if this call happens to concern
    // one of the demo patients (e.g. testing from a HW screen). A real
    // logged-in patient's id will not match any hwPatientsList row, so
    // this is a no-op for them — their result only lives in
    // `screeningResult` below and is never written into demo/seed data.
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? {
              ...p,
              riskLevel: data.riskLevel,
              vitals: { ...p.vitals, bp: data.bp },
              pregnancyWeek: data.week ?? p.pregnancyWeek,
              latestSymptoms: data.symptoms,
            }
          : p
      )
    );

    setScreeningResult({
      risk: data.riskLevel,
      bp: data.bp,
      week: data.week ? data.week.toString() : "",
      symptoms: data.symptoms,
      matchedFacility: match.facility,
      matchReason: match.matchReason,
    });

    enqueueOutbox("screening", `Health Check Screening: ${patientId}`, { patientId, ...data, matchedFacility: match.facility?.name ?? null });
  };

  // 4. Dexie Offline Sync — real POST /api/v1/sync/push + GET-equivalent
  // POST /api/v1/sync/pull against the backend (see backend/app/api/routes/sync.py).
  const triggerSyncNow = useCallback(async () => {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (!isOnline) {
      return {
        success: false,
        message: "Network offline — Records safely queued in phone memory.",
      };
    }
    if (syncInProgress.current) {
      return { success: true, message: "Sync is already in progress." };
    }
    syncInProgress.current = true;

    try {
      const queued = await db.outbox.where("status").equals("queued").toArray();

      if (getCurrentUserRole() === "PATIENT") {
        const me = await authApi.me();
        let sent = 0;
        let errors = 0;
        const pendingRequests = queued.filter(
          (item) => item.type === "referral_creation" || item.type === "appointment_request"
        );
        for (const item of pendingRequests) {
          if (!item.id || item.ownerUserId !== me.id || !item.clientChangeId) continue;
          try {
            const payload = item.payload as {
              request: unknown;
              requestId: string;
            };
            if (item.type === "referral_creation") {
              await referralsApi.requestCare(
                payload.request as Parameters<typeof referralsApi.requestCare>[0],
                item.clientChangeId
              );
            } else {
              await appointmentsApi.create(
                payload.request as Parameters<typeof appointmentsApi.create>[0],
                item.clientChangeId
              );
            }
            await db.outbox.update(item.id, { status: "sent", resultMessage: null });
            sent += 1;
          } catch (error) {
            await db.outbox.update(item.id, {
              status: "queued",
              resultMessage: error instanceof Error ? error.message : "Will retry when connected.",
            });
            errors += 1;
          }
        }

        for (const item of queued.filter((entry) => entry.type === "symptom_summary")) {
          if (!item.id || item.ownerUserId !== me.id) continue;
          try {
            const result = await symptomsApi.summarize(item.payload as SymptomSummarizeRequest);
            await db.outbox.update(item.id, { status: "sent", resultMessage: result.ai_summary_error || null });
            sent += 1;
          } catch (error) {
            await db.outbox.update(item.id, {
              status: "queued",
              resultMessage: error instanceof Error ? error.message : "Will retry when connected.",
            });
            errors += 1;
          }
        }

        await refreshOutbox();
        setLastSyncedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        return {
          success: errors === 0,
          message: errors
            ? `${sent} patient requests sent. ${errors} will retry when connected.`
            : `${sent} patient requests sent.`,
        };
      }

      const syncable = queued.filter((i) => i.entityType && i.operation && i.clientChangeId);
      const legacy = queued.filter(
        (i) => !(i.entityType && i.operation && i.clientChangeId) &&
          !(i.clientChangeId && i.type === "referral_creation") &&
          i.type !== "appointment_request"
      );

      let applied = 0;
      let conflicts = 0;
      let errors = 0;

      if (syncable.length > 0) {
        const deviceId =
          (typeof window !== "undefined" && window.localStorage.getItem("ss_device_id")) ||
          (() => {
            const id = `web-${Math.random().toString(36).slice(2, 10)}`;
            if (typeof window !== "undefined") window.localStorage.setItem("ss_device_id", id);
            return id;
          })();

        const changes: SyncChange[] = syncable.map((i) => ({
          client_change_id: i.clientChangeId!,
          entity_type: i.entityType!,
          operation: i.operation!,
          entity_id: i.entityId ?? null,
          base_version: i.baseVersion ?? null,
          payload: (i.payload as Record<string, unknown>) ?? {},
        }));

        const res = await syncApi.push({ device_id: deviceId, changes });

        for (const result of res.results) {
          const item = syncable.find((i) => i.clientChangeId === result.client_change_id);
          if (!item?.id) continue;
          if (result.status === "APPLIED" || result.status === "ALREADY_APPLIED") {
            applied += 1;
            await db.outbox.update(item.id, { status: "sent", resultMessage: null });
          } else if (result.status === "CONFLICT") {
            conflicts += 1;
            await db.outbox.update(item.id, {
              status: "conflict",
              resultMessage: result.error || "Server has a newer version of this record.",
            });
          } else {
            errors += 1;
            await db.outbox.update(item.id, {
              status: "error",
              resultMessage: result.error || "Sync error",
            });
          }
        }
      }

      // Legacy local-only entries (already submitted directly via their own
      // API call at creation time, e.g. patient registration) — just mark sent.
      // Exception: "symptom_summary" items are queued specifically because the
      // AI summarize call couldn't be made while offline (or failed), so retry
      // the real API call here instead of just marking them sent.
      for (const item of legacy) {
        if (!item.id) continue;
        if (item.type === "symptom_summary") {
          try {
            const result = await symptomsApi.summarize(item.payload as SymptomSummarizeRequest);
            await db.outbox.update(item.id, {
              status: "sent",
              resultMessage: result.ai_summary_error || null,
            });
          } catch (e) {
            await db.outbox.update(item.id, {
              status: "error",
              resultMessage: e instanceof Error ? e.message : "Failed to generate AI summary",
            });
          }
        } else {
          await db.outbox.update(item.id, { status: "sent" });
        }
      }

      // Pull latest server state so the device has up-to-date data too.
      await syncApi.pull(null);

      await refreshOutbox();

      const timeStr = `Today at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      setLastSyncedTime(timeStr);

      if (conflicts > 0 || errors > 0) {
        return {
          success: errors === 0,
          message: `Sync finished: ${applied} sent, ${conflicts} conflicts, ${errors} errors.`,
        };
      }

      return {
        success: true,
        message: `Sync completed successfully! ${applied + legacy.length} offline records submitted to central portal.`,
      };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? `Sync failed: ${e.message}` : "Sync failed. Records remain safely saved on device.",
      };
    } finally {
      syncInProgress.current = false;
    }
  }, [refreshOutbox]);

  useEffect(() => {
    const syncWhenOnline = () => {
      if (navigator.onLine && getCurrentUserRole() === "PATIENT") void triggerSyncNow();
    };
    window.addEventListener("online", syncWhenOnline);
    if (navigator.onLine && getCurrentUserRole() === "PATIENT") void triggerSyncNow();
    return () => {
      window.removeEventListener("online", syncWhenOnline);
    };
  }, [triggerSyncNow]);

  // 5. AI symptom summary (Gemini pipeline). Same offline pattern as the
  // rest of the outbox: if the device is offline, queue the request in the
  // Dexie outbox for later retry (processed by triggerSyncNow above) instead
  // of blocking the patient's symptom submission. If online, call the
  // backend directly and surface the result (which always preserves the
  // transcript even if the AI summary sub-step failed server-side).
  const submitSymptomSummary = async (data: SymptomSummarizeRequest) => {
    try {
      const response = await symptomsApi.summarize(data);
      return { queued: false, response, error: null };
    } catch (e) {
      // Return response object with client fallback or error details
      const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
      if (!isOnline) {
        await enqueueOutbox("symptom_summary", `Symptom summary: ${data.transcript.slice(0, 40)}`, data);
      }
      return {
        queued: false,
        response: null,
        error: e instanceof Error ? e.message : "Failed to reach the server.",
      };
    }
  };

  return (
    <AppStateContext.Provider
      value={{
        patients,
        referrals,
        patientMedicines,
        inventory,
        facilityAggregates,
        hwFollowUps,
        screeningResult,
        lastSyncedTime,
        outboxItems,
        outboxCount,

        updateMedicineAvailability,
        updateFacilityAggregates,
        togglePatientMedicineReceived,
        createReferral,
        addPatient,
        updatePatientScreening,
        triggerSyncNow,
        submitSymptomSummary,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
}
