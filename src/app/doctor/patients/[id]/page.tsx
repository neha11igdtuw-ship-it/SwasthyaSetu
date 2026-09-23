"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import {
  careGapsApi,
  diagnosticsApi,
  encountersApi,
  inventoryApi,
  patientsApi,
  pregnanciesApi,
  prescriptionsApi,
  referralsApi,
  ApiError,
} from "@/lib/api/client";
import type {
  CareGapOut,
  DiagnosticOrderOut,
  DiagnosticReportOut,
  EncounterOut,
  PatientOut,
  PregnancyOut,
  InventoryItemOut,
  MatchCandidate,
  PrescriptionOut,
  ReferralOut,
  ScreeningOut,
  SymptomOut,
  VitalOut,
} from "@/lib/api/types";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ClipboardList,
  FileText,
  Loader2,
  MapPin,
  Phone,
  Pill,
  Share2,
  Stethoscope,
} from "lucide-react";

interface EncounterRecord {
  encounter: EncounterOut;
  vitals: VitalOut[];
  symptoms: SymptomOut[];
  screenings: ScreeningOut[];
}

interface DiagnosticRecord {
  order: DiagnosticOrderOut;
  report: DiagnosticReportOut | null;
}

interface PatientRecordData {
  patient: PatientOut;
  pregnancies: PregnancyOut[];
  encounters: EncounterRecord[];
  diagnostics: DiagnosticRecord[];
  prescriptions: PrescriptionOut[];
  referrals: ReferralOut[];
  careGaps: CareGapOut[];
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

function valueOrUnavailable(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "Not available" : String(value);
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
        <Icon className="w-5 h-5 text-teal-700" />
        <h2 className="font-extrabold text-slate-900 dark:text-white text-base">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function EmptySection({ text = "Not available" }: { text?: string }) {
  return <p className="text-xs text-slate-500 dark:text-slate-400">{text}</p>;
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700 p-3">
      <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</span>
      <span className="mt-1 block text-sm font-bold text-slate-900 dark:text-white break-words">{value}</span>
    </div>
  );
}

function riskLabel(data: PatientRecordData) {
  const levels = data.encounters.flatMap((record) => record.screenings.map((screening) => screening.risk_level));
  if (data.pregnancies.some((pregnancy) => pregnancy.risk_level === "HIGH") || levels.includes("HIGH")) return "High Risk";
  if (data.pregnancies.some((pregnancy) => pregnancy.risk_level === "MEDIUM") || levels.includes("MEDIUM")) return "Watch / Moderate";
  if (data.pregnancies.length || levels.includes("LOW")) return "Low Risk";
  return "Not available";
}

export default function DoctorPatientRecordPage() {
  const params = useParams();
  const patientId = params?.id as string;
  const [data, setData] = useState<PatientRecordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [encounterNote, setEncounterNote] = useState("");
  const [savingEncounter, setSavingEncounter] = useState(false);
  const [encounterSuccess, setEncounterSuccess] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemOut[]>([]);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState("");
  const [prescriptionQuantity, setPrescriptionQuantity] = useState("1");
  const [dosageInstructions, setDosageInstructions] = useState("");
  const [savingPrescription, setSavingPrescription] = useState(false);
  const [prescriptionSuccess, setPrescriptionSuccess] = useState<string | null>(null);
  const [diagnosticTestType, setDiagnosticTestType] = useState("");
  const [savingDiagnostic, setSavingDiagnostic] = useState(false);
  const [diagnosticSuccess, setDiagnosticSuccess] = useState<string | null>(null);
  const [referralReason, setReferralReason] = useState("");
  const [referralSpecialty, setReferralSpecialty] = useState("");
  const [referralUrgency, setReferralUrgency] = useState("ROUTINE");
  const [referralNotes, setReferralNotes] = useState("");
  const [referralCandidates, setReferralCandidates] = useState<MatchCandidate[]>([]);
  const [selectedReferralFacilityId, setSelectedReferralFacilityId] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [savingReferral, setSavingReferral] = useState(false);
  const [referralSuccess, setReferralSuccess] = useState<string | null>(null);
  const [emergencyConfirmationOpen, setEmergencyConfirmationOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!patientId) return;
      try {
        setLoading(true);
        setError(null);
        const patient = await patientsApi.get(patientId);
        const [pregnancies, encounters, diagnostics, prescriptions, referrals, careGaps, inventoryItems] = await Promise.all([
          pregnanciesApi.listForPatient(patientId).catch(() => []),
          encountersApi.list(patientId).catch(() => []),
          diagnosticsApi.listOrders(patientId).catch(() => []),
          prescriptionsApi.list(patientId).catch(() => []),
          referralsApi.list(patientId).catch(() => []),
          careGapsApi.listForPatient(patientId).catch(() => []),
          patient.facility_id ? inventoryApi.list(patient.facility_id).catch(() => []) : Promise.resolve([]),
        ]);

        const encounterRecords = await Promise.all(
          encounters.map(async (encounter) => {
            const [vitals, symptoms, screenings] = await Promise.all([
              encountersApi.listVitals(encounter.id).catch(() => []),
              encountersApi.listSymptoms(encounter.id).catch(() => []),
              encountersApi.listScreenings(encounter.id).catch(() => []),
            ]);
            return { encounter, vitals, symptoms, screenings };
          }),
        );

        const diagnosticRecords = await Promise.all(
          diagnostics.map(async (order) => ({
            order,
            report: order.report_id ? await diagnosticsApi.getReport(order.report_id).catch(() => null) : null,
          })),
        );

        if (!cancelled) {
          setData({
            patient,
            pregnancies,
            encounters: encounterRecords,
            diagnostics: diagnosticRecords,
            prescriptions,
            referrals,
            careGaps,
          });
          setInventoryItems(inventoryItems);
          setSelectedInventoryItemId((current) => current || inventoryItems.find((item) => item.quantity > 0)?.id || "");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load this patient record from the server.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [patientId, reloadKey]);

  const handleCreateEncounter = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const note = encounterNote.trim();
    if (!note) {
      setError("Please enter a consultation note.");
      setEncounterSuccess(null);
      return;
    }

    try {
      setSavingEncounter(true);
      setError(null);
      setEncounterSuccess(null);
      await encountersApi.create({
        patient_id: patientId,
        encounter_type: "CONSULTATION",
        notes: note,
      });
      setEncounterNote("");
      setEncounterSuccess("Consultation note saved successfully.");
      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the consultation note.");
    } finally {
      setSavingEncounter(false);
    }
  };

  const handleCreatePrescription = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number.parseInt(prescriptionQuantity, 10);
    if (!selectedInventoryItemId) {
      setError("Please select an available medicine.");
      setPrescriptionSuccess(null);
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError("Quantity must be at least 1.");
      setPrescriptionSuccess(null);
      return;
    }

    try {
      setSavingPrescription(true);
      setError(null);
      setPrescriptionSuccess(null);
      await prescriptionsApi.create({
        patient_id: patientId,
        facility_id: data?.patient.facility_id,
        inventory_item_id: selectedInventoryItemId,
        quantity,
        dosage_instructions: dosageInstructions.trim() || null,
      });
      setDosageInstructions("");
      setPrescriptionQuantity("1");
      setPrescriptionSuccess("Prescription saved successfully.");
      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the prescription.");
    } finally {
      setSavingPrescription(false);
    }
  };

  const handleCreateDiagnosticOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const testType = diagnosticTestType.trim();
    if (!testType) {
      setError("Please enter a diagnostic test name.");
      setDiagnosticSuccess(null);
      return;
    }

    try {
      setSavingDiagnostic(true);
      setError(null);
      setDiagnosticSuccess(null);
      await diagnosticsApi.createOrder({
        patient_id: patientId,
        test_type: testType,
      });
      setDiagnosticTestType("");
      setDiagnosticSuccess("Diagnostic test requested successfully.");
      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not request the diagnostic test.");
    } finally {
      setSavingDiagnostic(false);
    }
  };

  const handleFindReferralCandidates = async () => {
    if (!data?.patient.facility_id) {
      setError("This patient is not assigned to a facility, so matching facilities cannot be loaded.");
      return;
    }

    try {
      setLoadingCandidates(true);
      setError(null);
      const candidates = await referralsApi.matchCandidates({
        from_facility_id: data?.patient.facility_id,
        specialty_needed: referralSpecialty.trim() || undefined,
        limit: 20,
      });
      setReferralCandidates(candidates);
      setSelectedReferralFacilityId((current) => current || candidates[0]?.facility_id || "");
      if (candidates.length === 0) setError("No matching facilities were found.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load matching facilities.");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleCreateReferral = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reason = referralReason.trim();
    if (!reason) {
      setError("Please enter a reason for the referral.");
      setReferralSuccess(null);
      return;
    }
    if (!selectedReferralFacilityId) {
      setError("Please find and select a destination facility.");
      setReferralSuccess(null);
      return;
    }
    if (referralUrgency === "EMERGENCY" && !emergencyConfirmationOpen) {
      if (!referralNotes.trim()) {
        setError("Please add emergency notes before escalating this patient.");
        setReferralSuccess(null);
        return;
      }
      setEmergencyConfirmationOpen(true);
      return;
    }

    try {
      setSavingReferral(true);
      setError(null);
      setReferralSuccess(null);
      await referralsApi.create({
        patient_id: patientId,
        from_facility_id: data?.patient.facility_id,
        to_facility_id: selectedReferralFacilityId,
        reason,
        specialty_needed: referralSpecialty.trim() || null,
        urgency: referralUrgency,
        notes: referralNotes.trim() || null,
      });
      setReferralReason("");
      setReferralSpecialty("");
      setReferralUrgency("ROUTINE");
      setReferralNotes("");
      setReferralCandidates([]);
      setSelectedReferralFacilityId("");
      setEmergencyConfirmationOpen(false);
      setReferralSuccess("Referral created successfully.");
      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the referral.");
    } finally {
      setSavingReferral(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 p-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading patient record…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link href="/doctor/patients" className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800">
          <ArrowLeft className="w-4 h-4" /> Back to Patient Records
        </Link>
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error || "Patient not found."}
        </div>
      </div>
    );
  }

  const { patient, pregnancies, encounters, diagnostics, prescriptions, referrals, careGaps } = data;
  const allVitals = encounters.flatMap((record) => record.vitals.map((vital) => ({ ...vital, encounterDate: record.encounter.encounter_date })));
  const allScreenings = encounters.flatMap((record) => record.screenings);
  const latestEncounter = [...encounters].sort(
    (a, b) => new Date(b.encounter.encounter_date).getTime() - new Date(a.encounter.encounter_date).getTime(),
  )[0];
  const latestVital = [...allVitals].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
  )[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={`Patient Record: ${patient.full_name}`}
        subtitle={`ID: ${patient.id}`}
        roleBadge={<RoleBadge role="Doctor" />}
        action={
          <Link href="/doctor/patients" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Patient Records
          </Link>
        }
      />

      {error && <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 text-amber-900 text-xs font-semibold">{error}</div>}
      {encounterSuccess && <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-900 text-xs font-semibold">{encounterSuccess}</div>}

      <Section title="Patient Profile" icon={Stethoscope}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-700 flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{patient.full_name}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{patient.care_pathway || "Care pathway not available"}</p>
            </div>
          </div>
          <StatusBadge status={riskLabel(data)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <InfoItem label="Patient ID" value={patient.id} />
          <InfoItem label="Age" value={patient.date_of_birth ? `${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} years` : "Not available"} />
          <InfoItem label="Gender" value={valueOrUnavailable(patient.gender)} />
          <InfoItem label="Phone" value={valueOrUnavailable(patient.phone)} />
          <InfoItem label="Village" value={valueOrUnavailable(patient.village)} />
          <InfoItem label="Preferred language" value={valueOrUnavailable(patient.preferred_language)} />
          <InfoItem label="Emergency contact" value={valueOrUnavailable(patient.emergency_contact)} />
          <InfoItem label="ABHA ID" value={valueOrUnavailable(patient.abha_id)} />
        </div>
      </Section>

      <Section title="Add Consultation Note" icon={FileText}>
        <form onSubmit={handleCreateEncounter} className="space-y-3">
          <label htmlFor="consultation-note" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Consultation note
          </label>
          <textarea
            id="consultation-note"
            value={encounterNote}
            onChange={(event) => setEncounterNote(event.target.value)}
            placeholder="Record the consultation findings or plan"
            rows={4}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            disabled={savingEncounter}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingEncounter}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingEncounter && <Loader2 className="w-4 h-4 animate-spin" />}
              {savingEncounter ? "Saving..." : "Save Consultation Note"}
            </button>
          </div>
        </form>
      </Section>

      <Section title="Prescribe Medicine" icon={Pill}>
        <form onSubmit={handleCreatePrescription} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Available medicine
              <select
                value={selectedInventoryItemId}
                onChange={(event) => setSelectedInventoryItemId(event.target.value)}
                disabled={savingPrescription || inventoryItems.filter((item) => item.quantity > 0).length === 0}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2.5 text-sm font-normal text-slate-900 dark:text-white"
              >
                <option value="">{inventoryItems.length ? "Select a medicine" : "No available medicines"}</option>
                {inventoryItems.filter((item) => item.quantity > 0).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.quantity} {item.unit || "available"})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Quantity
              <input
                type="number"
                min="1"
                value={prescriptionQuantity}
                onChange={(event) => setPrescriptionQuantity(event.target.value)}
                disabled={savingPrescription}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2.5 text-sm font-normal text-slate-900 dark:text-white"
              />
            </label>
          </div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Dosage instructions (optional)
            <textarea
              value={dosageInstructions}
              onChange={(event) => setDosageInstructions(event.target.value)}
              placeholder="For example: 1 tablet after breakfast"
              rows={3}
              disabled={savingPrescription}
              className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2.5 text-sm font-normal text-slate-900 dark:text-white"
            />
          </label>
          <div className="flex items-center justify-between gap-3">
            {prescriptionSuccess && <span className="text-xs font-semibold text-emerald-700">{prescriptionSuccess}</span>}
            <button
              type="submit"
              disabled={savingPrescription || inventoryItems.filter((item) => item.quantity > 0).length === 0}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingPrescription && <Loader2 className="w-4 h-4 animate-spin" />}
              {savingPrescription ? "Saving..." : "Save Prescription"}
            </button>
          </div>
        </form>
      </Section>

      <Section title="Request Diagnostic Test" icon={ClipboardList}>
        <form onSubmit={handleCreateDiagnosticOrder} className="space-y-3">
          <label htmlFor="diagnostic-test-type" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Test name
          </label>
          <input
            id="diagnostic-test-type"
            type="text"
            value={diagnosticTestType}
            onChange={(event) => setDiagnosticTestType(event.target.value)}
            placeholder="Enter the diagnostic test to request"
            disabled={savingDiagnostic}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="flex items-center justify-between gap-3">
            {diagnosticSuccess && <span className="text-xs font-semibold text-emerald-700">{diagnosticSuccess}</span>}
            <button
              type="submit"
              disabled={savingDiagnostic}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingDiagnostic && <Loader2 className="w-4 h-4 animate-spin" />}
              {savingDiagnostic ? "Saving..." : "Request Test"}
            </button>
          </div>
        </form>
      </Section>

      <Section title="Create Referral" icon={Share2}>
        <form onSubmit={handleCreateReferral} className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/30 p-3">
            <div>
              <p className="text-xs font-extrabold text-rose-900 dark:text-rose-100">Emergency escalation</p>
              <p className="mt-0.5 text-[11px] text-rose-800 dark:text-rose-200">Use the existing referral workflow with emergency urgency.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setReferralUrgency("EMERGENCY");
                setError(null);
                setEmergencyConfirmationOpen(false);
              }}
              disabled={savingReferral || loadingCandidates}
              className="shrink-0 rounded-xl bg-rose-700 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Emergency / Escalate
            </button>
          </div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Reason for referral
            <textarea
              value={referralReason}
              onChange={(event) => setReferralReason(event.target.value)}
              placeholder="Describe why this patient should be referred"
              rows={3}
              disabled={savingReferral}
              className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2.5 text-sm font-normal text-slate-900 dark:text-white"
            />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Specialty needed (optional)
              <input
                value={referralSpecialty}
                onChange={(event) => setReferralSpecialty(event.target.value)}
                placeholder="For example: Cardiology"
                disabled={savingReferral || loadingCandidates}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2.5 text-sm font-normal text-slate-900 dark:text-white"
              />
            </label>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Urgency
              <select
                value={referralUrgency}
                onChange={(event) => setReferralUrgency(event.target.value)}
                disabled={savingReferral}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2.5 text-sm font-normal text-slate-900 dark:text-white"
              >
                <option value="ROUTINE">Routine</option>
                <option value="MEDIUM">Medium</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={handleFindReferralCandidates}
              disabled={loadingCandidates || savingReferral || !data.patient.facility_id}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingCandidates && <Loader2 className="w-4 h-4 animate-spin" />}
              {loadingCandidates ? "Finding facilities..." : "Find Matching Facilities"}
            </button>
            <label className="min-w-[min(100%,28rem)] flex-1 text-xs font-bold text-slate-700 dark:text-slate-300">
              Destination facility
              <select
                value={selectedReferralFacilityId}
                onChange={(event) => setSelectedReferralFacilityId(event.target.value)}
                disabled={savingReferral || referralCandidates.length === 0}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2.5 text-sm font-normal text-slate-900 dark:text-white"
              >
                <option value="">{referralCandidates.length ? "Select a facility" : "Find facilities first"}</option>
                {referralCandidates.map((candidate) => (
                  <option key={candidate.facility_id} value={candidate.facility_id}>
                    {candidate.facility_name}{candidate.distance_km !== null ? ` (${candidate.distance_km.toFixed(1)} km)` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {referralCandidates.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Matching facilities loaded: {referralCandidates.length}. Select the destination before saving.
            </p>
          )}
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Notes (optional)
            <textarea
              value={referralNotes}
              onChange={(event) => setReferralNotes(event.target.value)}
              placeholder="Add context for the receiving facility"
              rows={2}
              disabled={savingReferral}
              className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2.5 text-sm font-normal text-slate-900 dark:text-white"
            />
          </label>
          <div className="flex items-center justify-between gap-3">
            {referralSuccess && <span className="text-xs font-semibold text-emerald-700">{referralSuccess}</span>}
            <button
              type="submit"
              disabled={savingReferral || !selectedReferralFacilityId}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingReferral && <Loader2 className="w-4 h-4 animate-spin" />}
              {savingReferral ? "Saving..." : referralUrgency === "EMERGENCY" ? "Continue Emergency Escalation" : "Create Referral"}
            </button>
          </div>
          {emergencyConfirmationOpen && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-900/30 p-4 space-y-3">
              <p className="text-xs font-bold text-rose-900 dark:text-rose-100">
                Confirm emergency escalation for {patient.full_name}? This will create an EMERGENCY referral for the selected facility.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmergencyConfirmationOpen(false);
                    setReferralUrgency("ROUTINE");
                  }}
                  disabled={savingReferral}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReferral}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-3 py-2 text-xs font-bold text-white hover:bg-rose-800 disabled:opacity-60"
                >
                  {savingReferral && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Emergency Referral
                </button>
              </div>
            </div>
          )}
        </form>
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Section title="Pregnancy Information and History" icon={Calendar}>
          {pregnancies.length === 0 ? <EmptySection /> : (
            <div className="space-y-3">
              {pregnancies.map((pregnancy) => (
                <div key={pregnancy.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{pregnancy.status}</span>
                    <StatusBadge status={pregnancy.risk_level === "HIGH" ? "High Risk" : pregnancy.risk_level === "MEDIUM" ? "Watch / Moderate" : "Low Risk"} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                    <span>EDD: <strong>{formatDate(pregnancy.expected_delivery_date)}</strong></span>
                    <span>Gravida: <strong>{valueOrUnavailable(pregnancy.gravida)}</strong></span>
                    <span>Para: <strong>{valueOrUnavailable(pregnancy.para)}</strong></span>
                    <span>Risk flags: <strong>{valueOrUnavailable(pregnancy.risk_flags)}</strong></span>
                  </div>
                  {pregnancy.notes && <p className="text-slate-600 dark:text-slate-300">{pregnancy.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Risk Information" icon={AlertTriangle}>
          <div className="flex items-center gap-3">
            <StatusBadge status={riskLabel(data)} />
            <span className="text-xs text-slate-500 dark:text-slate-400">Based on recorded pregnancy and screening risk levels.</span>
          </div>
          {allScreenings.length === 0 && pregnancies.every((pregnancy) => !pregnancy.risk_flags) ? <EmptySection /> : (
            <div className="space-y-2 text-xs">
              {pregnancies.filter((pregnancy) => pregnancy.risk_flags).map((pregnancy) => <p key={pregnancy.id} className="text-slate-700 dark:text-slate-300">{pregnancy.risk_flags}</p>)}
              {allScreenings.filter((screening) => screening.risk_level !== "LOW").map((screening) => <p key={screening.id} className="text-slate-700 dark:text-slate-300">{screening.screening_type}: {screening.risk_level} risk{screening.result ? ` — ${screening.result}` : ""}</p>)}
            </div>
          )}
        </Section>
      </div>

      <Section title="Encounters, Vitals and Symptoms" icon={Activity}>
        {encounters.length === 0 ? <EmptySection /> : (
          <div className="space-y-4">
            {latestVital && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <InfoItem label="Latest BP" value={latestVital.systolic_bp && latestVital.diastolic_bp ? `${latestVital.systolic_bp}/${latestVital.diastolic_bp} mmHg` : "Not available"} />
                <InfoItem label="Pulse" value={latestVital.pulse ? `${latestVital.pulse} bpm` : "Not available"} />
                <InfoItem label="Temperature" value={latestVital.temperature_c ? `${latestVital.temperature_c} °C` : "Not available"} />
                <InfoItem label="Weight" value={latestVital.weight_kg ? `${latestVital.weight_kg} kg` : "Not available"} />
                <InfoItem label="SpO2" value={latestVital.spo2 ? `${latestVital.spo2}%` : "Not available"} />
                <InfoItem label="Recorded" value={formatDate(latestVital.recorded_at)} />
              </div>
            )}
            <div className="space-y-3">
              {encounters.map((record) => (
                <div key={record.encounter.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{record.encounter.encounter_type}</span>
                    <span className="text-slate-500 dark:text-slate-400">{formatDateTime(record.encounter.encounter_date)}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{record.encounter.notes || "No encounter note recorded."}</p>
                  {record.vitals.length > 0 && <p className="text-slate-600 dark:text-slate-300">Vitals recorded: {record.vitals.length}</p>}
                  {record.symptoms.length > 0 ? <div className="text-slate-600 dark:text-slate-300">Symptoms / danger signs: {record.symptoms.map((symptom) => `${symptom.description}${symptom.severity ? ` (${symptom.severity})` : ""}`).join(", ")}</div> : <p className="text-slate-500">Symptoms: Not available</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Screening Results" icon={ClipboardList}>
        {allScreenings.length === 0 ? <EmptySection /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allScreenings.map((screening) => (
              <div key={screening.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-xs space-y-2">
                <div className="flex justify-between gap-2"><strong className="text-slate-900 dark:text-white">{screening.screening_type}</strong><StatusBadge status={screening.risk_level === "HIGH" ? "High Risk" : screening.risk_level === "MEDIUM" ? "Watch / Moderate" : "Low Risk"} /></div>
                <p className="text-slate-700 dark:text-slate-300">Result: {screening.result || "Not available"}</p>
                <p className="text-slate-600 dark:text-slate-400">Notes: {screening.notes || "Not available"}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Section title="Diagnostic Orders and Reports" icon={FileText}>
          {diagnostics.length === 0 ? <EmptySection /> : (
            <div className="space-y-3">
              {diagnostics.map(({ order, report }) => (
                <div key={order.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2"><strong className="text-slate-900 dark:text-white">{order.test_type}</strong><span className="font-bold text-slate-600 dark:text-slate-300">{order.status}</span></div>
                  <p className="text-slate-600 dark:text-slate-300">Report: {report?.result_summary || order.result_summary || "Not available"}</p>
                  {report?.result_data && <p className="text-slate-600 dark:text-slate-300">Details: {report.result_data}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Prescriptions" icon={Pill}>
          {prescriptions.length === 0 ? <EmptySection /> : (
            <div className="space-y-3">
              {prescriptions.map((prescription) => (
                <div key={prescription.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2"><strong className="text-slate-900 dark:text-white">{prescription.item_name || "Medicine not available"}</strong><span className="font-bold text-slate-600 dark:text-slate-300">{prescription.status}</span></div>
                  <p className="text-slate-600 dark:text-slate-300">Quantity: {prescription.quantity}</p>
                  <p className="text-slate-600 dark:text-slate-300">Instructions: {prescription.dosage_instructions || "Not available"}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Section title="Referral History" icon={Stethoscope}>
          {referrals.length === 0 ? <EmptySection /> : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div key={referral.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2"><strong className="text-slate-900 dark:text-white">{referral.reason}</strong><StatusBadge status={referral.status} /></div>
                  <p className="text-slate-600 dark:text-slate-300">Urgency: {referral.urgency} · Specialty: {referral.specialty_needed || "Not available"}</p>
                  {referral.notes && <p className="text-slate-600 dark:text-slate-300">{referral.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Care Gaps and Follow-up" icon={AlertTriangle}>
          {careGaps.length === 0 ? <EmptySection /> : (
            <div className="space-y-3">
              {careGaps.map((gap) => (
                <div key={gap.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2"><strong className="text-slate-900 dark:text-white">{gap.gap_type}</strong><span className="font-bold text-slate-600 dark:text-slate-300">{gap.status}</span></div>
                  <p className="text-slate-600 dark:text-slate-300">{gap.description || "Not available"}</p>
                  <p className="text-slate-500 dark:text-slate-400">Due: {formatDate(gap.due_date)}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-teal-700" /> {valueOrUnavailable(patient.phone)}</div>
        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-teal-700" /> {valueOrUnavailable(patient.village)}</div>
        <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-teal-700" /> Last visit: {formatDate(latestEncounter?.encounter.encounter_date)}</div>
      </div>
    </div>
  );
}
