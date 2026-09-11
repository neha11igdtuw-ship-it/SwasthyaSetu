"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  LogIn,
  UserPlus,
  Search,
  X,
  LayoutDashboard,
  Mic,
  Calendar,
  FileText,
  Share2,
  Stethoscope,
  Pill,
  Clock,
  AlertOctagon,
  FileCheck,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { RoleType, RoleBadge } from "./RoleBadge";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { ThreeDotMenu } from "@/components/ThreeDotMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OfflinePill } from "@/components/shared/OfflinePill";
import { useLanguage } from "@/lib/i18n/languageContext";
import { isAuthenticated } from "@/lib/api/client";

interface SearchableRoute {
  title: string;
  category: string;
  href: string;
  keywords: string[];
  icon: React.ElementType;
}

// REAL existing routes in SwasthyaSetu codebase
const SEARCHABLE_ROUTES: SearchableRoute[] = [
  {
    title: "Nearby Hospitals / Facilities",
    category: "Facilities",
    href: "/patient/facilities",
    keywords: ["hospital", "facilities", "clinic", "sub-centre", "chc", "phc", "beds", "doctor availability", "rampur", "district hospital"],
    icon: Building2,
  },
  {
    title: "Tell Symptoms / Voice AI",
    category: "Symptoms",
    href: "/patient/voice-assistant",
    keywords: ["symptom", "voice", "audio", "ai", "headache", "fever", "pain", "speak", "tell symptoms", "checklist"],
    icon: Mic,
  },
  {
    title: "Book Appointment",
    category: "Care",
    href: "/patient/appointments",
    keywords: ["appointment", "book", "doctor visit", "opd", "schedule", "time", "date"],
    icon: Calendar,
  },
  {
    title: "My Health Records",
    category: "Records",
    href: "/patient/records",
    keywords: ["records", "mcp card", "vitals", "blood pressure", "weight", "anc", "pregnancy", "history"],
    icon: FileText,
  },
  {
    title: "Care Requests & Referrals",
    category: "Referrals",
    href: "/patient/referrals",
    keywords: ["referral", "transfer", "care request", "emergency transport", "hospital transfer"],
    icon: Share2,
  },
  {
    title: "Lab Tests & Diagnostics",
    category: "Diagnostics",
    href: "/patient/diagnostics",
    keywords: ["lab", "test", "blood test", "hemoglobin", "urine", "ultrasound", "diagnostics", "report"],
    icon: Stethoscope,
  },
  {
    title: "Medicines & Prescriptions",
    category: "Pharmacy",
    href: "/patient/medicines",
    keywords: ["medicine", "prescription", "iron", "folic acid", "calcium", "drugs", "pharmacy", "stock"],
    icon: Pill,
  },
  {
    title: "Next Visits & Follow-ups",
    category: "Schedule",
    href: "/patient/follow-ups",
    keywords: ["visit", "follow-up", "next visit", "schedule", "anc visit", "due date"],
    icon: Clock,
  },
  {
    title: "Emergency Help & Support",
    category: "Emergency",
    href: "/patient/emergency-help",
    keywords: ["emergency", "108", "102", "ambulance", "urgent", "help", "high risk"],
    icon: AlertOctagon,
  },
  {
    title: "Upload Health Documents",
    category: "Records",
    href: "/patient/documents",
    keywords: ["upload", "document", "report", "file", "photo", "prescription image"],
    icon: FileCheck,
  },
  // Health Worker Routes
  {
    title: "Health Worker Dashboard",
    category: "ASHA / ANM",
    href: "/hw/dashboard",
    keywords: ["health worker", "asha", "anm", "hw", "village", "sector"],
    icon: LayoutDashboard,
  },
  {
    title: "Register Patient",
    category: "ASHA / ANM",
    href: "/hw/patients/register",
    keywords: ["register", "add patient", "new patient", "maternal registration"],
    icon: UserPlus,
  },
  {
    title: "Urgent Attention / High Risk List",
    category: "ASHA / ANM",
    href: "/hw/high-risk",
    keywords: ["high risk", "urgent", "pre-eclampsia", "anemia", "critical"],
    icon: AlertTriangle,
  },
  // Doctor Routes
  {
    title: "Doctor Dashboard & Schedule",
    category: "Doctor",
    href: "/doctor/dashboard",
    keywords: ["doctor", "physician", "schedule", "review", "opd roster"],
    icon: Stethoscope,
  },
  // Facility Admin Routes
  {
    title: "Healthcare Facility Management",
    category: "Facility Staff",
    href: "/facility/dashboard",
    keywords: ["facility staff", "hospital admin", "beds", "stock", "inward care"],
    icon: Building2,
  },
];

interface TopBarProps {
  role?: RoleType;
  userName?: string;
  facilityOrLocation?: string;
}

export function TopBar({ role, userName, facilityOrLocation }: TopBarProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const [isAuth, setIsAuth] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchVisible, setIsMobileSearchVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check auth state safely in browser
  useEffect(() => {
    const checkAuth = () => {
      setIsAuth(isAuthenticated());
    };
    checkAuth();
    // Re-check on window focus or storage updates
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  // Filter routes based on query
  const searchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return SEARCHABLE_ROUTES.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchKeyword = item.keywords.some((kw) => kw.toLowerCase().includes(q));
      return matchTitle || matchCategory || matchKeyword;
    }).slice(0, 5); // Limit to top 5 results
  }, [searchQuery]);

  // Handle outside click to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation for search dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsSearchOpen(false);
      setSearchQuery("");
      searchInputRef.current?.blur();
      return;
    }

    if (!isSearchOpen || searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = searchResults[selectedIndex];
      if (target) {
        handleSelectRoute(target.href);
      }
    }
  };

  const handleSelectRoute = (href: string) => {
    setIsSearchOpen(false);
    setIsMobileSearchVisible(false);
    setSearchQuery("");
    router.push(href);
  };

  const localizedUserName =
    userName === "Priya Sharma"
      ? t("priyaSharmaName")
      : userName === "ANM Sunita Devi" || userName === "Sunita Devi"
      ? t("sunitaDeviWorker")
      : userName === "Dr. Ananya Rao"
      ? t("drAnanyaRao")
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
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-700 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Logo & Branding */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/"
            aria-label="SwasthyaSetu Home"
            className="flex items-center gap-2 group cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <Image
                src="/logo.jpg"
                alt="SwasthyaSetu Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="hidden min-[380px]:block">
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

        {/* Center: Search Bar (Desktop / Tablet) */}
        <div
          ref={searchContainerRef}
          className="relative flex-1 max-w-xs md:max-w-md hidden md:block"
        >
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              role="searchbox"
              aria-label="Search SwasthyaSetu"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
                setSelectedIndex(0);
              }}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search SwasthyaSetu (e.g. hospital, symptoms)..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchOpen(false);
                }}
                aria-label="Clear search query"
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-50 text-xs py-1 animate-in fade-in slide-in-from-top-1 duration-150">
              {searchResults.length > 0 ? (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/60">
                    Search Results ({searchResults.length})
                  </div>
                  {searchResults.map((item, idx) => {
                    const Icon = item.icon;
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={`${item.href}-${idx}`}
                        type="button"
                        onClick={() => handleSelectRoute(item.href)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-teal-50 dark:bg-teal-900/40 text-teal-900 dark:text-teal-200 font-bold"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg shrink-0 ${
                              isSelected
                                ? "bg-teal-700 text-white"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="truncate">{item.title}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 ml-2">
                          {item.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                  No matching services or pages found.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section: Mobile Search Toggle, Offline Badge, Language Selector, Auth Buttons & Menus */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Mobile Search Toggle Icon */}
          <button
            type="button"
            onClick={() => setIsMobileSearchVisible(!isMobileSearchVisible)}
            aria-label="Toggle search input"
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>

          {localizedUserName && (
            <div className="hidden xl:flex flex-col items-end">
              <span className="text-xs font-bold text-slate-900 dark:text-white">{localizedUserName}</span>
              {localizedLocation && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{localizedLocation}</span>
              )}
            </div>
          )}

          <div className="hidden lg:inline-flex items-center">
            <OfflinePill />
          </div>

          {/* Language Selector */}
          <LanguageSelector />

          {/* Theme Toggle */}
          <ThemeToggle />

          {!(isAuth || role || userName) && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200/80 dark:border-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <span>Login</span>
                <LogIn className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <span>Sign Up</span>
                <UserPlus className="w-3.5 h-3.5 text-teal-200" />
              </Link>
            </div>
          )}

          {/* Discovery Three-Dot Menu */}
          <ThreeDotMenu />
        </div>
      </div>

      {/* Mobile Search Row (Expands below header when search icon is clicked on mobile) */}
      {isMobileSearchVisible && (
        <div className="md:hidden mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search SwasthyaSetu (hospitals, symptoms)..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setIsMobileSearchVisible(false);
                setSearchQuery("");
              }}
              className="absolute right-2.5 p-1 text-slate-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Search Dropdown Results */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden text-xs py-1">
              {searchResults.length > 0 ? (
                searchResults.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={`mob-${item.href}-${idx}`}
                      type="button"
                      onClick={() => handleSelectRoute(item.href)}
                      className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
                          {item.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                        {item.category}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-center text-slate-500 text-xs">
                  No matching services found.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
