"use client";

import React from "react";
import { AppShell } from "@/components/AppShell";
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
  { labelKey: "patientsToReview", defaultLabel: "Patients to Review", href: "/doctor/dashboard", icon: Stethoscope },
  { labelKey: "records", defaultLabel: "People Records", href: "/doctor/patients", icon: Users },
  { labelKey: "referrals", defaultLabel: "Care Requests", href: "/doctor/care-requests", icon: Share2 },
  { labelKey: "todaysSchedule", defaultLabel: "Today's Schedule", href: "/doctor/schedule", icon: Clock },
];

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      role="Doctor"
      userName="Dr. Ananya Rao"
      facilityOrLocation="District Civil Hospital"
      navItems={doctorNavItems}
    >
      {children}
    </AppShell>
  );
}
