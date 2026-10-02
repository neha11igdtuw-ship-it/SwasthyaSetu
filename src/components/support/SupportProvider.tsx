"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { HelpSupportPanel } from "./HelpSupportPanel";

interface SupportContextValue {
  open: () => void;
}

const SupportContext = createContext<SupportContextValue | null>(null);

/** Null outside the app shell, so help buttons simply do not render there. */
export function useSupport(): SupportContextValue | null {
  return useContext(SupportContext);
}

export function SupportProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <SupportContext.Provider value={value}>
      {children}
      {isOpen && <HelpSupportPanel onClose={close} />}
    </SupportContext.Provider>
  );
}
