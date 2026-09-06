"use client";

import React from "react";
import { AppShell } from "@/components/AppShell";
import { NavItem } from "@/components/Sidebar";
import {
  LayoutDashboard,
  Inbox,
  Users,
  Activity,
  PackageCheck,
} from "lucide-react";

const facilityNavItems: NavItem[] = [
  { labelKey: "overview", defaultLabel: "Facility Overview", href: "/facility/dashboard", icon: LayoutDashboard },
  { labelKey: "referrals", defaultLabel: "New Care Requests", href: "/facility/dashboard", icon: Inbox },
  { labelKey: "records", defaultLabel: "People Expected Today", href: "/hw/patients", icon: Users },
  { labelKey: "diagnostics", defaultLabel: "Services Available", href: "/facility/dashboard", icon: Activity },
  { labelKey: "medicines", defaultLabel: "Medicine Stock", href: "/facility/dashboard", icon: PackageCheck },
];

export default function FacilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      role="Healthcare Facility"
      userName="District Civil Hospital"
      facilityOrLocation="Kalyanpur District"
      navItems={facilityNavItems}
    >
      {children}
    </AppShell>
  );
}
