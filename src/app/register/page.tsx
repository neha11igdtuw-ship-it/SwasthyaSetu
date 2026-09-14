"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useLanguage } from "@/lib/i18n/languageContext";
import { authApi, ApiError } from "@/lib/api/client";
import type { Role } from "@/lib/api/types";
import { Loader2 } from "lucide-react";
import {
  User,
  HeartPulse,
  Stethoscope,
  Building2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

type RoleType = "patient" | "hw" | "doctor" | "facility";

const ROLE_TO_API: Record<RoleType, Role> = {
  patient: "PATIENT",
  hw: "HEALTH_WORKER",
  doctor: "DOCTOR",
  facility: "FACILITY_STAFF",
};

const ROLE_TO_ROUTE: Record<Role, string> = {
  PATIENT: "/patient/dashboard",
  HEALTH_WORKER: "/hw/dashboard",
  DOCTOR: "/doctor/dashboard",
  FACILITY_STAFF: "/facility/dashboard",
  FACILITY_ADMIN: "/facility/dashboard",
  ADMIN: "/facility/dashboard",
};

export default function RegisterPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleType>("patient");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("9876543210");
  const [location, setLocation] = useState("Rampur Village");
  const [preferredLang, setPreferredLang] = useState("Hindi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const roles = [
    {
      id: "patient" as RoleType,
      titleKey: "patient",
      descKey: "patientSpaceDesc",
      icon: User,
      route: "/patient/dashboard",
    },
    {
      id: "hw" as RoleType,
      titleKey: "healthWorker",
      descKey: "hwSpaceDesc",
      icon: HeartPulse,
      route: "/hw/dashboard",
    },
    {
      id: "doctor" as RoleType,
      titleKey: "doctor",
      descKey: "doctorSpaceDesc",
      icon: Stethoscope,
      route: "/doctor/dashboard",
    },
    {
      id: "facility" as RoleType,
      titleKey: "healthcareFacility",
      descKey: "facilitySpaceDesc",
      icon: Building2,
      route: "/facility/dashboard",
    },
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const role = ROLE_TO_API[selectedRole];
      await authApi.register({
        email,
        password,
        full_name: fullName,
        role,
        phone: mobile,
        village: location,
        preferred_language: preferredLang,
      });
      await authApi.login({ email, password });
      setSuccess("Account created. Opening your dashboard…");
      router.push(ROLE_TO_ROUTE[role]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create account. Try a different email.");
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
              {t("createAccountHeader")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
              {t("chooseHowYouUse")}
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            {/* Role Cards */}
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
                      onClick={() => setSelectedRole(r.id)}
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

            {/* Registration Input Fields */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {t("fullNameLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t("mobileOrName")}
                  </label>
                  <input
                    type="text"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="9876543210"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t("locationField")}
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Rampur Village"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {t("preferredLanguageLabelFull")}
                </label>
                <select
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                >
                  <option value="English">English</option>
                  <option value="Hindi">हिंदी (Hindi)</option>
                  <option value="Marathi">मराठी (Marathi)</option>
                  <option value="Local">Multilingual / Local Language</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-900 text-xs font-semibold">
                {success}
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
                  <span>{t("createAccountTitle")}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Links & Demo Note */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 text-center space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 font-semibold text-teal-800">
              <Link href="/login" className="hover:underline">
                {t("alreadyHaveAccount")}
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
