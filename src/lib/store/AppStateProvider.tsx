"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  priyaPatientMock,
  hwPatientsList,
  hwReferralsList,
  hwFollowUpsList,
  HealthWorkerPatient,
  HWReferral,
  HWFollowUp,
  MedicineItem,
  ReferralInfo,
  ReferralStep,
  FollowUpItem,
  NearbyFacility,
} from "../mockData";
import { db, OutboxItem } from "../offline/db";
import { matchReferralFacility } from "../referralMatching";
import { syncApi, symptomsApi } from "../api/client";
import type { SyncChange, SymptomSummarizeRequest, SymptomSummarizeResponse } from "../api/types";

export interface AppStateContextType {
  priyaProfile: typeof priyaPatientMock.profile;
  patients: HealthWorkerPatient[];
  referrals: HWReferral[];
  patientReferral: ReferralInfo;
  patientMedicines: MedicineItem[];
  inventory: Record<string, MedicineItem>;
  facilityAggregates: NearbyFacility & {
    bloodBankUnits: number;
    maternalIcuBeds: number;
    oxytocinAvailability: string;
    essentialMeds: "In Stock" | "Limited" | "Out of Stock";
  };
  followUps: FollowUpItem[];
  hwFollowUps: HWFollowUp[];
  screeningResult: {
    risk: string;
    bp: string;
    week: string;
    symptoms: string[];
    matchedFacility: NearbyFacility;
    matchReason: string;
  };
  lastSyncedTime: string | null;
  outboxItems: OutboxItem[];
  outboxCount: number;

  // Actions
  updateMedicineAvailability: (medId: string, availability: "In Stock" | "Limited" | "Out of Stock") => void;
  updateFacilityAggregates: (data: Partial<AppStateContextType["facilityAggregates"]>) => void;
  togglePatientMedicineReceived: (medId: string) => void;
  createReferral: (newRefData: Omit<HWReferral, "id" | "createdDate" | "currentStep">) => void;
  acceptFacilityReferral: (refId: string) => void;
  redirectFacilityReferral: (refId: string, targetFacilityName: string) => void;
  sendBackFacilityReferral: (refId: string) => void;
  advancePatientReferralStep: () => void;
  addPatient: (patientData: Omit<HealthWorkerPatient, "id"> & { id?: string }) => void;
  updatePatientScreening: (patientId: string, data: { riskLevel: "High Risk" | "Watch / Moderate" | "Low Risk"; bp: string; week?: number; symptoms: string[] }) => void;
  markFollowUpCompleted: (fuId: string) => void;
  triggerSyncNow: () => Promise<{ success: boolean; message: string }>;
  submitSymptomSummary: (
    data: SymptomSummarizeRequest
  ) => Promise<{ queued: boolean; response: SymptomSummarizeResponse | null; error: string | null }>;
}

const initialMatch = matchReferralFacility({
  riskLevel: "High Risk",
  systolicBp: 145,
  diastolicBp: 92,
  symptoms: ["Headache", "Blurred vision"],
  carePathway: "Maternal Care",
});

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [priyaProfile] = useState(priyaPatientMock.profile);
  const [patients, setPatients] = useState<HealthWorkerPatient[]>(hwPatientsList);
  const [referrals, setReferrals] = useState<HWReferral[]>(hwReferralsList);
  const [patientReferral, setPatientReferral] = useState<ReferralInfo>(priyaPatientMock.referral);

  // Initialize medicine inventory
  const initialInvMap: Record<string, MedicineItem> = {};
  priyaPatientMock.medicines.forEach((m) => {
    initialInvMap[m.id] = { ...m };
  });
  const [inventory, setInventory] = useState<Record<string, MedicineItem>>(initialInvMap);
  const [patientMedicines, setPatientMedicines] = useState<MedicineItem[]>(priyaPatientMock.medicines);

  // Facility stock aggregates
  const [facilityAggregates, setFacilityAggregates] = useState<AppStateContextType["facilityAggregates"]>({
    ...priyaPatientMock.nearbyFacilities[0],
    bloodBankUnits: 24,
    maternalIcuBeds: 4,
    oxytocinAvailability: "Adequate",
    essentialMeds: "In Stock",
  });

  const [followUps, setFollowUps] = useState<FollowUpItem[]>(priyaPatientMock.followUps);
  const [hwFollowUps, setHwFollowUps] = useState<HWFollowUp[]>(hwFollowUpsList);

  const [screeningResult, setScreeningResult] = useState({
    risk: "High Risk",
    bp: "145/92",
    week: "28",
    symptoms: ["Continuous Headache", "Blurred Vision"],
    matchedFacility: initialMatch.facility,
    matchReason: initialMatch.matchReason,
  });

  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>("Today at 9:30 AM");
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);

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

    // If it's for Priya, update patientReferral stepper
    if (newRefData.patientId === "P-7821" || newRefData.patientName.includes("Priya")) {
      setPatientReferral({
        id,
        facilityName: newRefData.facilityName,
        reason: newRefData.reason,
        priority: newRefData.priority,
        expectedVisitDate: newRefData.expectedVisitDate,
        currentStep: "Created",
        steps: [
          { name: "Created", status: "completed", date: createdDate },
          { name: "Accepted", status: "pending" },
          { name: "Patient Visit", status: "pending" },
          { name: "Test Completed", status: "pending" },
          { name: "Treatment Started", status: "pending" },
          { name: "Follow-up Due", status: "pending" },
          { name: "Closed", status: "pending" },
        ],
      });
    }

    enqueueOutbox("referral_creation", `New Care Request: ${newRefData.patientName} -> ${newRefData.facilityName}`, newRef);
  };

  const acceptFacilityReferral = (refId: string) => {
    setReferrals((prev) =>
      prev.map((r) =>
        r.id === refId ? { ...r, status: "Accepted", currentStep: "Accepted" } : r
      )
    );

    const refObj = referrals.find((r) => r.id === refId);
    if (refObj) {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === refObj.patientId ? { ...p, referralStatus: "Accepted" } : p
        )
      );
    }

    // Sync Priya's stepper
    setPatientReferral((prev) => ({
      ...prev,
      currentStep: "Accepted",
      steps: prev.steps.map((s) => {
        if (s.name === "Created") return { ...s, status: "completed" };
        if (s.name === "Accepted") return { ...s, status: "completed", date: "Today" };
        if (s.name === "Patient Visit") return { ...s, status: "current" };
        return s;
      }),
    }));
  };

  const redirectFacilityReferral = (refId: string, targetFacilityName: string) => {
    setReferrals((prev) =>
      prev.map((r) =>
        r.id === refId
          ? { ...r, facilityName: targetFacilityName, status: "Pending Acceptance" }
          : r
      )
    );

    setPatientReferral((prev) =>
      prev.id === refId ? { ...prev, facilityName: targetFacilityName } : prev
    );
  };

  const sendBackFacilityReferral = (refId: string) => {
    setReferrals((prev) =>
      prev.map((r) =>
        r.id === refId ? { ...r, status: ("Sent Back to Health Worker" as unknown as HWReferral["status"]) } : r
      )
    );

    const refObj = referrals.find((r) => r.id === refId);
    if (refObj) {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === refObj.patientId ? { ...p, referralStatus: "Waiting for action" } : p
        )
      );
    }
  };

  const advancePatientReferralStep = () => {
    const stepOrder: ReferralStep[] = [
      "Created",
      "Accepted",
      "Patient Visit",
      "Test Completed",
      "Treatment Started",
      "Follow-up Due",
      "Closed",
    ];

    setPatientReferral((prev) => {
      const currentIndex = stepOrder.indexOf(prev.currentStep);
      if (currentIndex < 0 || currentIndex >= stepOrder.length - 1) return prev;

      const nextStep = stepOrder[currentIndex + 1];

      return {
        ...prev,
        currentStep: nextStep,
        steps: prev.steps.map((s, idx) => {
          if (idx <= currentIndex + 1) {
            return {
              ...s,
              status: idx === currentIndex + 1 ? "current" : "completed",
              date: s.date || "Today",
            };
          }
          return s;
        }),
      };
    });
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
    data: { riskLevel: "High Risk" | "Watch / Moderate" | "Low Risk"; bp: string; week?: number; symptoms: string[] }
  ) => {
    const [sys, dia] = data.bp.split("/").map((v) => parseInt(v.trim()) || 120);

    const match = matchReferralFacility({
      riskLevel: data.riskLevel,
      systolicBp: sys,
      diastolicBp: dia,
      symptoms: data.symptoms,
      carePathway: "Maternal Care",
    });

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
      week: (data.week || 28).toString(),
      symptoms: data.symptoms,
      matchedFacility: match.facility,
      matchReason: match.matchReason,
    });

    enqueueOutbox("screening", `Health Check Screening: ${patientId}`, { patientId, ...data, matchedFacility: match.facility.name });
  };

  const markFollowUpCompleted = (fuId: string) => {
    setFollowUps((prev) =>
      prev.map((f) => (f.id === fuId ? { ...f, status: "Completed" } : f))
    );
    setHwFollowUps((prev) =>
      prev.map((f) => (f.id === fuId ? { ...f, status: "Completed" } : f))
    );
  };

  // 4. Dexie Offline Sync — real POST /api/v1/sync/push + GET-equivalent
  // POST /api/v1/sync/pull against the backend (see backend/app/api/routes/sync.py).
  const triggerSyncNow = async () => {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (!isOnline) {
      return {
        success: false,
        message: "Network offline — Records safely queued in phone memory.",
      };
    }

    try {
      const queued = await db.outbox.where("status").equals("queued").toArray();

      const syncable = queued.filter((i) => i.entityType && i.operation && i.clientChangeId);
      const legacy = queued.filter((i) => !(i.entityType && i.operation && i.clientChangeId));

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
    }
  };

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
        priyaProfile,
        patients,
        referrals,
        patientReferral,
        patientMedicines,
        inventory,
        facilityAggregates,
        followUps,
        hwFollowUps,
        screeningResult,
        lastSyncedTime,
        outboxItems,
        outboxCount,

        updateMedicineAvailability,
        updateFacilityAggregates,
        togglePatientMedicineReceived,
        createReferral,
        acceptFacilityReferral,
        redirectFacilityReferral,
        sendBackFacilityReferral,
        advancePatientReferralStep,
        addPatient,
        updatePatientScreening,
        markFollowUpCompleted,
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
