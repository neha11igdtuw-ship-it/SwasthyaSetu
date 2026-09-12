import type { ReferralStep } from "@/lib/mockData";
import type { ReferralStatus } from "@/lib/api/types";

const STEP_NAMES: ReferralStep[] = [
  "Created",
  "Sent",
  "Accepted",
  "Patient Visit",
  "Test Completed",
  "Treatment Started",
  "Follow-up Due",
  "Closed",
];

const STATUS_INDEX: Record<ReferralStatus, number> = {
  CREATED: 0,
  PENDING: 1,
  ACCEPTED: 2,
  IN_TRANSIT: 3,
  COMPLETED: 7,
  REJECTED: 0,
  CANCELLED: 0,
};

export function stepsFromReferralStatus(status: ReferralStatus) {
  const idx = STATUS_INDEX[status] ?? 0;
  return STEP_NAMES.map((name, i) => ({
    name,
    status: (i < idx ? "completed" : i === idx ? "current" : "pending") as
      | "completed"
      | "current"
      | "pending",
  }));
}

export function currentStepLabel(status: ReferralStatus): ReferralStep {
  return STEP_NAMES[STATUS_INDEX[status] ?? 0];
}
