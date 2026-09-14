"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { db, DocumentRecord } from "@/lib/offline/db";
import {
  Upload,
  FileText,
  WifiOff,
  FileCheck,
  Check,
  X,
  Image as ImageIcon,
  Eye,
  Download,
  Trash2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

interface PendingFile {
  file: File;
  previewUrl: string | null;
}

interface ModalViewerState {
  doc: DocumentRecord;
  url: string;
  isImage: boolean;
  isPdf: boolean;
}

export default function PatientDocumentsPage() {
  const { t } = useLanguage();
  const [savedDocuments, setSavedDocuments] = useState<DocumentRecord[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  // View modal state
  const [activeViewer, setActiveViewer] = useState<ModalViewerState | null>(null);

  // Delete confirmation modal state
  const [deletingDoc, setDeletingDoc] = useState<DocumentRecord | null>(null);

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
      // Release object URLs created for pending previews on unmount
      pendingFiles.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup active viewer object URL when closed
  const closeViewer = () => {
    if (activeViewer) {
      URL.revokeObjectURL(activeViewer.url);
      setActiveViewer(null);
    }
  };

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

  // Helper to format file sizes nicely
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // View Record
  const handleViewRecord = (doc: DocumentRecord) => {
    const objectUrl = URL.createObjectURL(doc.blob);
    const isImage = doc.fileType.startsWith("image/");
    const isPdf = doc.fileType === "application/pdf" || doc.name.toLowerCase().endsWith(".pdf");

    setActiveViewer({
      doc,
      url: objectUrl,
      isImage,
      isPdf,
    });
  };

  // Download Record
  const handleDownloadRecord = (doc: DocumentRecord) => {
    const objectUrl = URL.createObjectURL(doc.blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  // Delete Record
  const handleConfirmDelete = async () => {
    if (!deletingDoc?.id) return;
    try {
      await db.documents.delete(deletingDoc.id);
      setDeletingDoc(null);
      await refreshDocuments();
    } catch (e) {
      console.error("Failed to delete document:", e);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="uploadHealthRecordsTitle"
        subtitle="uploadSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
        <span>{t("documentsSyncWhenOnline")}</span>
      </div>

      {/* Upload Component Box */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-6">
        <div className="p-8 border-2 border-dashed border-teal-300 dark:border-teal-700 rounded-2xl bg-teal-50/50 dark:bg-teal-900/20 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 text-teal-700 dark:text-teal-400 flex items-center justify-center mx-auto shadow-xs">
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
              <span>
                {t("previewBeforeSaving")} ({pendingFiles.length})
              </span>
            </h4>

            <div className="space-y-2">
              {pendingFiles.map((pending, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 flex items-center gap-3 text-xs"
                >
                  {pending.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pending.previewUrl}
                      alt={pending.file.name}
                      className="w-12 h-12 rounded-lg object-cover border border-amber-200 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-teal-700" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                      {pending.file.name}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {formatFileSize(pending.file.size)} · {t("pendingConfirmation")}
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
                    className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 cursor-pointer shrink-0"
                    aria-label={t("discardFile")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved Documents List with View, Download, Delete Actions */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-teal-700" />
              <span>
                {t("savedRecords")} ({savedDocuments.length})
              </span>
            </h4>
          </div>

          <div className="space-y-2.5">
            {savedDocuments.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">{t("noFileSelected")}</p>
            )}
            {savedDocuments.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-teal-200 dark:hover:border-teal-800 transition-colors shadow-2xs"
              >
                {/* File Title & Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-700/60 shrink-0">
                    {doc.fileType.startsWith("image/") ? (
                      <ImageIcon className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs md:text-sm">
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{formatFileSize(doc.size)}</span>
                      <span>•</span>
                      <span>
                        {new Date(doc.addedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Badge + Action Buttons (View, Download, Delete) */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 shrink-0">
                    {t("savedOnPhone")}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* View Button */}
                    <button
                      type="button"
                      onClick={() => handleViewRecord(doc)}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-700 font-extrabold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title={t("viewRecord")}
                    >
                      <Eye className="w-3.5 h-3.5 text-teal-700 dark:text-teal-300" />
                      <span>{t("viewRecord")}</span>
                    </button>

                    {/* Download Button */}
                    <button
                      type="button"
                      onClick={() => handleDownloadRecord(doc)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-extrabold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title={t("downloadRecord")}
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                      <span>{t("downloadRecord")}</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setDeletingDoc(doc)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 cursor-pointer transition-colors"
                      title={t("removeRecord")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* View Document Modal */}
      {activeViewer && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center gap-2.5 min-w-0 pr-4">
                <FileText className="w-5 h-5 text-teal-700 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                    {activeViewer.doc.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {formatFileSize(activeViewer.doc.size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadRecord(activeViewer.doc)}
                  className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t("downloadRecord")}</span>
                </button>
                <button
                  type="button"
                  onClick={closeViewer}
                  className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 cursor-pointer"
                  aria-label={t("closeViewer")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body Preview */}
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center min-h-[300px] bg-slate-100 dark:bg-slate-900">
              {activeViewer.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeViewer.url}
                  alt={activeViewer.doc.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
                />
              ) : activeViewer.isPdf ? (
                <iframe
                  src={activeViewer.url}
                  title={activeViewer.doc.name}
                  className="w-full h-[65vh] rounded-lg border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="text-center p-8 space-y-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-md">
                  <ExternalLink className="w-10 h-10 text-teal-700 mx-auto" />
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {t("cannotPreviewFile")}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDownloadRecord(activeViewer.doc)}
                    className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t("downloadRecord")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3 text-rose-700 dark:text-rose-400 font-extrabold text-base">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <span>{t("removeRecord")}</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {t("confirmRemoveRecord")} <br />
              <strong className="text-slate-900 dark:text-white block mt-1">
                &quot;{deletingDoc.name}&quot;
              </strong>
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
