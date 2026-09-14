import React from "react";
import { OfflinePill } from "@/components/shared/OfflinePill";

interface LastSyncedBadgeProps {
  lastSyncedText?: string;
}

export function LastSyncedBadge({ lastSyncedText }: LastSyncedBadgeProps) {
  // lastSyncedText is optional and unused as the badge design renders Variant 2
  void lastSyncedText;
  return <OfflinePill />;
}
