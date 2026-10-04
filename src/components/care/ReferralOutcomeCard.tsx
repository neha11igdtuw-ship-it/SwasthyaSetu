"use client";

import React, { useState } from "react";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { referralsApi, ApiError } from "@/lib/api/client";
import type { ReferralOut, ReferralOutcome } from "@/lib/api/types";
import {
  REFERRAL_OUTCOME_OPTIONS,
  isUnsuccessfulOutcome,
  referralOutcomeLabel,
} from "@/lib/referral/outcomes";

interface ReferralOutcomeCardProps {
  referral: ReferralOut;
  /** Called with the server's updated referral so the parent can replace it. */
  onUpdated: (referral: ReferralOut) => void;
}

/**
 * Lets the signed-in patient report what happened after a referral. The
 * outcome is persisted via POST /referrals/{id}/outcome and is reported once
 * per referral; afterwards the reported outcome is shown read-only.
 */
export function ReferralOutcomeCard({ referral, onUpdated }: ReferralOutcomeCardProps) {
  const [selected, setSelected] = useState<ReferralOutcome | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Not relevant for requests that were rejected or cancelled.
  if (referral.status === "REJECTED" || referral.status === "CANCELLED") return null;

  if (referral.outcome) {
    const followUp = isUnsuccessfulOutcome(referral.outcome);
    return (
      <div
        className={`p-4 rounded-xl border text-xs space-y-1.5 ${
          followUp
            ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 text-amber-950 dark:text-amber-100"
            : "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 text-emerald-950 dark:text-emerald-100"
        }`}
      >
        <div className="flex items-center gap-2 font-extrabold text-sm">
          {followUp ? (
            <AlertTriangle className="w-4 h-4 text-amber-700" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          )}
          <span>You reported: {referralOutcomeLabel(referral.outcome)}</span>
        </div>
        {referral.outcome_notes && <p className="font-medium">Notes: {referral.outcome_notes}</p>}
        {referral.outcome_reported_at && (
          <p className="text-[11px] opacity-75">
            Reported on {new Date(referral.outcome_reported_at + "Z").toLocaleString()}
          </p>
        )}
        {followUp && (
          <p className="text-[11px] font-semibold">
            Your health worker has been told and will follow up with you.
          </p>
        )}
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await referralsApi.reportOutcome(referral.id, {
        outcome: selected,
        notes: notes.trim() || null,
      });
      onUpdated(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("An outcome was already reported for this referral. Refreshing…");
        try {
          onUpdated(await referralsApi.get(referral.id));
        } catch {
          /* leave the message in place */
        }
      } else {
        setError(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : "Could not save your update. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const groupName = `outcome-${referral.id}`;

  return (
    <form
      onSubmit={submit}
      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3"
    >
      <fieldset className="space-y-2" disabled={submitting}>
        <legend className="text-sm font-extrabold text-slate-900 dark:text-white mb-1">
          What happened after this referral?
        </legend>
        {REFERRAL_OUTCOME_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-3 min-h-11 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
              selected === opt.value
                ? "border-teal-600 bg-teal-50 dark:bg-teal-900/30 text-teal-900 dark:text-teal-100"
                : "border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
            }`}
          >
            <input
              type="radio"
              name={groupName}
              value={opt.value}
              checked={selected === opt.value}
              onChange={() => setSelected(opt.value)}
              className="w-4 h-4 accent-teal-700"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </fieldset>

      <div>
        <label htmlFor={`${groupName}-notes`} className="text-xs font-bold block mb-1">
          Notes (optional)
        </label>
        <textarea
          id={`${groupName}-notes`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          rows={2}
          disabled={submitting}
          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100"
        />
      </div>

      {error && (
        <p role="alert" className="text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!selected || submitting}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold disabled:opacity-60 cursor-pointer"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Saving…</span>
          </>
        ) : (
          "Submit update"
        )}
      </button>
    </form>
  );
}
