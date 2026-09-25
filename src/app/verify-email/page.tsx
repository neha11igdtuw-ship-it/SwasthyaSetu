"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { authApi, ApiError } from "@/lib/api/client";
import { CheckCircle2, XCircle, Loader2, Send } from "lucide-react";

type Status = "verifying" | "success" | "error";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing a token.");
      return;
    }

    authApi
      .verifyEmail({ token })
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setMessage(
          err instanceof ApiError
            ? err.message
            : "This verification link is invalid or has expired."
        );
      });
  }, [token]);

  const handleResend = async () => {
    if (!email.trim() || resendState === "sending") return;
    setResendState("sending");
    try {
      await authApi.resendVerification({ email: email.trim() });
    } finally {
      setResendState("sent");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6fafa] dark:bg-[#0b1a1f]">
      <TopBar />
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center my-6">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700 shadow-md space-y-6 text-center">
          {status === "verifying" && (
            <>
              <Loader2 className="w-10 h-10 text-teal-700 mx-auto animate-spin" />
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Verifying your email…
              </h1>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Email verified
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Your account is active. You can now sign in.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full py-3.5 px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm transition-colors"
              >
                Go to sign in
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-10 h-10 text-rose-600 mx-auto" />
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Link invalid or expired
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
              <div className="space-y-2 text-left text-xs">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 dark:text-white"
                />
              </div>
              {resendState === "sent" ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
                  If your account needs verification, a new link has been sent.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendState === "sending" || !email.trim()}
                  className="w-full py-3 px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {resendState === "sending" ? "Sending…" : "Send me a new link"}
                </button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
