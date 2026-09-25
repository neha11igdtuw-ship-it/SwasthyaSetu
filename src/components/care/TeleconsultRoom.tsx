"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";

const JITSI_SCRIPT_SRC = "https://meet.jit.si/external_api.js";
const JITSI_DOMAIN = "meet.jit.si";

/** Deterministic room name derived from the appointment id — no schema change needed. */
export function teleconsultRoomName(appointmentId: string): string {
  const safeId = appointmentId.replace(/[^a-zA-Z0-9-]/g, "");
  return `swasthyasetu-appt-${safeId}`;
}

// Minimal shape of the Jitsi Meet External API we rely on.
interface JitsiMeetExternalAPI {
  dispose: () => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiMeetExternalAPI;
  }
}

let scriptLoadingPromise: Promise<void> | null = null;

function loadJitsiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${JITSI_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Jitsi Meet script.")));
      return;
    }
    const script = document.createElement("script");
    script.src = JITSI_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Jitsi Meet script."));
    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

interface TeleconsultRoomProps {
  appointmentId: string;
  displayName?: string;
  /** e.g. "en", "hi", "mr" — Jitsi supports a subset; falls back to English UI if unsupported. */
  preferredLanguage?: string;
}

export function TeleconsultRoom({ appointmentId, displayName, preferredLanguage }: TeleconsultRoomProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<JitsiMeetExternalAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadJitsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;

        const roomName = teleconsultRoomName(appointmentId);
        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          lang: preferredLanguage,
          userInfo: displayName ? { displayName } : undefined,
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            DEFAULT_REMOTE_DISPLAY_NAME: "Participant",
            TOOLBAR_BUTTONS: [
              "microphone",
              "camera",
              "closedcaptions",
              "desktop",
              "fullscreen",
              "hangup",
              "chat",
              "tileview",
            ],
          },
        });

        if (displayName) {
          api.executeCommand("displayName", displayName);
        }

        apiRef.current = api;
        setLoading(false);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || "Could not load the video consult.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [appointmentId, displayName, preferredLanguage]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          {t("teleconsultPublicServiceDisclaimer")}
        </span>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="relative w-full h-[70vh] min-h-[420px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700 bg-slate-900">
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white/80">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{t("teleconsultLoading")}</span>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
