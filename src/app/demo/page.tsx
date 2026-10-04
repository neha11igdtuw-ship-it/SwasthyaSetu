"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, HeartPulse, Stethoscope, UserRound, ArrowRight, ShieldCheck, LoaderCircle } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { useLanguage } from "@/lib/i18n/languageContext";
import { authApi, ApiError } from "@/lib/api/client";
import { DEMO_ACCOUNTS, type DemoAccountKey } from "@/lib/demo/demoAccounts";

const spaces = [
  { id: "patient", role: "patient", title: "patient", description: "patientSpaceDesc", icon: UserRound },
  { id: "hw", role: "hw", title: "healthWorker", description: "hwSpaceDesc", icon: HeartPulse },
  { id: "doctor", role: "doctor", title: "doctor", description: "doctorSpaceDesc", icon: Stethoscope },
  { id: "facility", role: "facility", title: "healthcareFacility", description: "facilitySpaceDesc", icon: Building2 },
] as const;

export default function DemoPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [startingRole, setStartingRole] = useState<DemoAccountKey | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const startDemo = async (role: DemoAccountKey) => {
    if (startingRole) return;
    setStartingRole(role);
    setLaunchError(null);
    try {
      const account = DEMO_ACCOUNTS[role];
      await authApi.login({ email: account.email, password: account.password });
      window.sessionStorage.setItem("ss_demo_mode", "1");
      router.replace(account.dashboard);
    } catch (error) {
      setLaunchError(
        error instanceof ApiError && error.status === 0
          ? t("networkUnavailable")
          : error instanceof Error
            ? error.message
            : t("networkUnavailable")
      );
      setStartingRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4fbf8] text-slate-900 dark:bg-[#0b1a1f] dark:text-slate-100">
      <TopBar landing />
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <header className="mx-auto max-w-3xl text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            {t("demoBannerTitle")}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {t("demoBannerDescription")}
          </p>
          <p className="mt-3 text-sm font-semibold text-teal-800 dark:text-teal-200">
            {t("demoModeNote")}
          </p>
        </header>

        <section className="mt-9 grid gap-4 sm:grid-cols-2" aria-label={t("demoChooseRole")}>
          {spaces.map(({ id, title, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => startDemo(id)}
              disabled={startingRole !== null}
              aria-busy={startingRole === id}
              className="group flex min-h-36 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:cursor-wait disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-teal-700 sm:p-6"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-800 group-hover:bg-teal-700 group-hover:text-white dark:bg-slate-800 dark:text-teal-200">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold text-slate-900 dark:text-white">{t(title)}</span>
                <span className="mt-1 block text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t(description)}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-teal-800 dark:text-teal-300">
                  {startingRole === id ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <>{t("demoTryDemo")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></>
                  )}
                </span>
              </span>
            </button>
          ))}
        </section>

        {launchError && (
          <p role="alert" className="mx-auto mt-5 max-w-2xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {launchError}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">{t("demoTourRoleDescription")}</p>
      </main>
    </div>
  );
}
