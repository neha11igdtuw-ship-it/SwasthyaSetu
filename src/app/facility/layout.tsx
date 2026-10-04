"use client";

import React from "react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { NavItem } from "@/components/Sidebar";
import {
  LayoutDashboard,
  Inbox,
  Users,
  Activity,
  PackageCheck,
  LifeBuoy,
} from "lucide-react";

const facilityNavItems: NavItem[] = [
  { labelKey: "overview", defaultLabel: "Facility Overview", label: "Facility Overview", href: "/facility/dashboard", icon: LayoutDashboard },
  { labelKey: "referrals", defaultLabel: "New Care Requests", label: "New Care Requests", href: "/facility/care-requests", icon: Inbox },
  { labelKey: "records", defaultLabel: "People Expected Today", label: "People Expected Today", href: "/facility/patients", icon: Users },
  { labelKey: "diagnostics", defaultLabel: "Lab Results", label: "Lab Results", href: "/facility/lab-results", icon: Activity },
  { labelKey: "medicines", defaultLabel: "Medicine Stock", label: "Medicine Stock", href: "/facility/medicines", icon: PackageCheck },
  { labelKey: "supportRequests", defaultLabel: "Support Requests", label: "Support Requests", href: "/facility/support-requests", icon: LifeBuoy },
];

export default function FacilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
    <AppShell
      role="Healthcare Facility"
      userName="District Civil Hospital Admin"
      facilityOrLocation="District Civil Hospital & Maternal Care Centre"
      navItems={facilityNavItems}
    >
      {children}
    </AppShell>
    </RequireAuth>
  );
}
