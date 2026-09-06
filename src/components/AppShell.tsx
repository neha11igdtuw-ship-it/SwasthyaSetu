import React from "react";
import { RoleType } from "./RoleBadge";
import { TopBar } from "./TopBar";
import { Sidebar, NavItem } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";

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
  return (
    <div className="min-h-screen flex flex-col bg-[#f6fafa]">
      <TopBar
        role={role}
        userName={userName}
        facilityOrLocation={facilityOrLocation}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar items={navItems} />

        <main className={`flex-1 p-4 sm:p-8 ${showMobileNav ? "pb-20 md:pb-8" : ""}`}>
          {children}
        </main>
      </div>

      {showMobileNav && <MobileBottomNav items={navItems} />}
    </div>
  );
}
