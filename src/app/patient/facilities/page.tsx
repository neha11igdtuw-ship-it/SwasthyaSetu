"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { FacilityCard } from "@/components/patient/FacilityCard";
import { priyaPatientMock, NearbyFacility } from "@/lib/mockData";
import { useLanguage } from "@/lib/i18n/languageContext";
import { facilitiesApi } from "@/lib/api/client";
import type { FacilityOut } from "@/lib/api/types";
import { getNearbyHospitals } from "@/lib/osmFacilities";
import {
  DEFAULT_VILLAGE_LOCATION,
  calculateHaversineDistance,
  formatCoordinates,
} from "@/lib/geo";
import {
  Building2,
  Info,
  Navigation,
  Compass,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  MapPin,
} from "lucide-react";

type LocationMode = "gps" | "village" | "detecting" | "denied";

export default function PatientFacilitiesPage() {
  const { t } = useLanguage();

  const [facilities, setFacilities] = useState<NearbyFacility[]>(
    priyaPatientMock.nearbyFacilities
  );
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: DEFAULT_VILLAGE_LOCATION.latitude,
    lng: DEFAULT_VILLAGE_LOCATION.longitude,
  });
  const [locationMode, setLocationMode] = useState<LocationMode>("detecting");
  const [locationMessage, setLocationModeMessage] = useState<string>(
    "Detecting your live location..."
  );
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("");
  const [usingFallbackData, setUsingFallbackData] = useState(false);

  // Fetch live nearby facilities from OpenStreetMap Overpass API for the given coords
  const loadLiveFacilities = useCallback((lat: number, lng: number) => {
    getNearbyHospitals(lat, lng)
      .then((liveFacilities) => {
        if (liveFacilities.length > 0) {
          setFacilities(liveFacilities);
          setUsingFallbackData(false);
        } else {
          setFacilities(priyaPatientMock.nearbyFacilities);
          setUsingFallbackData(true);
        }
      })
      .catch((err) => {
        console.warn("Overpass API request failed, falling back to mock data:", err);
        setFacilities(priyaPatientMock.nearbyFacilities);
        setUsingFallbackData(true);
      });
  }, []);

  // Request browser GPS position
  const detectLiveLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationMode("village");
      setLocationModeMessage(
        `Browser geolocation is not supported. Using registered village location: ${DEFAULT_VILLAGE_LOCATION.name}`
      );
      return;
    }

    setLocationMode("detecting");
    setLocationModeMessage("Requesting GPS coordinates from your device...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setLocationMode("gps");
        setLocationModeMessage(
          `Live GPS position acquired (${formatCoordinates(latitude, longitude)}).`
        );
        setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        loadLiveFacilities(latitude, longitude);
      },
      (err) => {
        console.warn("Geolocation permission or position error:", err.message);
        setLocationMode("denied");
        setLocationModeMessage(
          `GPS permission denied or unavailable. Showing distances from your registered village location: ${DEFAULT_VILLAGE_LOCATION.name}`
        );
        setUserCoords({
          lat: DEFAULT_VILLAGE_LOCATION.latitude,
          lng: DEFAULT_VILLAGE_LOCATION.longitude,
        });
        setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, [loadLiveFacilities]);

  // Fetch facilities from API and merge with mock coordinates if needed
  useEffect(() => {
    detectLiveLocation();

    facilitiesApi
      .list()
      .then((apiFacs: FacilityOut[]) => {
        if (apiFacs && apiFacs.length > 0) {
          const mapped: NearbyFacility[] = apiFacs.map((f, idx) => {
            // Find existing mock facility matching or assign fallback coords
            const matchMock = priyaPatientMock.nearbyFacilities[idx];
            return {
              id: f.id,
              name: f.name,
              type: (f.facility_type as NearbyFacility["type"]) || "Primary Health Centre",
              distance: matchMock ? matchMock.distance : "3.5 km",
              latitude: f.latitude ?? matchMock?.latitude ?? (26.98 - idx * 0.05),
              longitude: f.longitude ?? matchMock?.longitude ?? (81.20 - idx * 0.05),
              availableServices: matchMock
                ? matchMock.availableServices
                : ["Medical Officer", "Emergency Care", "Diagnostics"],
              doctorAvailability: matchMock
                ? matchMock.doctorAvailability
                : "Medical Officer on duty",
              status: "Available",
              lastUpdated: "Today at 9:00 AM",
              contactPhone: "+91 512 234 5678",
              address: matchMock ? matchMock.address : `${f.name}, Kanpur Dehat, UP`,
            };
          });
          setFacilities(mapped);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch remote facilities, fallback to mock data:", err);
      });
  }, [detectLiveLocation]);

  // Compute calculated distances for each facility from current user coords
  const facilitiesWithDistance = facilities
    .map((fac) => {
      let calcKm: number | null = null;
      if (fac.latitude != null && fac.longitude != null) {
        calcKm = calculateHaversineDistance(
          userCoords.lat,
          userCoords.lng,
          fac.latitude,
          fac.longitude
        );
      }
      return {
        ...fac,
        calculatedKm: calcKm,
        formattedDistance: calcKm != null ? `${calcKm} km` : fac.distance,
      };
    })
    .sort((a, b) => {
      if (a.calculatedKm != null && b.calculatedKm != null) {
        return a.calculatedKm - b.calculatedKm;
      }
      return 0;
    });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="nearbyHospitalsTitle"
        subtitle="facilitiesSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      {/* Live Location Tracking Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  Location & Proximity Calculator
                </h3>
                {locationMode === "gps" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                    Live GPS Active
                  </span>
                )}
                {(locationMode === "village" || locationMode === "denied") && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    Registered Village
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current reference point:{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {locationMode === "gps"
                    ? `Live Device Location (${formatCoordinates(userCoords.lat, userCoords.lng)})`
                    : DEFAULT_VILLAGE_LOCATION.name}
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={detectLiveLocation}
            disabled={locationMode === "detecting"}
            className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
          >
            {locationMode === "detecting" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Detect My Location</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
          {locationMode === "gps" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : locationMode === "detecting" ? (
            <Compass className="w-4 h-4 text-teal-600 animate-spin shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <span className="font-semibold block">{locationMessage}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              Distances to nearby Sub-Centres, PHCs, CHCs, and District Hospitals are computed using the Haversine formula based on your exact coordinates.
              {lastUpdatedTime && ` (Last updated at ${lastUpdatedTime})`}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 text-amber-950 dark:text-amber-200 text-xs font-semibold flex items-center gap-2">
        <Info className="w-4 h-4 text-amber-700 shrink-0" />
        <span>{t("doctorAvailabilitySavedInfo")}</span>
      </div>

      {/* Facilities Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-700" />
            <span>
              {t("recommendedHospitalsCenters")} ({facilitiesWithDistance.length})
            </span>
          </h3>
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-teal-600" />
            Sorted by nearest proximity
          </span>
        </div>

        {usingFallbackData && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
            Showing sample data — live facility lookup unavailable.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {facilitiesWithDistance.map((fac) => (
            <FacilityCard
              key={fac.id}
              facility={fac}
              distanceOverride={fac.formattedDistance}
              locationSource={
                locationMode === "gps" ? "Live GPS" : "Village Center"
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
