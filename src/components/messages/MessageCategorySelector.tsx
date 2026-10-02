"use client";

import React from "react";
import type { MessageCategory } from "@/lib/api/types";

interface MessageCategorySelectorProps {
  value: MessageCategory;
  onChange: (category: MessageCategory) => void;
}

const categories: { value: MessageCategory; label: string }[] = [
  { value: "GENERAL", label: "General" },
  { value: "SYMPTOM", label: "Symptom" },
  { value: "MEDICINE", label: "Medicine" },
  { value: "APPOINTMENT", label: "Appointment" },
  { value: "REFERRAL", label: "Referral" },
  { value: "FOLLOW_UP", label: "Follow-up" },
];

export function MessageCategorySelector({
  value,
  onChange,
}: MessageCategorySelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as MessageCategory)}
      className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
    >
      {categories.map((cat) => (
        <option key={cat.value} value={cat.value}>
          {cat.label}
        </option>
      ))}
    </select>
  );
}
