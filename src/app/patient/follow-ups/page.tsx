"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { FollowUpCard } from "@/components/care/FollowUpCard";
import { priyaPatientMock, FollowUpItem } from "@/lib/mockData";
import { HelpCircle } from "lucide-react";

export default function PatientFollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUpItem[]>(
    priyaPatientMock.followUps
  );
  const [needHelp, setNeedHelp] = useState(false);

  const handleMarkCompleted = (id: string) => {
    setFollowUps((prev) =>
      prev.map((fu) => (fu.id === id ? { ...fu, status: "Completed" } : fu))
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Next Visits & Care Schedule"
        subtitle="Medicine, lab test, and health worker visit reminders"
        roleBadge={<RoleBadge role="Patient" />}
      />

      {needHelp && (
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold flex items-center justify-between">
          <span>Assistance request sent to ASHA worker Meena Devi (+91 98765 43210). She will visit or call you.</span>
          <button
            type="button"
            onClick={() => setNeedHelp(false)}
            className="text-[10px] underline font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Follow-ups List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="font-extrabold text-slate-900 text-lg">
            Your Next Visits
          </h3>
          <button
            type="button"
            onClick={() => setNeedHelp(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors inline-flex items-center gap-1 border border-amber-300"
          >
            <HelpCircle className="w-4 h-4 text-amber-700" />
            <span>Ask for Help</span>
          </button>
        </div>

        {followUps.map((item) => (
          <FollowUpCard
            key={item.id}
            item={item}
            onMarkCompleted={handleMarkCompleted}
          />
        ))}
      </div>
    </div>
  );
}
