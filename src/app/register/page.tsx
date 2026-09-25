"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { useLanguage } from "@/lib/i18n/languageContext";
import { authApi, ApiError } from "@/lib/api/client";
import type { Role } from "@/lib/api/types";
import { Loader2 } from "lucide-react";
import {
  User,
  HeartPulse,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Mail,
  Send,
} from "lucide-react";

type RoleType = "patient" | "hw";

const ROLE_TO_API: Record<RoleType, Role> = {
  patient: "PATIENT",
  hw: "HEALTH_WORKER",
};

const PHONE_RE = /^[6-9]\d{9}$/;
const PINCODE_RE = /^[1-9]\d{5}$/;

function normalizePhone(raw: string): string | null {
  let cleaned = raw.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+91")) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith("91") && cleaned.length === 12) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith("0") && cleaned.length === 11) cleaned = cleaned.slice(1);
  return PHONE_RE.test(cleaned) ? cleaned : null;
}

function passwordIssues(pw: string): string[] {
  const issues: string[] = [];
  if (pw.length < 8) issues.push("at least 8 characters");
  if (!/[A-Z]/.test(pw)) issues.push("an uppercase letter");
  if (!/[a-z]/.test(pw)) issues.push("a lowercase letter");
  if (!/[0-9]/.test(pw)) issues.push("a number");
  if (!/[!@#$%^&*()\-_=+[\]{};:,.<>?/|~`'"\\]/.test(pw)) issues.push("a special character");
  return issues;
}

type FieldErrors = Record<string, string>;

export default function RegisterPage() {
  const { t } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<RoleType>("patient");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [villageArea, setVillageArea] = useState("");
  const [cityDistrict, setCityDistrict] = useState("");
  const [stateField, setStateField] = useState("");
  const [pincode, setPincode] = useState("");
  const [landmark, setLandmark] = useState("");
  const [preferredLang, setPreferredLang] = useState("Hindi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "cooldown">("idle");
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const roles = [
    { id: "patient" as RoleType, titleKey: "patient", descKey: "patientSpaceDesc", icon: User },
    { id: "hw" as RoleType, titleKey: "healthWorker", descKey: "hwSpaceDesc", icon: HeartPulse },
  ];

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!fullName.trim()) errs.full_name = "Full name is required";
    if (!email.trim()) errs.email = "Email is required";
    const pwIssues = passwordIssues(password);
    if (pwIssues.length) errs.password = "Password must contain " + pwIssues.join(", ");
    if (password !== confirmPassword) errs.confirm_password = "Passwords do not match";
    if (!normalizePhone(mobile)) errs.phone = "Enter a valid 10-digit Indian mobile number.";
    if (!addressLine.trim()) errs.address_line = "House/street is required";
    if (!villageArea.trim()) errs.village_area = "Village/area is required";
    if (!cityDistrict.trim()) errs.city_district = "City/district is required";
    if (!stateField.trim()) errs.state = "State is required";
    if (!PINCODE_RE.test(pincode.trim())) errs.pincode = "Enter a valid 6-digit PIN code.";
    return errs;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const role = ROLE_TO_API[selectedRole];
      const phone = normalizePhone(mobile) as string;
      await authApi.register({
        email,
        password,
        full_name: fullName,
        role,
        phone,
        preferred_language: preferredLang,
        address: {
          address_line: addressLine,
          village_area: villageArea,
          city_district: cityDistrict,
          state: stateField,
          pincode: pincode.trim(),
          landmark: landmark || null,
        },
      });
      setRegisteredEmail(email);
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.details as { loc?: string[] }[] | undefined;
        if (Array.isArray(details)) {
          const backendErrs: FieldErrors = {};
          for (const d of details) {
            const field = d.loc?.[d.loc.length - 1];
            if (field && typeof field === "string") backendErrs[field] = err.message;
          }
          if (Object.keys(backendErrs).length) setFieldErrors(backendErrs);
        }
        setError(err.message);
      } else {
        setError("Could not create account. Try a different email.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail || resendState !== "idle") return;
    setResendState("sending");
    setResendMessage(null);
    try {
      await authApi.resendVerification({ email: registeredEmail });
      setResendMessage("If your account needs verification, a new link has been sent.");
    } catch {
      setResendMessage("Could not resend right now. Please try again shortly.");
    } finally {
      setResendState("cooldown");
      setTimeout(() => setResendState("idle"), 60_000);
    }
  };

  if (registeredEmail) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f6fafa] dark:bg-[#0b1a1f]">
        <TopBar />
        <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center my-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700 shadow-md space-y-6 text-center">
            <Mail className="w-10 h-10 text-teal-700 mx-auto" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Check your email
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              We&apos;ve sent a verification link to <strong>{registeredEmail}</strong>. Click it
              to activate your account, then come back to sign in.
            </p>
            {resendMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-900 text-xs font-semibold">
                {resendMessage}
              </div>
            )}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendState !== "idle"}
              className="w-full py-3 px-6 rounded-2xl bg-slate-100 dark:bg-slate-700 disabled:opacity-60 text-slate-800 dark:text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {resendState === "sending" ? "Sending…" : "Resend verification link"}
            </button>
            <Link
              href="/login"
              className="block text-teal-800 dark:text-teal-300 font-semibold text-sm hover:underline"
            >
              Go to sign in
            </Link>
          </div>
        </main>
      </div>
    );
  }

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
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Doctor and admin accounts are created by an administrator — contact your facility
                admin to get access.
              </p>
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
                {fieldErrors.full_name && (
                  <p className="text-rose-600 mt-1">{fieldErrors.full_name}</p>
                )}
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
                {fieldErrors.email && <p className="text-rose-600 mt-1">{fieldErrors.email}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                  />
                  {fieldErrors.password && (
                    <p className="text-rose-600 mt-1">{fieldErrors.password}</p>
                  )}
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                  />
                  {fieldErrors.confirm_password && (
                    <p className="text-rose-600 mt-1">{fieldErrors.confirm_password}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                />
                {fieldErrors.phone && <p className="text-rose-600 mt-1">{fieldErrors.phone}</p>}
              </div>

              <div className="pt-2 space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Address
                </label>
                <div>
                  <input
                    type="text"
                    required
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="House/flat number and street"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                  />
                  {fieldErrors.address_line && (
                    <p className="text-rose-600 mt-1">{fieldErrors.address_line}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      required
                      value={villageArea}
                      onChange={(e) => setVillageArea(e.target.value)}
                      placeholder="Village/area"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                    />
                    {fieldErrors.village_area && (
                      <p className="text-rose-600 mt-1">{fieldErrors.village_area}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      value={cityDistrict}
                      onChange={(e) => setCityDistrict(e.target.value)}
                      placeholder="City/district"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                    />
                    {fieldErrors.city_district && (
                      <p className="text-rose-600 mt-1">{fieldErrors.city_district}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      required
                      value={stateField}
                      onChange={(e) => setStateField(e.target.value)}
                      placeholder="State"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                    />
                    {fieldErrors.state && <p className="text-rose-600 mt-1">{fieldErrors.state}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="PIN code"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                    />
                    {fieldErrors.pincode && (
                      <p className="text-rose-600 mt-1">{fieldErrors.pincode}</p>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Landmark (optional)"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                />
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
