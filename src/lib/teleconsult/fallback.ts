import type { TeleconsultFallback } from "@/lib/api/types";

/** Teleconsultation fallback options, in display order. Values mirror the
 * backend `TeleconsultFallback` enum (backend/app/models/enums.py). */
export const TELECONSULT_FALLBACK_OPTIONS: ReadonlyArray<{
  value: TeleconsultFallback;
  label: string;
  hint: string;
}> = [
  {
    value: "VIDEO_CONSULTATION",
    label: "Video consultation",
    hint: "See and talk to the doctor on a video call.",
  },
  {
    value: "AUDIO_ONLY",
    label: "Audio-only consultation",
    hint: "Voice call only. Use this if your network is weak or you have no camera.",
  },
  {
    value: "PHONE_CALLBACK",
    label: "Request a phone callback",
    hint: "The care team calls you back on your registered phone number.",
  },
  {
    value: "PHYSICAL_FACILITY_REFERRAL",
    label: "Physical facility referral",
    hint: "Visit a health facility in person instead of a remote consultation.",
  },
];

export function teleconsultFallbackLabel(value: TeleconsultFallback | null | undefined): string {
  if (!value) return "";
  return TELECONSULT_FALLBACK_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
