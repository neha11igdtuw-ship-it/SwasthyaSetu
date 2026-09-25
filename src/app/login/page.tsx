"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  KeyRound,
  Mail,
  Send,
} from "lucide-react";

type RoleType = "patient" | "hw" | "doctor" | "facility";
type LoginMode = "password" | "abha";

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

function LoginForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedRole, setSelectedRole] = useState<RoleType>("hw");
  const [identifier, setIdentifier] = useState(DEMO_CREDENTIALS.hw.email);
  const [accessCode, setAccessCode] = useState(DEMO_CREDENTIALS.hw.password);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  const [loginMode, setLoginMode] = useState<LoginMode>("password");
  const [abhaId, setAbhaId] = useState("");
  const [abhaOtp, setAbhaOtp] = useState("");
  const [abhaOtpSent, setAbhaOtpSent] = useState(false);
  const [abhaNote, setAbhaNote] = useState<string | null>(null);

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

  const isValidAbhaId = (value: string) => {
    const digitsOnly = value.replace(/-/g, "");
    return /^\d{14}$/.test(digitsOnly) || /^[\w.]+@abdm$/.test(value.trim());
  };

  const handleSendAbhaOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setAbhaNote(null);
    if (!isValidAbhaId(abhaId)) {
      setAbhaNote("Enter a valid 14-digit ABHA number or ABHA address (e.g. name@abdm).");
      return;
    }
    setAbhaOtpSent(true);
    setAbhaNote("OTP sent to your ABHA-linked mobile number.");
  };

  const handleVerifyAbhaOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (abhaOtp.trim().length !== 6) {
      setAbhaNote("Enter the 6-digit OTP sent to your registered mobile number.");
      return;
    }
    setAbhaNote(
      "ABHA verification requires live NHA/ABDM sandbox credentials, which aren't wired up in this demo yet. Please continue with email & password for now."
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginMode === "abha") {
      return abhaOtpSent ? handleVerifyAbhaOtp(e) : handleSendAbhaOtp(e);
    }
    setError(null);
    setNeedsVerification(false);
    setLoading(true);
    try {
      await authApi.login({ email: identifier, password: accessCode });
      const me = await authApi.me();
      const fallback = ROLE_TO_ROUTE[me.role] || "/patient/dashboard";
      const next = searchParams.get("next");
      const roleHome = fallback;
      const nextAllowed =
        next &&
        next.startsWith("/") &&
        !next.startsWith("//") &&
        (next.startsWith(roleHome.replace("/dashboard", "")) || next === roleHome);
      router.push(nextAllowed ? next : fallback);
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        setNeedsVerification(true);
        setError("Your email isn't verified yet. Check your inbox for the verification link.");
      } else if (err instanceof ApiError && err.code === "RATE_LIMITED") {
        const retryAfter = (err.details as { retry_after_seconds?: number } | undefined)
          ?.retry_after_seconds;
        setError(
          retryAfter
            ? `Too many attempts. Try again in ${retryAfter} seconds.`
            : "Too many attempts. Please try again later."
        );
      } else {
        const message =
          err instanceof ApiError ? err.message : "Unable to reach the server. Please try again.";
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendState === "sending") return;
    setResendState("sending");
    try {
      await authApi.resendVerification({ email: identifier });
    } finally {
      setResendState("sent");
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

            {/* Login mode switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/40">
              <button
                type="button"
                onClick={() => setLoginMode("password")}
                className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  loginMode === "password"
                    ? "bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Email &amp; Password
              </button>
              <button
                type="button"
                onClick={() => setLoginMode("abha")}
                className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  loginMode === "abha"
                    ? "bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Login with ABHA ID
              </button>
            </div>

            {loginMode === "password" ? (
              <>
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
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold space-y-2">
                    <p>{error}</p>
                    {needsVerification && (
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendState !== "idle"}
                        className="text-teal-800 dark:text-teal-300 font-bold underline disabled:opacity-60 cursor-pointer"
                      >
                        {resendState === "sent"
                          ? "Verification link sent — check your inbox"
                          : resendState === "sending"
                            ? "Sending…"
                            : "Resend verification link"}
                      </button>
                    )}
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
              </>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    ABHA Number / ABHA Address
                  </label>
                  <input
                    type="text"
                    required
                    value={abhaId}
                    onChange={(e) => {
                      setAbhaId(e.target.value);
                      setAbhaOtpSent(false);
                      setAbhaNote(null);
                    }}
                    placeholder="14-2345-6789-0123 or name@abdm"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                  />
                </div>

                {abhaOtpSent && (
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      OTP
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={abhaOtp}
                      onChange={(e) => setAbhaOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="6-digit OTP"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white tracking-widest"
                    />
                  </div>
                )}

                {abhaNote && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 text-amber-900 dark:text-amber-200 text-xs font-semibold">
                    {abhaNote}
                  </div>
                )}

                <button
                  type="button"
                  onClick={abhaOtpSent ? handleVerifyAbhaOtp : handleSendAbhaOtp}
                  className="w-full py-3.5 px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  {abhaOtpSent ? (
                    <>
                      <span>Verify &amp; Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send OTP</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                  ABHA (Ayushman Bharat Health Account) lets you sign in using your national health ID.
                </p>
              </div>
            )}
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
