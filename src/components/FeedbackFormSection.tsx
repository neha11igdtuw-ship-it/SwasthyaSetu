"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useLanguage } from "@/lib/i18n/languageContext";
import { getCurrentUserRole, isAuthenticated } from "@/lib/api/client";
import { db, OutboxItem } from "@/lib/offline/db";
import {
  MessageSquare,
  CheckCircle2,
  Send,
  Loader2,
  Upload,
  X,
  ImageIcon,
  AlertTriangle,
  FileCheck,
} from "lucide-react";

export interface FeedbackRecord {
  id: string;
  category: string;
  priority: "Urgent" | "High" | "Normal";
  submittingAs: string;
  description: string;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  attachmentDataUrl?: string | null; // Data URL preview/storage
  submittedAt: string;
  syncStatus: "synced" | "queued_offline";
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function FeedbackFormSection({ className = "" }: { className?: string }) {
  const { t } = useLanguage();

  const [category, setCategory] = useState("General Suggestion");
  const [priority, setPriority] = useState<"Urgent" | "High" | "Normal">("Normal");
  const [submittingAs, setSubmittingAs] = useState("Patient / Family Member");
  const [description, setDescription] = useState("");

  // Attachment state (Image preview before submission)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Status & History state
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<FeedbackRecord[]>([]);

  // Automatically derive 'Submitting As' role from auth context on load
  useEffect(() => {
    if (isAuthenticated()) {
      const jwtRole = getCurrentUserRole();
      if (jwtRole) {
        const roleMap: Record<string, string> = {
          PATIENT: "Patient / Family Member",
          HEALTH_WORKER: "Health Worker",
          DOCTOR: "Doctor",
          FACILITY_ADMIN: "Healthcare Facility / Hospital",
        };
        if (roleMap[jwtRole]) {
          setSubmittingAs(roleMap[jwtRole]);
        }
      }
    }
  }, []);

  // Load persistent history
  useEffect(() => {
    try {
      const saved = localStorage.getItem("swasthya_feedback_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Handle Image Selection with Validation
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFileError("Please select a supported image file (JPG, PNG, or WEBP).");
      e.target.value = "";
      return;
    }

    // Validate max size (5MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError("Image size is too large (Maximum allowed limit is 5MB).");
      e.target.value = "";
      return;
    }

    // Generate local preview URL (Does NOT upload immediately)
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Convert File to Base64 Data URL safely for local storage/offline reference
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      let attachmentDataUrl: string | null = null;
      if (selectedFile) {
        attachmentDataUrl = await fileToDataUrl(selectedFile);
      }

      const newRecord: FeedbackRecord = {
        id: `FB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        category,
        priority,
        submittingAs,
        description: description.trim(),
        attachmentName: selectedFile ? selectedFile.name : null,
        attachmentSize: selectedFile ? selectedFile.size : null,
        attachmentDataUrl,
        submittedAt: new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        syncStatus: navigator.onLine ? "synced" : "queued_offline",
      };

      // Queue offline outbox mutation if disconnected
      if (!navigator.onLine) {
        await db.outbox.add({
          type: "symptom_summary",
          title: `Feedback: ${category}`,
          payload: newRecord,
          status: "queued",
          createdAt: new Date().toISOString(),
        } as OutboxItem);
      }

      // Update local storage history
      const updatedHistory = [newRecord, ...history];
      setHistory(updatedHistory);
      try {
        localStorage.setItem("swasthya_feedback_history", JSON.stringify(updatedHistory));
      } catch {
        // Storage limit warning fallback
      }

      // Reset form on success
      setDescription("");
      handleRemoveImage();
      setSubmitting(false);
      setSuccessMsg(`Feedback submitted successfully (ID: ${newRecord.id}). Thank you!`);

      setTimeout(() => {
        setSuccessMsg(null);
      }, 7000);
    } catch {
      setSubmitting(false);
      setErrorMsg("Unable to submit feedback. Please try again.");
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700 shadow-md space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight">
              {t("feedbackTitle")}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mt-0.5 leading-relaxed">
              {t("feedbackSubtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-bold flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs sm:text-sm font-bold flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Category */}
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
              <option value="General Suggestion">General Suggestion / Feedback</option>
              <option value="High-Risk Patient Escalation">High-Risk Patient Escalation</option>
              <option value="Medical Supply / Shortage">Medical Supply / Medicine Shortage</option>
              <option value="Hospital Referral Issue">Hospital Referral Delay / Issue</option>
              <option value="Technical / App Support">Technical / App Support</option>
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label htmlFor="fb-priority" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Priority Level
            </label>
            <select
              id="fb-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as "Urgent" | "High" | "Normal")}
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Normal">Normal</option>
              <option value="High">High Priority</option>
              <option value="Urgent">Urgent (Immediate Support Required)</option>
            </select>
          </div>

          {/* Submitting As */}
          <div className="space-y-1.5">
            <label htmlFor="fb-role" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Submitting As
            </label>
            <select
              id="fb-role"
              value={submittingAs}
              onChange={(e) => setSubmittingAs(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Patient / Family Member">Patient / Family Member</option>
              <option value="Health Worker">Health Worker (ASHA / ANM)</option>
              <option value="Doctor">Doctor / Specialist</option>
              <option value="Healthcare Facility / Hospital">Healthcare Facility / Hospital</option>
            </select>
          </div>
        </div>

        {/* Description Field */}
        <div className="space-y-1.5">
          <label htmlFor="fb-description" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Detailed Feedback / Description
          </label>
          <textarea
            id="fb-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your issue, medical supply shortage, clinical concern, or feedback in detail..."
            required
            className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Optional Image Attachment Section */}
        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-700">
          <label htmlFor="fb-image-input" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Supporting Image (Optional)
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Add a screenshot or image if it helps explain your issue (JPG, PNG, or WEBP up to 5MB).
          </p>

          {fileError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {!selectedFile ? (
            <div>
              <label
                htmlFor="fb-image-input"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer transition-colors border border-slate-200/80 dark:border-slate-600"
              >
                <Upload className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <span>Choose Image</span>
              </label>
              <input
                id="fb-image-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 flex items-center gap-3.5 text-xs">
              {previewUrl && (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-teal-200 shrink-0 bg-slate-900">
                  <Image
                    src={previewUrl}
                    alt="Selected feedback screenshot preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                  <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                    {selectedFile.name}
                  </p>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  {formatFileSize(selectedFile.size)} · Ready to submit
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <label
                  htmlFor="fb-image-input"
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-[11px] cursor-pointer transition-colors"
                >
                  Replace
                </label>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 cursor-pointer"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting || !description.trim()}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Feedback</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Previously Submitted Feedback History */}
      {history.length > 0 && (
        <div className="pt-6 border-t border-slate-100 dark:border-slate-700 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Submitted Feedback Requests ({history.length})
          </h3>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">{item.id}</span>
                    <span className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200 text-[10px] font-bold">
                      {item.category}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Role: {item.submittingAs}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">{item.submittedAt}</span>
                </div>

                <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {item.description}
                </p>

                {item.attachmentName && (
                  <div className="flex items-center gap-2 text-[11px] text-teal-700 dark:text-teal-300 font-semibold pt-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Attachment: {item.attachmentName}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
