"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { db, DocumentRecord } from "@/lib/offline/db";
import { Upload, FileText, WifiOff, FileCheck, Check, X, Image as ImageIcon } from "lucide-react";

interface PendingFile {
  file: File;
  previewUrl: string | null;
}

export default function PatientDocumentsPage() {
  const { t } = useLanguage();
  const [savedDocuments, setSavedDocuments] = useState<DocumentRecord[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const refreshDocuments = async () => {
    try {
      const docs = await db.documents.orderBy("addedAt").reverse().toArray();
      setSavedDocuments(docs);
    } catch (e) {
      console.warn("Error loading saved documents:", e);
    }
  };

  useEffect(() => {
    refreshDocuments();
    return () => {
      // Release object URLs created for pending previews on unmount.
      pendingFiles.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPending: PendingFile[] = Array.from(e.target.files).map((file) => ({
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      }));
      setPendingFiles((prev) => [...prev, ...newPending]);
    }
    e.target.value = "";
  };

  const handleConfirmFile = async (idx: number) => {
    const pending = pendingFiles[idx];
    if (!pending) return;

    await db.documents.add({
      name: pending.file.name,
      fileType: pending.file.type || "application/octet-stream",
      size: pending.file.size,
      blob: pending.file,
      addedAt: new Date().toISOString(),
    });

    if (pending.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
    await refreshDocuments();
  };

  const handleDiscardFile = (idx: number) => {
    const pending = pendingFiles[idx];
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="uploadHealthRecordsTitle"
        subtitle="uploadSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-emerald-700 shrink-0" />
        <span>{t("documentsSyncWhenOnline")}</span>
      </div>

      {/* Upload Component Box */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-6">
        <div className="p-8 border-2 border-dashed border-teal-300 rounded-2xl bg-teal-50/50 dark:bg-teal-900/30 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto shadow-xs">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              {t("selectOrTakePhotosAnc")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t("supportsPhotosPdf")}
            </p>
          </div>

          <label className="inline-block px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs cursor-pointer transition-colors shadow-xs">
            <span>{t("chooseFileOrPhoto")}</span>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Pending files awaiting confirmation */}
        {pendingFiles.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-600" />
              <span>{t("previewBeforeSaving")} ({pendingFiles.length})</span>
            </h4>

            <div className="space-y-2">
              {pendingFiles.map((pending, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200 flex items-center gap-3 text-xs"
                >
                  {pending.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pending.previewUrl}
                      alt={pending.file.name}
                      className="w-12 h-12 rounded-lg object-cover border border-amber-200 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-teal-700" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{pending.file.name}</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {(pending.file.size / 1024).toFixed(0)} KB · {t("pendingConfirmation")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleConfirmFile(idx)}
                    className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shrink-0"
                    aria-label={t("confirmAndSave")}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDiscardFile(idx)}
                    className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 cursor-pointer shrink-0"
                    aria-label={t("discardFile")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved Documents List */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
          <h4 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-teal-700" />
            <span>{t("savedRecords")} ({savedDocuments.length})</span>
          </h4>

          <div className="space-y-2">
            {savedDocuments.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">{t("noFileSelected")}</p>
            )}
            {savedDocuments.map((doc) => (
              <div
                key={doc.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {doc.fileType.startsWith("image/") ? (
                    <ImageIcon className="w-4 h-4 text-teal-700 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-teal-700 shrink-0" />
                  )}
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{doc.name}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-0.5 rounded border border-emerald-200 shrink-0">
                  {t("savedOnPhone")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
