"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { Upload, FileText, WifiOff, FileCheck } from "lucide-react";

export default function PatientDocumentsPage() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([
    "Mother_and_Child_Protection_Card_Priya.pdf",
    "Hemoglobin_Lab_Report_Sep4.jpg",
  ]);
  const [newFileName, setNewFileName] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const names = Array.from(e.target.files).map((f) => f.name);
      setSelectedFiles((prev) => [...prev, ...names]);
    }
  };

  const handleAddCustomMock = () => {
    if (newFileName.trim()) {
      setSelectedFiles((prev) => [...prev, newFileName]);
      setNewFileName("");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Upload Health Records & ANC Card"
        subtitle="Keep copies of physical reports and maternal health cards on this phone"
        roleBadge={<RoleBadge role="Patient" />}
      />

      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-emerald-700 shrink-0" />
        <span>Documents will be synchronised when connectivity is available.</span>
      </div>

      {/* Upload Component Box */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div className="p-8 border-2 border-dashed border-teal-300 rounded-2xl bg-teal-50/50 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-white border border-teal-200 text-teal-700 flex items-center justify-center mx-auto shadow-xs">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">
              Select or Take Photos of ANC Cards & Reports
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Supports photos or PDF documents
            </p>
          </div>

          <label className="inline-block px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs cursor-pointer transition-colors shadow-xs">
            <span>Choose File or Photo</span>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Add File manually */}
        <div className="pt-2 space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            Add Document Name:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="e.g. Ultrasound_Report_28Wks.pdf"
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={handleAddCustomMock}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold"
            >
              Add Record
            </button>
          </div>
        </div>

        {/* Selected Documents List */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-teal-700" />
            <span>Saved Records ({selectedFiles.length})</span>
          </h4>

          <div className="space-y-2">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-teal-700 shrink-0" />
                  <span className="font-bold text-slate-800">{file}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  Saved on Phone
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
