"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  LanguageOption,
  LanguageContextType,
  translationDictionary,
} from "./translations";

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LanguageOption>("en");

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("swasthyasetu-language") as LanguageOption | null;
    const supportedLanguages: LanguageOption[] = ["en", "hi", "kn", "ta", "ml", "te", "mr", "gu", "as", "or", "bn", "pa", "ur", "mni", "kok", "local"];
    if (savedLanguage && supportedLanguages.includes(savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("swasthyasetu-language", language);
    const languageTags: Record<LanguageOption, string> = {
      en: "en", hi: "hi", kn: "kn", ta: "ta", ml: "ml", te: "te", mr: "mr", gu: "gu",
      as: "as", or: "or", bn: "bn", pa: "pa", ur: "ur", mni: "mni", kok: "kok", local: "hi",
    };
    document.documentElement.lang = languageTags[language];
    document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
  }, [language]);

  const t = (key: string): string => {
    return translationDictionary[language]?.[key] || translationDictionary.en?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
