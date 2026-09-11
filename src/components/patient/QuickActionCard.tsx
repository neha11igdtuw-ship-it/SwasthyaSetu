import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";

interface QuickActionCardProps {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ElementType;
  badgeText?: string;
  accentColor?: "teal" | "amber" | "rose" | "indigo";
}

export function QuickActionCard({
  title,
  subtitle,
  href,
  icon: Icon,
  badgeText,
  accentColor = "teal",
}: QuickActionCardProps) {
  const { t } = useLanguage();

  const colorStyles = {
    teal: "bg-teal-50 dark:bg-teal-900/30 border-teal-100 text-teal-700 group-hover:bg-teal-700 group-hover:text-white",
    amber: "bg-amber-50 dark:bg-amber-900/30 border-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white",
    rose: "bg-rose-50 dark:bg-rose-900/30 border-rose-100 text-rose-700 group-hover:bg-rose-700 group-hover:text-white",
    indigo: "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 text-indigo-700 group-hover:bg-indigo-700 group-hover:text-white",
  };

  return (
    <Link
      href={href}
            className="group bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:shadow-md hover:border-teal-500/50 transition-all flex flex-col justify-between cursor-pointer"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${colorStyles[accentColor]}`}
          >
            <Icon className="w-5 h-5" />
          </div>
          {badgeText && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {badgeText}
            </span>
          )}
        </div>
        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm group-hover:text-teal-800 transition-colors">
          {title}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
          {subtitle}
        </p>
      </div>

      <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-teal-700 group-hover:text-teal-900">
        <span>{t("viewDetails")}</span>
        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
