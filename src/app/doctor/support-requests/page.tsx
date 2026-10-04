"use client";

import React from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { SupportRequestInbox } from "@/components/support/SupportRequestInbox";

export default function DoctorSupportRequestsPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Support Requests"
        subtitle="Help requests from your patients"
        roleBadge={<RoleBadge role="Doctor" />}
      />
      <SupportRequestInbox />
    </div>
  );
}
