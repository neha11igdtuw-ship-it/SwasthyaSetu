"use client";

import React, { useState } from "react";
import { RoleType } from "./RoleBadge";
import { TopBar } from "./TopBar";
import { Sidebar, NavItem } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

interface AppShellProps {
  role: RoleType;
  userName: string;
  facilityOrLocation: string;
  navItems: NavItem[];
  children: React.ReactNode;
  showMobileNav?: boolean;
}

export function AppShell({
  role,
  userName,
  facilityOrLocation,
  navItems,
  children,
  showMobileNav = true,
}: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const liveUser = useCurrentUser();
  const displayName = liveUser?.full_name || userName;
  const location =
    liveUser?.role === "HEALTH_WORKER"
      ? "Sub-Centre Rampur"
      : liveUser?.role === "DOCTOR" ||
        liveUser?.role === "FACILITY_ADMIN" ||
        liveUser?.role === "ADMIN"
      ? "District Civil Hospital & Maternal Care Centre"
      : facilityOrLocation;

  return (
    <div className="min-h-screen flex flex-col bg-[#f6fafa] dark:bg-[#0b1a1f]">
      <TopBar
        role={role}
        userName={displayName}
        facilityOrLocation={location}
        onToggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          items={navItems}
          role={role}
          userName={displayName}
          facilityOrLocation={location}
          isOpen={isSidebarOpen}
          onToggle={toggleSidebar}
        />

        <main
          className={`flex-1 p-4 sm:p-8 transition-all duration-300 ${
            showMobileNav ? "pb-20 md:pb-8" : ""
          }`}
        >
          {children}
        </main>
      </div>

      {showMobileNav && <MobileBottomNav items={navItems} />}
    </div>
  );
}
