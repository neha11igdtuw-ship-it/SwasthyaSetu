const UNSPECIFIED = new Set([
  "",
  "not specified",
  "उल्लेख नहीं",
  "नमूद नाही",
]);

const RELATIVE_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bsince\s+last\s+night\b/i, label: "since last night" },
  { re: /\blast\s+night\b/i, label: "last night" },
  { re: /\byesterday\s+night\b/i, label: "yesterday night" },
  { re: /\bsince\s+yesterday\b/i, label: "since yesterday" },
  { re: /\byesterday\b/i, label: "yesterday" },
  { re: /\bsince\s+this\s+morning\b/i, label: "since this morning" },
  { re: /\bthis\s+morning\b/i, label: "this morning" },
  { re: /\bsince\s+morning\b/i, label: "since morning" },
  { re: /\bsince\s+this\s+evening\b/i, label: "since this evening" },
  { re: /\bthis\s+evening\b/i, label: "this evening" },
  { re: /\bsince\s+evening\b/i, label: "since evening" },
  { re: /\ball\s+day\b/i, label: "all day" },
  { re: /\ba\s+few\s+hours?\b/i, label: "a few hours" },
  { re: /\bfew\s+hours?\b/i, label: "few hours" },
  { re: /\bfor\s+a\s+day\b/i, label: "for a day" },
  { re: /\bone\s+day\b/i, label: "one day" },
  { re: /\ba\s+day\b/i, label: "one day" },
  { re: /कल\s*रात\s*से/, label: "कल रात से" },
  { re: /कल\s*रात/, label: "कल रात" },
  { re: /पिछली\s*रात\s*से/, label: "पिछली रात से" },
  { re: /पिछली\s*रात/, label: "पिछली रात" },
  { re: /रात\s*से/, label: "रात से" },
  { re: /कल\s*से/, label: "कल से" },
  { re: /आज\s*सुबह\s*से/, label: "आज सुबह से" },
  { re: /सुबह\s*से/, label: "सुबह से" },
  { re: /शाम\s*से/, label: "शाम से" },
  { re: /एक\s*दिन\s*से/, label: "एक दिन से" },
  { re: /एक\s*दिन/, label: "एक दिन" },
  { re: /दो\s*दिनों?\s*से/, label: "दो दिनों से" },
  { re: /कुछ\s*घंट[ेों]/, label: "कुछ घंटे" },
  { re: /एक\s*हफ्ते\s*से/, label: "एक हफ्ते से" },
  { re: /एक\s*सप्ताह/, label: "एक सप्ताह" },
  { re: /काल\s*रात्रीपासून/, label: "काल रात्रीपासून" },
  { re: /काल\s*रात्री/, label: "काल रात्री" },
  { re: /सकाळीपासून/, label: "सकाळीपासून" },
  { re: /एक\s*दिवस/, label: "एक दिवस" },
];

const QUANTIFIED =
  /(?:for|since|from)?\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s*(?:days?|weeks?|months?|hours?|minutes?|दिनों?|दिन|हफ़्त[ेों]|हफ्त[ेों]|सप्ताह|महीन[ेों]|घंट[ेों]|दिवस)/i;

export function isUnspecifiedDuration(value: string | null | undefined): boolean {
  return UNSPECIFIED.has((value || "").trim().toLowerCase());
}

/** Pull a spoken/typed duration phrase such as "last night" or "one day". */
export function extractDuration(text: string | null | undefined): string | null {
  const raw = (text || "").trim();
  if (!raw) return null;

  for (const { re, label } of RELATIVE_PATTERNS) {
    if (re.test(raw)) return label;
  }

  const quantified = raw.match(QUANTIFIED);
  if (quantified) return quantified[0].trim();

  return null;
}

export function resolveDuration(
  preferred: string | null | undefined,
  transcript: string
): string {
  if (preferred && !isUnspecifiedDuration(preferred)) return preferred.trim();
  return extractDuration(transcript) || preferred?.trim() || "Not specified";
}
