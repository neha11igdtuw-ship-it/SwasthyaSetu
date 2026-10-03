"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LogIn,
  UserPlus,
  Search,
  LayoutDashboard,
  MessageSquare,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { RoleType, RoleBadge } from "./RoleBadge";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { ThreeDotMenu } from "@/components/ThreeDotMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HelpButton } from "@/components/support/HelpButton";
import { OfflinePill } from "@/components/shared/OfflinePill";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { UserProfileAvatarMenu } from "@/components/UserProfileAvatarMenu";
import { useLanguage } from "@/lib/i18n/languageContext";
import { useRouter } from "next/navigation";
import { getCurrentUserRole, isAuthenticated, clearTokens, AUTH_CHANGED_EVENT } from "@/lib/api/client";
import { dashboardPathForJwtRole, resolveSearchAudience } from "@/lib/search/searchService";

interface TopBarProps {
  landing?: boolean;
  role?: RoleType;
  userName?: string;
  facilityOrLocation?: string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

const SHELL_DASHBOARD_ROUTES: Record<RoleType, string> = {
  Patient: "/patient/dashboard",
  "Health Worker": "/hw/dashboard",
  Doctor: "/doctor/dashboard",
  "Healthcare Facility": "/facility/dashboard",
};

export function TopBar({
  landing = false,
  role,
  userName,
  facilityOrLocation,
  onToggleSidebar,
  isSidebarOpen,
}: TopBarProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const [isAuth, setIsAuth] = useState(false);
  const [jwtRole, setJwtRole] = useState<string | null>(null);
  const [isMobileSearchVisible, setIsMobileSearchVisible] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsAuth(authenticated);
      setJwtRole(authenticated ? getCurrentUserRole() : null);
    };
    checkAuth();
    window.addEventListener("storage", checkAuth);
    window.addEventListener("focus", checkAuth);
    window.addEventListener(AUTH_CHANGED_EVENT, checkAuth);
    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("focus", checkAuth);
      window.removeEventListener(AUTH_CHANGED_EVENT, checkAuth);
    };
  }, []);

  const handleLogout = () => {
    clearTokens();
    setIsAuth(false);
    setJwtRole(null);
    router.replace("/login");
  };

  const inAppShell = Boolean(role || userName);
  const showSignedOutActions = !isAuth && !inAppShell;
  const showDashboardShortcut = isAuth || inAppShell;
  const searchAudience = resolveSearchAudience({ jwtRole, shellRole: role });
  const dashboardHref =
    dashboardPathForJwtRole(jwtRole) || (role ? SHELL_DASHBOARD_ROUTES[role] : "/patient/dashboard");

  const localizedUserName =
    userName === "Priya Sharma"
      ? t("priyaSharmaName")
      : userName === "ANM Sunita Devi" || userName === "Sunita Devi"
      ? t("sunitaDeviWorker")
      : userName === "Dr. Ananya Rao" || userName === "Dr. Meera Singh"
      ? t("drMeeraSingh")
      : userName
      ? t(userName)
      : undefined;

  let localizedLocation = facilityOrLocation;
  if (facilityOrLocation) {
    if (facilityOrLocation.includes("Rampur Village")) {
      localizedLocation = facilityOrLocation
        .replace("Rampur Village", t("rampurLocation"))
        .replace("Pregnancy W28", t("pregnancyWeek28Text"));
    } else if (facilityOrLocation.includes("Sub-Centre Rampur")) {
      localizedLocation = facilityOrLocation.replace("Sub-Centre Rampur", t("subCentreRampur"));
    } else if (facilityOrLocation.includes("District Civil Hospital")) {
      localizedLocation = facilityOrLocation.replace(
        "District Civil Hospital & Maternal Care Centre",
        t("districtHospitalName")
      );
    }
  }

  return (
    <header data-landing-header={landing ? "true" : undefined} className={`sticky top-0 z-30 backdrop-blur-sm px-3 sm:px-6 ${landing ? "bg-white/95 text-slate-900 border-b border-slate-200/80 py-2.5 dark:bg-[#10192c] dark:text-white dark:border-white/5" : "bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-700 py-2.5"}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3 lg:gap-5">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label={isSidebarOpen ? t("closeMenu") : t("openMenu")}
              title={isSidebarOpen ? t("closeSidebarMenu") : t("openSidebarMenu")}
              className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/40 hover:bg-teal-100 dark:hover:bg-teal-900/70 text-teal-800 dark:text-teal-200 transition-all border border-teal-200/80 dark:border-teal-700/60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 flex items-center justify-center shadow-2xs"
            >
              {isSidebarOpen ? (
                <X className="w-5 h-5 text-teal-800 dark:text-teal-200" />
              ) : (
                <Menu className="w-5 h-5 text-teal-800 dark:text-teal-200" />
              )}
            </button>
          )}

          <Link
            href="/"
            aria-label={t("appHome")}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <Image
                src="/logo.jpg"
                alt={t("appLogo")}
                width={40}
                height={40}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white block leading-none">
                {t("appName")}
              </span>
              <span className="text-[9px] sm:text-[10px] text-teal-700 dark:text-teal-400 font-semibold tracking-wide uppercase">
                {t("platformSubtitle")}
              </span>
            </div>
          </Link>

          {role && <RoleBadge role={role} />}
        </div>

        <div className={`relative flex-1 max-w-xs md:max-w-md hidden lg:block min-w-0 ${landing ? "invisible" : ""}`}>
          <GlobalSearch audience={searchAudience} variant="desktop" />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsMobileSearchVisible((open) => !open)}
            aria-label={isMobileSearchVisible ? t("closeSearch") : t("openSearch")}
            aria-expanded={isMobileSearchVisible}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
          </button>

          {localizedUserName && role && role !== "Patient" && role !== "Health Worker" && (
            <div className="hidden xl:flex flex-col items-end min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[12rem]">
                {localizedUserName}
              </span>
              {localizedLocation && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[12rem]">
                  {localizedLocation}
                </span>
              )}
            </div>
          )}

          <div className="hidden lg:inline-flex items-center">
            <OfflinePill className={landing ? "dark:!bg-emerald-950/70 dark:!border-teal-700 dark:!text-teal-100" : ""} />
          </div>

          {!landing && <HelpButton variant="header" />}
          <LanguageSelector bilingualIcon={landing} />
          <div className="hidden sm:inline-flex">
            <ThemeToggle />
          </div>

          {!landing && <Link
            href="/#feedback-section"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200/80 dark:border-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <MessageSquare className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
            <span className="hidden sm:inline">{t("feedbackTitle")}</span>
            <span className="sm:hidden">{t("feedbackTitle")}</span>
          </Link>}

          {showSignedOutActions ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 ${landing ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-600" : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700"}`}
              >
                <LogIn className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" aria-hidden="true" />
                <span>{t("signInTitle")}</span>
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <UserPlus className="w-3.5 h-3.5 text-teal-200" aria-hidden="true" />
                <span>{t("createAccountTitle")}</span>
              </Link>
            </div>
          ) : showDashboardShortcut ? (
            <div className="flex items-center gap-2">
              <UserProfileAvatarMenu
                userName={localizedUserName || "Your account"}
                role={role || "Patient"}
                facilityOrLocation={localizedLocation || ""}
                dashboardHref={dashboardHref}
                onLogout={handleLogout}
              />
            </div>
          ) : null}

          <ThreeDotMenu isAuthenticated={isAuth || inAppShell} />
        </div>
      </div>

      {landing && (
        <nav aria-label={t("mainNavigation")} className="-mx-3 mt-1 bg-[#0f766e] px-3 dark:bg-[#00433f] sm:-mx-6 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-end gap-8 py-3 text-sm font-semibold text-white">
            <Link href="/" className="hover:text-teal-300">{t("home")}</Link>
            <Link href="/#about-us" className="hover:text-teal-300">{t("aboutUsNav")}</Link>
            <Link href="/#care-journey" className="hover:text-teal-300">{t("howItWorksNav")}</Link>
            <Link href="/#feedback-section" className="hover:text-teal-300">{t("supportNav")}</Link>
            <Link href="/#feedback-section" className="hover:text-teal-300">{t("feedbackNav")}</Link>
          </div>
        </nav>
      )}

      {showSignedOutActions ? (
        <div className="sm:hidden max-w-7xl mx-auto mt-2 flex items-center gap-2">
          <Link
            href="/login"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200/80 dark:border-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <LogIn className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" aria-hidden="true" />
                <span>{t("signInTitle")}</span>
          </Link>
          <Link
            href="/register"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <UserPlus className="w-3.5 h-3.5 text-teal-200" aria-hidden="true" />
                <span>{t("createAccountTitle")}</span>
          </Link>
        </div>
      ) : showDashboardShortcut ? (
        <div className="sm:hidden max-w-7xl mx-auto mt-2 flex items-center gap-2">
          <Link
            href={dashboardHref}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-teal-200" aria-hidden="true" />
            <span>{t("dashboard")}</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200/80 dark:border-slate-700 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("signOut")}</span>
          </button>
        </div>
      ) : null}

      {isMobileSearchVisible && (
        <div className="lg:hidden mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <GlobalSearch
            audience={searchAudience}
            variant="mobile"
            onCloseMobile={() => setIsMobileSearchVisible(false)}
          />
        </div>
      )}
    </header>
  );
}
