"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { NavItem } from "@/components/Sidebar";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { appointmentsApi } from "@/lib/api/client";
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  Share2,
  Clock,
  Video,
} from "lucide-react";

const PENDING_POLL_MS = 30000;

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useCurrentUser();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user || user.role !== "DOCTOR") return;
    let cancelled = false;

    const poll = async () => {
      try {
        const pending = await appointmentsApi.doctorMe();
        if (!cancelled) {
          setPendingCount(pending.filter((a) => a.status === "REQUESTED").length);
        }
      } catch {
        // Ignore transient polling failures.
      }
    };

    void poll();
    const interval = setInterval(poll, PENDING_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  const doctorNavItems: NavItem[] = [
    { labelKey: "overview", defaultLabel: "Overview", href: "/doctor/dashboard", icon: LayoutDashboard },
    { labelKey: "patientsToReview", defaultLabel: "Patients to Review", href: "/doctor/patients-to-review", icon: Stethoscope },
    { labelKey: "records", defaultLabel: "People Records", label: "Patient Record", href: "/doctor/patients", icon: Users },
    { labelKey: "referrals", defaultLabel: "Care Requests", href: "/doctor/care-requests", icon: Share2 },
    { labelKey: "todaysSchedule", defaultLabel: "Today's Schedule", href: "/doctor/schedule", icon: Clock },
    {
      labelKey: "teleconsultations",
      defaultLabel: "Teleconsultations",
      href: "/doctor/teleconsultations",
      icon: Video,
      badge: pendingCount,
    },
  ];

  return (
    <RequireAuth>
    <AppShell
      role="Doctor"
      userName={user?.full_name || "Doctor"}
      facilityOrLocation="District Civil Hospital & Maternal Care Centre"
      navItems={doctorNavItems}
    >
      {children}
    </AppShell>
    </RequireAuth>
  );
}
