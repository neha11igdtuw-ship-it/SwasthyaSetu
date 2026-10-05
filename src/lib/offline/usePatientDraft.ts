"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUserId } from "@/lib/api/client";
import { db, type PatientDraftRecord } from "@/lib/offline/db";

export function usePatientDraft<T>(draftKey: string) {
  const userId = getCurrentUserId();
  const id = useMemo(() => (userId ? `${userId}:${draftKey}` : null), [userId, draftKey]);
  const [record, setRecord] = useState<PatientDraftRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    setRecord(null);
    if (!id) {
      setReady(true);
      return;
    }
    db.patientDrafts
      .get(id)
      .then((saved) => {
        if (active) setRecord(saved ?? null);
      })
      .catch(() => {
        if (active) setRecord(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const saveDraft = useCallback(
    async (value: T) => {
      if (!id) return;
      const next: PatientDraftRecord = { id, value, updatedAt: new Date().toISOString() };
      try {
        await db.patientDrafts.put(next);
        setRecord(next);
      } catch (error) {
        console.warn("Could not save patient form draft on this device:", error);
      }
    },
    [id]
  );

  const clearDraft = useCallback(async () => {
    if (!id) return;
    try {
      await db.patientDrafts.delete(id);
      setRecord(null);
    } catch (error) {
      console.warn("Could not remove patient form draft from this device:", error);
    }
  }, [id]);

  return {
    draft: record?.value as T | undefined,
    savedAt: record?.updatedAt ?? null,
    ready,
    saveDraft,
    clearDraft,
  };
}
