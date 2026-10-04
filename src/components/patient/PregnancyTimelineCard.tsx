"use client";

import React, { useEffect, useState } from "react";
import {
  Baby,
  Calendar,
  Stethoscope,
  Pill,
  Syringe,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { pregnanciesApi } from "@/lib/api/client";
import type { PregnancyTimelineOut } from "@/lib/api/types";

function Section({
  icon: Icon,
  title,
  items,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  items: string[];
  accent: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-4 h-4 ${accent}`} />
        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">{title}</span>
      </div>
      <ul className="space-y-1 pl-5">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-slate-600 dark:text-slate-300 list-disc">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PregnancyTimelineCard() {
  const [timeline, setTimeline] = useState<PregnancyTimelineOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    pregnanciesApi
      .myTimeline()
      .then((data) => {
        if (!cancelled) setTimeline(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load timeline");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-pink-200 shadow-sm flex items-center justify-center gap-2 text-slate-500 text-sm">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading your pregnancy timeline…
      </div>
    );
  }

  // No pregnancy_week recorded yet — nothing to show, not an error for the patient.
  if (error || !timeline) return null;

  const progressPct = Math.round((timeline.current_week / timeline.total_weeks) * 100);

  return (
    <div
      data-tour="pregnancy-timeline"
      className="bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/30 dark:to-slate-800 rounded-3xl p-6 sm:p-8 border-2 border-pink-300/80 shadow-md space-y-6"
    >
      {/* Current week — prominent */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pink-200/70 dark:border-pink-900/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-pink-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Baby className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-pink-700 block">
              Trimester {timeline.trimester}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Week {timeline.current_week}{" "}
              <span className="text-sm font-semibold text-slate-500">of {timeline.total_weeks}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {timeline.weeks_remaining} weeks remaining (estimate)
            </p>
          </div>
        </div>

        <div className="bg-pink-100 dark:bg-pink-900/40 border border-pink-300 rounded-xl px-4 py-2.5 text-center">
          <span className="text-[10px] font-bold uppercase text-pink-700 block">Next ANC Visit</span>
          <span className="text-sm font-extrabold text-pink-900 dark:text-pink-200">
            {timeline.next_anc_visit}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 rounded-full bg-pink-100 dark:bg-pink-900/40 overflow-hidden">
          <div
            className="h-full bg-pink-600 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* What she needs to do next */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Section
          icon={Stethoscope}
          title="Required check-ups & tests"
          items={timeline.checkups}
          accent="text-teal-700"
        />
        <Section
          icon={Pill}
          title="Medicine & supplement reminders"
          items={timeline.medicines}
          accent="text-indigo-700"
        />
        <Section
          icon={Syringe}
          title="Vaccination reminders"
          items={timeline.vaccinations}
          accent="text-amber-700"
        />
        <Section
          icon={AlertTriangle}
          title="Warning signs — contact care team immediately"
          items={timeline.warning_signs}
          accent="text-rose-700"
        />
      </div>

      {/* Pending / completed actions */}
      {(timeline.pending_actions.length > 0 || timeline.completed_actions.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-pink-200/70 dark:border-pink-900/50">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                Pending actions ({timeline.pending_actions.length})
              </span>
            </div>
            {timeline.pending_actions.length === 0 ? (
              <p className="text-xs text-slate-500 pl-5">Nothing pending right now.</p>
            ) : (
              <ul className="space-y-1 pl-5">
                {timeline.pending_actions.map((a) => (
                  <li key={a.id} className="text-xs text-slate-600 dark:text-slate-300 list-disc">
                    {a.description || a.gap_type.replace(/_/g, " ")}
                    {a.due_date && (
                      <span className="text-amber-700 font-semibold"> — due {a.due_date}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                Completed ({timeline.completed_actions.length})
              </span>
            </div>
            {timeline.completed_actions.length === 0 ? (
              <p className="text-xs text-slate-500 pl-5">No completed actions yet.</p>
            ) : (
              <ul className="space-y-1 pl-5">
                {timeline.completed_actions.map((a) => (
                  <li key={a.id} className="text-xs text-slate-500 line-through list-disc">
                    {a.description || a.gap_type.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <Calendar className="w-3.5 h-3.5" />
        General antenatal-care guidance. Your health worker or doctor may adjust this for your specific case.
      </div>
    </div>
  );
}
