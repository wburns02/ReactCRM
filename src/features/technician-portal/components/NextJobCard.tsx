import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTechJobs } from "@/api/hooks/useTechPortal.ts";

/**
 * Haversine formula — returns distance in miles between two lat/lng points.
 */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Estimate drive time in minutes from straight-line distance.
 * Uses 1.4x road factor and 30 mph average (suburban/rural Texas).
 */
function estimateDriveMinutes(miles: number): number {
  const roadMiles = miles * 1.4;
  const minutes = (roadMiles / 30) * 60;
  // Round up to nearest 5
  return Math.max(5, Math.ceil(minutes / 5) * 5);
}

interface Props {
  currentJobId: string;
}

export function NextJobCard({ currentJobId }: Props) {
  const navigate = useNavigate();
  const { data: jobList } = useTechJobs({ status: "scheduled" });
  const [eta, setEta] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState(false);

  // Find the next scheduled job (not the current one)
  const nextJob = jobList?.items
    ?.filter((j) => j.id !== currentJobId && (j.status === "scheduled" || j.status === "pending"))
    ?.sort((a, b) => {
      const da = a.scheduled_date ? new Date(a.scheduled_date).getTime() : Infinity;
      const db = b.scheduled_date ? new Date(b.scheduled_date).getTime() : Infinity;
      return da - db; // Earliest first
    })?.[0];

  // Get GPS and calculate ETA
  useEffect(() => {
    if (!nextJob?.service_latitude || !nextJob?.service_longitude) return;

    if (!navigator.geolocation) {
      setGpsError(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const miles = haversineDistance(
          pos.coords.latitude, pos.coords.longitude,
          nextJob.service_latitude!, nextJob.service_longitude!,
        );
        setEta(estimateDriveMinutes(miles));
      },
      () => setGpsError(true),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [nextJob?.service_latitude, nextJob?.service_longitude]);

  if (!nextJob) return null;

  const customerName = nextJob.customer_name || "Customer";
  const address = [nextJob.service_address_line1, nextJob.service_city]
    .filter(Boolean).join(", ");
  const phone = nextJob.customer_phone;

  const etaText = eta
    ? `about ${eta} minutes`
    : gpsError
      ? "shortly"
      : "calculating...";

  const arrivalTime = eta
    ? new Date(Date.now() + eta * 60000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;

  const handleTextCustomer = () => {
    if (!phone) return;
    const msg = `Hi${customerName !== "Customer" ? ` ${customerName}` : ""}, this is your technician from MAC Septic Services. I'm headed your way now — estimated arrival ${arrivalTime ? `around ${arrivalTime}` : "in about 20-30 minutes"}. I'll be checking your septic system, should take about 25 minutes.`;
    window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, "_self");
  };

  const mapsUrl = nextJob.service_latitude && nextJob.service_longitude
    ? `https://maps.google.com/?daddr=${nextJob.service_latitude},${nextJob.service_longitude}`
    : address
      ? `https://maps.google.com/?daddr=${encodeURIComponent(address)}`
      : null;

  return (
    <div className="border-2 border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🚛</span>
        <div className="flex-1">
          <h3 className="font-bold text-text-primary text-sm">Next Job</h3>
          <p className="text-text-secondary text-xs">{customerName}</p>
        </div>
        {eta && (
          <div className="text-right">
            <p className="text-lg font-bold text-green-700 dark:text-green-400">~{eta} min</p>
            <p className="text-xs text-text-secondary">{arrivalTime}</p>
          </div>
        )}
      </div>

      {address && (
        <p className="text-xs text-text-secondary">
          📍 {address}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {phone ? (
          <button
            onClick={handleTextCustomer}
            className="py-3 rounded-lg bg-blue-600 text-white font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            💬 Text — On my way!
          </button>
        ) : (
          <button
            disabled
            className="py-3 rounded-lg bg-gray-200 text-gray-400 font-semibold text-sm"
          >
            💬 No phone
          </button>
        )}
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 rounded-lg bg-primary text-white font-semibold text-sm text-center active:scale-[0.98] transition-transform"
          >
            🗺️ Navigate
          </a>
        ) : (
          <button
            onClick={() => navigate(`/portal/jobs/${nextJob.id}`)}
            className="py-3 rounded-lg border border-border text-text-primary font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            📋 View Job
          </button>
        )}
      </div>

      <p className="text-[11px] text-text-tertiary text-center">
        ETA {eta ? `based on GPS (${eta} min drive)` : gpsError ? "— GPS unavailable" : "— getting location..."}
      </p>
    </div>
  );
}
