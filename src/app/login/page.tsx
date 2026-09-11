"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useLanguage } from "@/lib/i18n/languageContext";
import { authApi, ApiError } from "@/lib/api/client";
import type { Role } from "@/lib/api/types";
import {
  User,
  HeartPulse,
  Stethoscope,
  Building2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from "lucide-react";

type RoleType = "patient" | "hw" | "doctor" | "facility";

const ROLE_TO_ROUTE: Record<Role, string> = {
  PATIENT: "/patient/dashboard",
  HEALTH_WORKER: "/hw/dashboard",
  DOCTOR: "/doctor/dashboard",
  FACILITY_STAFF: "/facility/dashboard",
  FACILITY_ADMIN: "/facility/dashboard",
  ADMIN: "/facility/dashboard",
};

// Demo credentials seeded by backend/seed/seed_data.py — used to prefill the form per role.
const DEMO_CREDENTIALS: Record<RoleType, { email: string; password: string }> = {
  hw: { email: "worker@swasthyasetu.dev", password: "ChangeMe123!" },
  doctor: { email: "doctor@swasthyasetu.dev", password: "ChangeMe123!" },
  facility: { email: "admin@swasthyasetu.dev", password: "ChangeMe123!" },
  patient: { email: "patient@swasthyasetu.dev", password: "Patient@123" },
};

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleType>("hw");
  const [identifier, setIdentifier] = useState(DEMO_CREDENTIALS.hw.email);
  const [accessCode, setAccessCode] = useState(DEMO_CREDENTIALS.hw.password);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = [
    {
      id: "patient" as RoleType,
      titleKey: "patient",
      descKey: "patientSpaceDesc",
      icon: User,
      route: "/patient/dashboard",
      accent: "teal",
    },
    {
      id: "hw" as RoleType,
      titleKey: "healthWorker",
      descKey: "hwSpaceDesc",
      icon: HeartPulse,
      route: "/hw/dashboard",
      accent: "teal",
    },
    {
      id: "doctor" as RoleType,
      titleKey: "doctor",
      descKey: "doctorSpaceDesc",
      icon: Stethoscope,
      route: "/doctor/dashboard",
      accent: "sky",
    },
    {
      id: "facility" as RoleType,
      titleKey: "healthcareFacility",
      descKey: "facilitySpaceDesc",
      icon: Building2,
      route: "/facility/dashboard",
      accent: "indigo",
    },
  ];

  const handleSelectRole = (roleId: RoleType) => {
    setSelectedRole(roleId);
    const creds = DEMO_CREDENTIALS[roleId];
    setIdentifier(creds.email);
    setAccessCode(creds.password);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.login({ email: identifier, password: accessCode });
      const me = await authApi.me();
      const route = ROLE_TO_ROUTE[me.role] || "/patient/dashboard";
      router.push(route);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Unable to reach the server. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6fafa] dark:bg-[#0b1a1f]">
      <TopBar />

      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center my-6">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700 shadow-md space-y-6">
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t("welcomeBack")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
              {t("chooseHowYouUse")}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Role Selection Cards Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                {t("chooseYourSpace")}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const isSelected = selectedRole === r.id;

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectRole(r.id)}
                      className={`p-4 rounded-2xl border transition-all text-left flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-teal-50/90 dark:bg-teal-900/30 border-teal-600 ring-2 ring-teal-500/20 shadow-xs"
                          : "bg-slate-50/60 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-teal-700 text-white"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                            {t(r.titleKey)}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5 line-clamp-2">
                          {t(r.descKey)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input fields */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. worker@swasthyasetu.dev"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Password"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-extrabold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{t("continueBtn")}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Additional Links & Demo Note */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 text-center space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 font-semibold text-teal-800">
              <Link href="/register" className="hover:underline">
                {t("createAccountTitle")}
              </Link>
              <span className="hidden sm:inline text-slate-300">•</span>
              <Link href="/" className="hover:underline text-slate-600 dark:text-slate-300">
                {t("backToHome")}
              </Link>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>{t("demoModeNote")}</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
