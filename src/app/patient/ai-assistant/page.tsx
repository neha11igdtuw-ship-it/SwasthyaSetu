"use client";

import React from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { AIHealthAssistant } from "@/components/chatbot/AIHealthAssistant";

export default function PatientAIAssistantPage() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <PageHeader
        title="aiHealthAssistant"
        subtitle="aiHealthAssistantSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />
      <AIHealthAssistant />
    </div>
  );
}
