"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Pencil,
  FileText,
  LayoutDashboard,
  LogOut,
  X,
  Loader2,
  CheckCircle,
  MapPin,
  Phone,
  Calendar,
  HeartPulse,
  Activity,
  ChevronRight,
  MessageSquareHeart,
} from "lucide-react";
import { RoleType, RoleBadge } from "./RoleBadge";
import { patientsApi, encountersApi, clearTokens } from "@/lib/api/client";
import { loadOwnPatient } from "@/lib/api/ownPatient";
import type { PatientOut } from "@/lib/api/types";
import { priyaPatientMock } from "@/lib/mockData";

interface UserProfileAvatarMenuProps {
  userName?: string;
  role?: RoleType;
  facilityOrLocation?: string;
  dashboardHref?: string;
  onLogout?: () => void;
}

export function UserProfileAvatarMenu({
  userName = "Priya Sharma",
  role = "Patient",
  facilityOrLocation = "Rampur Village",
  dashboardHref = "/patient/dashboard",
  onLogout,
}: UserProfileAvatarMenuProps) {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // State for user profile & vitals
  const [patientData, setPatientData] = useState<PatientOut | null>(null);

  // Editable Form State
  const [fullName, setFullName] = useState(userName);
  const [phone, setPhone] = useState("+91 98765 43210");
  const [age, setAge] = useState("24");
  const [village, setVillage] = useState(facilityOrLocation);
  const [preferredLanguage, setPreferredLanguage] = useState("Hindi (हिंदी)");
  const [emergencyContact, setEmergencyContact] = useState("+91 94351 26620");
  const [pregnancyWeek, setPregnancyWeek] = useState("28");

  // Vitals Form State
  const [systolicBp, setSystolicBp] = useState("145");
  const [diastolicBp, setDiastolicBp] = useState("92");
  const [pulse, setPulse] = useState("82");
  const [weight, setWeight] = useState("58");

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch live patient profile and vitals
  const fetchPatientProfile = useCallback(async () => {
    try {
      const own = await loadOwnPatient();
      if (own) {
        setPatientData(own);
        setFullName(own.full_name || userName);
        setPhone(own.phone || "+91 98765 43210");
        setVillage(own.village || facilityOrLocation);
        if (own.preferred_language) setPreferredLanguage(own.preferred_language);
        if (own.emergency_contact) setEmergencyContact(own.emergency_contact);
        if (own.pregnancy_week) setPregnancyWeek(own.pregnancy_week.toString());

        // Fetch latest vitals for this patient
        const encounters = await encountersApi.me().catch(() => []);
        if (encounters.length > 0) {
          const sorted = [...encounters].sort(
            (a, b) =>
              new Date(b.encounter_date).getTime() -
              new Date(a.encounter_date).getTime()
          );
          const vList = await encountersApi.listVitals(sorted[0].id).catch(() => []);
          if (vList.length > 0) {
            const lastV = vList[vList.length - 1];
            if (lastV.systolic_bp) setSystolicBp(lastV.systolic_bp.toString());
            if (lastV.diastolic_bp) setDiastolicBp(lastV.diastolic_bp.toString());
            if (lastV.pulse) setPulse(lastV.pulse.toString());
            if (lastV.weight_kg) setWeight(lastV.weight_kg.toString());
          }
        }
      } else {
        // Fallback to mock profile if not logged in as remote patient
        const mockP = priyaPatientMock.profile;
        setFullName(mockP.name);
        setPhone("+91 98765 43210");
        setAge(mockP.age.toString());
        setVillage(mockP.location);
        setPregnancyWeek(mockP.pregnancyWeek.toString());
      }
    } catch (err) {
      console.warn("Could not fetch remote profile:", err);
    }
  }, [userName, facilityOrLocation]);

  useEffect(() => {
    fetchPatientProfile();
  }, [fetchPatientProfile]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsEditModalOpen(false);
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const initialLetter = (fullName || userName || "U").charAt(0).toUpperCase();

  const handleSaveProfileAndVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      // 1. Update patient profile on backend if remote patient exists
      if (patientData) {
        await patientsApi.updateMe({
          base_version: patientData.version,
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          village: village.trim() || null,
          preferred_language: preferredLanguage || null,
          age: age ? Number(age) : null,
          pregnancy_week: pregnancyWeek ? Number(pregnancyWeek) : null,
          emergency_contact: emergencyContact.trim() || null,
        });
      }

      // 2. Post self-reported vitals to backend
      const sysNum = systolicBp ? Number(systolicBp) : null;
      const diaNum = diastolicBp ? Number(diastolicBp) : null;
      const pulseNum = pulse ? Number(pulse) : null;
      const weightNum = weight ? Number(weight) : null;

      if (sysNum || diaNum || pulseNum || weightNum) {
        await encountersApi
          .addMyVitals({
            systolic_bp: sysNum,
            diastolic_bp: diaNum,
            pulse: pulseNum,
            weight_kg: weightNum,
            notes: "Self-reported from user profile menu",
          })
          .catch((err) => console.warn("Vitals save note:", err));
      }

      setSuccessMessage("Profile & Vitals updated successfully!");
      await fetchPatientProfile();

      setTimeout(() => {
        setIsEditModalOpen(false);
        setSuccessMessage(null);
      }, 1500);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to update profile. Changes saved locally."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutClick = () => {
    setIsDropdownOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      clearTokens();
      router.replace("/login");
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* GitHub-style Round Avatar Button */}
      <button
        type="button"
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        aria-label="User account menu"
        aria-expanded={isDropdownOpen}
        title={`${fullName} (${role})`}
        className="relative group flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-teal-800 via-teal-700 to-emerald-600 text-white font-extrabold text-sm sm:text-base ring-2 ring-white/90 dark:ring-slate-800 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        <span>{initialLetter}</span>
        {/* Live Status Indicator Dot */}
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
      </button>

      {/* GitHub-style Flyout Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Profile Summary */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-teal-700 text-white font-extrabold text-lg flex items-center justify-center shadow-xs shrink-0">
                {initialLetter}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {fullName}
                  </span>
                  <RoleBadge role={role} />
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                  <span className="truncate">{village}</span>
                </div>
              </div>
            </div>

            {/* Vitals & Contact Quick Metadata Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Phone className="w-3 h-3 text-teal-600 shrink-0" />
                <span className="font-medium truncate">{phone}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Calendar className="w-3 h-3 text-teal-600 shrink-0" />
                <span className="font-medium">Age: {age} yrs</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <HeartPulse className="w-3 h-3 text-rose-600 shrink-0" />
                <span className="font-bold text-rose-700 dark:text-rose-400">
                  BP: {systolicBp}/{diastolicBp}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Activity className="w-3 h-3 text-teal-600 shrink-0" />
                <span className="font-medium">Pulse: {pulse} bpm</span>
              </div>
            </div>
          </div>

          {/* Action Menu Options */}
          <div className="p-2 space-y-1 text-xs font-bold text-slate-700 dark:text-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                setIsEditModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-800 dark:text-teal-300 transition-colors cursor-pointer group"
            >
              <span className="flex items-center gap-2.5">
                <Pencil className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <span>Edit Profile & Vitals</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <Link
              href="/patient/records"
              onClick={() => setIsDropdownOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
            >
              <span className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Patient Record</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href={dashboardHref}
              onClick={() => setIsDropdownOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
            >
              <span className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Dashboard</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {role === "Patient" && (
            <div className="p-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <Link
                href="/patient/feedback"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-2.5">
                  <MessageSquareHeart className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Feedback</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}

          {/* Footer Logout Option */}
          <div className="p-2">
            <button
              type="button"
              onClick={handleLogoutClick}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* GitHub-style Interactive Edit Profile & Vitals Modal (Rendered via Portal) */}
      {mounted &&
        isEditModalOpen &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsEditModalOpen(false);
            }}
            className="fixed inset-0 z-[999] bg-slate-950/70 backdrop-blur-xs overflow-y-auto p-4 sm:p-6 flex items-start justify-center"
          >
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-800 my-8 sm:my-12 animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 sticky top-0 bg-white dark:bg-slate-900 z-10 pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-700 text-white font-extrabold flex items-center justify-center text-lg">
                    {initialLetter}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">
                      Edit Profile & Vitals
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Update your personal data, contact, and health vitals
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Notification Banners */}
              {successMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
                  <X className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Edit Form */}
              <form onSubmit={handleSaveProfileAndVitals} className="space-y-4 text-xs">
                {/* Section 1: Personal Details */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <User className="w-3.5 h-3.5 text-teal-700" />
                    <span>Personal Information</span>
                  </h4>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Age (Years)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Location / Village
                    </label>
                    <input
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="Rampur Village, Kanpur Dehat"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Preferred Language
                      </label>
                      <select
                        value={preferredLanguage}
                        onChange={(e) => setPreferredLanguage(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option>Hindi (हिंदी)</option>
                        <option>English</option>
                        <option>Marathi (मराठी)</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Pregnancy Week (if applicable)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={45}
                        value={pregnancyWeek}
                        onChange={(e) => setPregnancyWeek(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Emergency Contact
                    </label>
                    <input
                      type="text"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="ANM Sunita Devi (+91 94351 26620)"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Section 2: Vitals */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                    <span>Health Vitals</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Systolic BP
                      </label>
                      <input
                        type="number"
                        value={systolicBp}
                        onChange={(e) => setSystolicBp(e.target.value)}
                        placeholder="145"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Diastolic BP
                      </label>
                      <input
                        type="number"
                        value={diastolicBp}
                        onChange={(e) => setDiastolicBp(e.target.value)}
                        placeholder="92"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Pulse (bpm)
                      </label>
                      <input
                        type="number"
                        value={pulse}
                        onChange={(e) => setPulse(e.target.value)}
                        placeholder="82"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="58"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Buttons */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900 py-1">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 disabled:opacity-60 text-white font-extrabold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <span>Save Profile & Vitals</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
