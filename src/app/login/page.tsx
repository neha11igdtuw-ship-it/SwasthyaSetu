"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useLanguage } from "@/lib/i18n/languageContext";
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

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleType>("patient");
  const [identifier, setIdentifier] = useState("9876543210");
  const [accessCode, setAccessCode] = useState("1234");

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const roleObj = roles.find((r) => r.id === selectedRole);
    if (roleObj) {
      router.push(roleObj.route);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6fafa]">
      <TopBar />

      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center my-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6">
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t("welcomeBack")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              {t("chooseHowYouUse")}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Role Selection Cards Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
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
                          ? "bg-teal-50/90 border-teal-600 ring-2 ring-teal-500/20 shadow-xs"
                          : "bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-teal-700 text-white"
                            : "bg-white border border-slate-200 text-slate-600"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                            {t(r.titleKey)}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 leading-tight block mt-0.5 line-clamp-2">
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
                <label className="font-bold text-slate-700 block mb-1">
                  {t("mobileOrName")}
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 9876543210 or Priya Sharma"
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t("demoAccessCode")}
                </label>
                <input
                  type="text"
                  required
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="1234"
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>{t("continueBtn")}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Additional Links & Demo Note */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 font-semibold text-teal-800">
              <Link href="/register" className="hover:underline">
                {t("createAccountTitle")}
              </Link>
              <span className="hidden sm:inline text-slate-300">•</span>
              <Link href="/" className="hover:underline text-slate-600">
                {t("backToHome")}
              </Link>
            </div>

            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>{t("demoModeNote")}</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
