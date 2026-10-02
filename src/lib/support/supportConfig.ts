// Support contact details come from NEXT_PUBLIC_* environment variables so
// the owner of a deployment can configure them without code changes.
// Nothing here is a real number: if the variable is missing, empty, or still
// holds the "1800-XXX-XXXX" placeholder, the UI shows an "unavailable" note
// and never renders a `tel:` link.

export interface SupportPhone {
  /** Human-readable form, exactly as configured. */
  display: string;
  /** Dialer-safe form for a `tel:` link (digits and an optional leading +). */
  telHref: string;
}

const MIN_PHONE_DIGITS = 6;
const MAX_PHONE_DIGITS = 15;

export function parseSupportPhone(raw: string | undefined | null): SupportPhone | null {
  const display = (raw ?? "").trim();
  if (!display) return null;
  // Only digits, spaces, and common phone punctuation are accepted. Anything
  // else (for example the letters in "1800-XXX-XXXX") means "not configured".
  if (!/^\+?[\d\s\-().]+$/.test(display)) return null;
  const digits = display.replace(/\D/g, "");
  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) return null;
  const telHref = `${display.startsWith("+") ? "+" : ""}${digits}`;
  return { display, telHref };
}

export function parseSupportEmail(raw: string | undefined | null): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

// NEXT_PUBLIC_* values are inlined at build time, so each variable must be
// referenced literally (no dynamic lookups).
export function getSupportPhone(): SupportPhone | null {
  return parseSupportPhone(process.env.NEXT_PUBLIC_SUPPORT_PHONE);
}

export function getSupportEmail(): string | null {
  return parseSupportEmail(process.env.NEXT_PUBLIC_SUPPORT_EMAIL);
}
