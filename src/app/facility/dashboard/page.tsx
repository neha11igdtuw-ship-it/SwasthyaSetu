"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DashboardCard } from "@/components/DashboardCard";
import { useLanguage } from "@/lib/i18n/languageContext";
import {
  authApi,
  patientsApi,
  referralsApi,
  inventoryApi,
  facilitiesApi,
  ApiError,
} from "@/lib/api/client";
import type { InventoryItemOut, FacilityOut } from "@/lib/api/types";
import {
  Inbox,
  CheckCircle2,
  Users,
  PackageCheck,
  Loader2,
} from "lucide-react";

export default function FacilityDashboardPage() {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facilityName, setFacilityName] = useState<string>("All Facilities");
  const [patientCount, setPatientCount] = useState(0);
  const [pendingReferrals, setPendingReferrals] = useState(0);
  const [acceptedReferrals, setAcceptedReferrals] = useState(0);
  const [inventory, setInventory] = useState<InventoryItemOut[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const me = await authApi.me();

        const [patients, referrals] = await Promise.all([
          patientsApi.list(me.facility_id ?? undefined),
          referralsApi.list(),
        ]);

        let inv: InventoryItemOut[] = [];
        if (me.facility_id) {
          inv = await inventoryApi.list(me.facility_id);
        } else {
          // ADMIN has no single facility — aggregate inventory across all facilities.
          const facilities: FacilityOut[] = await facilitiesApi.list();
          const lists = await Promise.all(facilities.map((f) => inventoryApi.list(f.id)));
          inv = lists.flat();
        }

        if (me.facility_id) {
          const facility = await facilitiesApi.get(me.facility_id);
          if (!cancelled) setFacilityName(facility.name);
        }

        if (!cancelled) {
          setPatientCount(patients.length);
          setPendingReferrals(referrals.filter((r) => r.status === "PENDING" || r.status === "CREATED").length);
          setAcceptedReferrals(referrals.filter((r) => r.status === "ACCEPTED" || r.status === "IN_TRANSIT").length);
          setInventory(inv);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load facility dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={facilityName}
        subtitle={t("healthcareFacility")}
        roleBadge={<RoleBadge role="Healthcare Facility" />}
      />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm p-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading real facility data…
        </div>
      ) : (
        <>
          {/* Metric Cards Grid — real counts from /patients, /referrals, /inventory */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardCard
              title={t("newCareRequests")}
              value={pendingReferrals}
              subtitle={t("hwSpaceDesc")}
              icon={Inbox}
              highlight
            />

            <DashboardCard
              title={t("acceptedAndConfirmed")}
              value={acceptedReferrals}
              subtitle={t("waitingPatientVisit")}
              icon={CheckCircle2}
            />

            <DashboardCard
              title="Registered Patients"
              value={patientCount}
              subtitle="Facility-scoped total"
              icon={Users}
            />

            <DashboardCard
              title="Inventory Items"
              value={inventory.length}
              subtitle={`${inventory.filter((i) => i.quantity <= i.reorder_level).length} low stock`}
              icon={PackageCheck}
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Real inventory */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">Inventory Summary</h2>
                <span className="text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full w-fit">
                  {inventory.length} items
                </span>
              </div>

              {inventory.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
                  No inventory items recorded for this facility.
                </div>
              ) : (
                <div className="space-y-2">
                  {inventory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{item.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          SKU: {item.sku ?? "—"} • Unit: {item.unit ?? "—"}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded ${
                          item.quantity <= item.reorder_level
                            ? "bg-rose-100 text-rose-900 border border-rose-200"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                        }`}
                      >
                        {item.quantity} in stock (reorder at {item.reorder_level})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
