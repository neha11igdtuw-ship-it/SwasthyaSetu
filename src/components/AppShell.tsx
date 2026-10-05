"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleType } from "./RoleBadge";
import { TopBar } from "./TopBar";
import { Sidebar, NavItem } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { TourProvider } from "@/components/tour/TourProvider";
import { SupportProvider } from "@/components/support/SupportProvider";
import { HelpButton } from "@/components/support/HelpButton";
import { clearTokens, isDemoMode } from "@/lib/api/client";
import { useLanguage } from "@/lib/i18n/languageContext";
import { OfflinePill } from "@/components/shared/OfflinePill";

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
  const [demoMode, setDemoMode] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => setDemoMode(isDemoMode()), []);

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
    <TourProvider user={liveUser}>
    <SupportProvider>
    <div className="min-h-screen flex flex-col bg-[#f6fafa] dark:bg-[#0b1a1f]">
      {demoMode && (
        <div className="flex items-center justify-center gap-3 bg-teal-900 px-3 py-2 text-center text-xs font-semibold text-white sm:text-sm">
          <span>{t("demoModeNote")}</span>
          <button
            type="button"
            onClick={() => {
              clearTokens();
              router.push("/");
            }}
            className="rounded-full border border-white/40 px-3 py-1 font-bold hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {t("demoExit")}
          </button>
        </div>
      )}
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
          data-tour="page-content"
          inert={demoMode}
          className={`flex-1 p-4 sm:p-8 transition-all duration-300 ${
            showMobileNav ? "pb-20 md:pb-8" : ""
          }`}
        >
          {role === "Patient" && (
            <div className="mb-4 flex lg:hidden">
              <OfflinePill />
            </div>
          )}
          {children}
        </main>
      </div>

      {showMobileNav && <MobileBottomNav items={navItems} />}
      <HelpButton variant="floating" />
    </div>
    </SupportProvider>
    </TourProvider>
  );
}
