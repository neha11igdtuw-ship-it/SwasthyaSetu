"use client";

import React from "react";
import type { TeleconsultFallback } from "@/lib/api/types";
import { TELECONSULT_FALLBACK_OPTIONS } from "@/lib/teleconsult/fallback";

interface TeleconsultFallbackSelectorProps {
  /** Unique per instance so radio groups on one page don't interfere. */
  name: string;
  value: TeleconsultFallback;
  onChange: (value: TeleconsultFallback) => void;
  disabled?: boolean;
}

/** Radio group for the four teleconsultation fallback options. */
export function TeleconsultFallbackSelector({
  name,
  value,
  onChange,
  disabled = false,
}: TeleconsultFallbackSelectorProps) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-xs font-extrabold text-slate-800 dark:text-slate-100 mb-1">
        How would you like to consult?
      </legend>
      {TELECONSULT_FALLBACK_OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className={`flex items-start gap-3 min-h-11 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-colors ${
            value === opt.value
              ? "border-teal-600 bg-teal-50 dark:bg-teal-900/30"
              : "border-slate-200 dark:border-slate-700"
          } ${disabled ? "opacity-70" : ""}`}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="w-4 h-4 mt-0.5 accent-teal-700"
          />
          <span>
            <span className="font-bold text-slate-900 dark:text-white block">{opt.label}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{opt.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
