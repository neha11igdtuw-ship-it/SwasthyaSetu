export type CareRiskLevel = "High Risk" | "Watch / Moderate" | "Low Risk";

export interface MaternalSymptomFlags {
  headache?: boolean;
  blurredVision?: boolean;
  swelling?: boolean;
  bleeding?: boolean;
  abdominalPain?: boolean;
  fever?: boolean;
  reducedFetalMovement?: boolean;
  convulsions?: boolean;
}

export interface RiskInput extends MaternalSymptomFlags {
  systolicBp?: number;
  diastolicBp?: number;
  notes?: string;
}

export interface RiskAssessment {
  riskLevel: CareRiskLevel;
  highBp: boolean;
  flags: Required<MaternalSymptomFlags>;
}

const NOTE_PATTERNS: Array<{ key: keyof MaternalSymptomFlags; re: RegExp }> = [
  { key: "headache", re: /head\s*ache|सिरदर्द|डोकेदुखी/i },
  { key: "blurredVision", re: /blur|vision|धुंध|spots|दृष्टि/i },
  { key: "swelling", re: /swell|सूजन|सुज|शरीर\s*फूल/i },
  { key: "bleeding", re: /bleed|रक्तस्राव|रक्तस्त्राव/i },
  { key: "abdominalPain", re: /abdom|पेट\s*(दर्द|दुख)|पोट/i },
  { key: "fever", re: /fever|बुखार|ताप/i },
  { key: "reducedFetalMovement", re: /fetal|baby.{0,12}mov|हलचल\s*कम|गर्भ/i },
  { key: "convulsions", re: /convuls|fit|seizure|दौरा/i },
];

function parseBp(value?: number): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return value;
}

export function detectSymptomsFromText(text: string): MaternalSymptomFlags {
  const flags: MaternalSymptomFlags = {};
  for (const { key, re } of NOTE_PATTERNS) {
    if (re.test(text)) flags[key] = true;
  }
  return flags;
}

/**
 * GOI / WHO-aligned maternal danger-sign triage for the patient checklist.
 * Isolated headache is moderate; headache + visual change or swelling is high.
 */
export function assessMaternalRisk(input: RiskInput): RiskAssessment {
  const fromNotes = detectSymptomsFromText(input.notes || "");
  const flags: Required<MaternalSymptomFlags> = {
    headache: Boolean(input.headache || fromNotes.headache),
    blurredVision: Boolean(input.blurredVision || fromNotes.blurredVision),
    swelling: Boolean(input.swelling || fromNotes.swelling),
    bleeding: Boolean(input.bleeding || fromNotes.bleeding),
    abdominalPain: Boolean(input.abdominalPain || fromNotes.abdominalPain),
    fever: Boolean(input.fever || fromNotes.fever),
    reducedFetalMovement: Boolean(
      input.reducedFetalMovement || fromNotes.reducedFetalMovement
    ),
    convulsions: Boolean(input.convulsions || fromNotes.convulsions),
  };

  const sys = parseBp(input.systolicBp);
  const dia = parseBp(input.diastolicBp);
  const highBp = (sys != null && sys >= 140) || (dia != null && dia >= 90);

  const preEclampsiaCluster =
    flags.headache && (flags.blurredVision || flags.swelling);

  let riskLevel: CareRiskLevel = "Low Risk";
  if (
    highBp ||
    flags.bleeding ||
    flags.convulsions ||
    flags.reducedFetalMovement ||
    preEclampsiaCluster
  ) {
    riskLevel = "High Risk";
  } else if (
    flags.headache ||
    flags.blurredVision ||
    flags.swelling ||
    flags.abdominalPain ||
    flags.fever
  ) {
    riskLevel = "Watch / Moderate";
  }

  return { riskLevel, highBp, flags };
}
