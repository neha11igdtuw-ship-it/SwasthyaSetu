"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/languageContext";
import { LanguageOption } from "@/lib/i18n/translations";
import { Globe, Check, Info } from "lucide-react";

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options: { id: LanguageOption; label: string; sublabel?: string }[] = [
    { id: "en", label: "English" },
    { id: "hi", label: "हिंदी", sublabel: "Hindi" },
    { id: "local", label: "Multilingual / Local language", sublabel: "Bhojpuri, Maithili, etc." },
  ];

  const currentLabel =
    options.find((opt) => opt.id === language)?.label || "English";

  const handleSelect = (id: LanguageOption) => {
    setLanguage(id);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left z-30" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change language"
        title="Change language / भाषा बदलें"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold transition-all shadow-2xs hover:border-teal-500"
      >
        <Globe className="w-4 h-4 text-teal-700 shrink-0" />
        <span className="max-w-[110px] sm:max-w-none truncate">{currentLabel}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-lg p-2 space-y-1 text-xs z-50">
          <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Select Preferred Language
          </div>

          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left ${
                language === opt.id
                  ? "bg-teal-50 text-teal-900 font-extrabold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div>
                <span className="block font-bold text-xs">{opt.label}</span>
                {opt.sublabel && (
                  <span className="block text-[10px] text-slate-500">{opt.sublabel}</span>
                )}
              </div>
              {language === opt.id && (
                <Check className="w-4 h-4 text-teal-700 shrink-0" />
              )}
            </button>
          ))}

          {language === "local" && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <span>More local languages coming soon</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
