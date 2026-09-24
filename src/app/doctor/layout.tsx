"use client";

import React from "react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { NavItem } from "@/components/Sidebar";
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  Share2,
  Clock,
} from "lucide-react";

const doctorNavItems: NavItem[] = [
  { labelKey: "overview", defaultLabel: "Overview", href: "/doctor/dashboard", icon: LayoutDashboard },
  { labelKey: "patientsToReview", defaultLabel: "Patients to Review", href: "/doctor/patients-to-review", icon: Stethoscope },
  { labelKey: "records", defaultLabel: "People Records", label: "Patient Record", href: "/doctor/patients", icon: Users },
  { labelKey: "referrals", defaultLabel: "Care Requests", href: "/doctor/care-requests", icon: Share2 },
  { labelKey: "todaysSchedule", defaultLabel: "Today's Schedule", href: "/doctor/schedule", icon: Clock },
];

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
    <AppShell
      role="Doctor"
      userName="Dr. Meera Singh"
      facilityOrLocation="District Civil Hospital & Maternal Care Centre"
      navItems={doctorNavItems}
    >
      {children}
    </AppShell>
    </RequireAuth>
  );
}
