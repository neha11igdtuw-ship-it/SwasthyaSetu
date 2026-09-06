"use client";

import React from "react";
import { AppShell } from "@/components/AppShell";
import { NavItem } from "@/components/Sidebar";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Share2,
  CalendarCheck,
} from "lucide-react";

const doctorNavItems: NavItem[] = [
  { label: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
  { label: "Cases", href: "/doctor/cases", icon: ClipboardList },
  { label: "Patients", href: "/doctor/patients", icon: Users },
  { label: "Referrals", href: "/doctor/referrals", icon: Share2 },
  { label: "Follow-ups", href: "/doctor/follow-ups", icon: CalendarCheck },
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
      facilityOrLocation="District Civil Hospital • Medical Unit 2"
      navItems={doctorNavItems}
      showMobileNav={true}
    >
      {children}
    </AppShell>
  );
}
