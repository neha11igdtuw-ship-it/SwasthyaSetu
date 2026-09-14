"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { ArrowLeft, MessageSquareHeart, Star, Send, CheckCircle2, Loader2 } from "lucide-react";

const CATEGORIES = [
  "General Suggestion",
  "App Experience",
  "Care / Treatment Experience",
  "Technical Issue",
  "Other",
];

export default function PatientFeedbackPage() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || rating === 0) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setMessage("");
      setRating(0);
      setCategory(CATEGORIES[0]);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <Link
        href="/patient/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:underline"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Dashboard
      </Link>

      <PageHeader
        title="Share Feedback"
        subtitle="Tell us how SwasthyaSetu is working for you"
        roleBadge={<RoleBadge role="Patient" />}
      />

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700 shadow-md space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 shrink-0">
            <MessageSquareHeart className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-white text-base">We&apos;d love to hear from you</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Your feedback helps us improve care for everyone.</p>
          </div>
        </div>

        {submitted ? (
          <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-900 dark:text-emerald-200 text-sm font-semibold flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Thank you! Your feedback has been submitted.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="fb-category" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Category
              </label>
              <select
                id="fb-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Rating</span>
              <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rating out of 5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        n <= (hoverRating || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "fill-transparent text-slate-300 dark:text-slate-600"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="fb-message" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Your message
              </label>
              <textarea
                id="fb-message"
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's working well or what we can improve..."
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-medium bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !message.trim() || rating === 0}
              className="w-full py-3.5 rounded-2xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-extrabold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
