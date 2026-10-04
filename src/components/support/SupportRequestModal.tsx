"use client";

import React, { useState } from "react";
import { X, Loader2, Send } from "lucide-react";
import { supportRequestsApi } from "@/lib/api/client";
import type { SupportRequestOut, SupportRequestReason } from "@/lib/api/types";

const REASONS: { value: SupportRequestReason; label: string }[] = [
  { value: "HEALTH_CONCERN", label: "I have a health concern" },
  { value: "UNDERSTANDING_HELP", label: "I need help understanding instructions" },
  { value: "CANNOT_TRAVEL", label: "I cannot travel" },
  { value: "CALLBACK", label: "I need a callback" },
  { value: "OTHER", label: "Other" },
];

interface SupportRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: (request: SupportRequestOut) => void;
}

export function SupportRequestModal({ open, onClose, onSubmitted }: SupportRequestModalProps) {
  const [reason, setReason] = useState<SupportRequestReason>("HEALTH_CONCERN");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const request = await supportRequestsApi.create({
        reason,
        message: message.trim() || undefined,
      });
      onSubmitted(request);
      setMessage("");
      setReason("HEALTH_CONCERN");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Get Support</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300">
          Tell us why you need help. This will be sent to your health worker and doctor right away.
        </p>

        <div className="space-y-2">
          {REASONS.map((r) => (
            <label
              key={r.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-sm font-semibold transition-colors ${
                reason === r.value
                  ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-900 dark:text-teal-200"
                  : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              }`}
            >
              <input
                type="radio"
                name="support-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-teal-600"
              />
              {r.label}
            </label>
          ))}
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add any details (optional)…"
          rows={3}
          maxLength={2000}
          className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-transparent"
        />

        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-bold transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitting ? "Submitting…" : "Submit Request"}
        </button>
      </div>
    </div>
  );
}
