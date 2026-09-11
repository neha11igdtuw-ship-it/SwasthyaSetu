"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/languageContext";
import { LanguageOption } from "@/lib/i18n/translations";
import { Globe, Check, ChevronDown } from "lucide-react";

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Close on outside click and Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const options: {
    id: LanguageOption;
    buttonLabel: string;
    label: string;
    sublabel?: string;
  }[] = [
    { id: "en", buttonLabel: "English", label: "English" },
    { id: "hi", buttonLabel: "हिंदी", label: "हिंदी", sublabel: "Hindi" },
    { id: "mr", buttonLabel: "मराठी", label: "मराठी", sublabel: "Marathi" },
    {
      id: "local",
      buttonLabel: "Multilingual",
      label: "बहुभाषी / स्थानीय",
      sublabel: "Multilingual / Local language",
    },
  ];

  const currentOption = options.find((opt) => opt.id === language) || options[0];

  return (
    <div className={`relative inline-block text-left ${isOpen ? "z-50" : "z-10"}`} ref={selectorRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t("changeLanguage")}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold border border-slate-200/80 dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
      >
        <Globe className="w-4 h-4 text-teal-700 shrink-0" />
        <span>{currentOption.buttonLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 sm:w-64 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 space-y-1 text-xs z-50">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {t("changeLanguage")}
          </div>

          {options.map((opt) => {
            const isSelected = language === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setLanguage(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left cursor-pointer ${
                  isSelected
                    ? "bg-teal-50 dark:bg-teal-900/30 text-teal-900 font-bold border border-teal-200/80"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                }`}
              >
                <div>
                  <span className="block text-xs sm:text-sm">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      {opt.sublabel}
                    </span>
                  )}
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-teal-700 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
