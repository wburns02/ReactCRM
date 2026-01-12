/**
 * MiniMap Component
 * Compact map widget showing a single location with pin marker and address display
 */
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-expect-error - Leaflet type issue with default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ============================================
// Types
// ============================================

export interface MiniMapProps {
  /** Latitude of the location */
  lat: number;
  /** Longitude of the location */
  lng: number;
  /** Address to display */
  address?: string;
  /** Map height (CSS value) */
  height?: string;
  /** Map width (CSS value) */
  width?: string;
  /** Zoom level (1-18) */
  zoom?: number;
  /** Show address overlay */
  showAddress?: boolean;
  /** Show directions button */
  showDirectionsButton?: boolean;
  /** Marker color */
  markerColor?: string;
  /** Custom marker icon */
  customMarker?: L.DivIcon | L.Icon;
  /** Click handler for opening full map/directions */
  onClick?: () => void;
  /** Additional CSS class */
  className?: string;
  /** Interactive map (allows pan/zoom) */
  interactive?: boolean;
  /** Popup content */
  popupContent?: React.ReactNode;
}

// ============================================
// Custom Pin Marker
// ============================================

function createPinMarker(color = "#ef4444"): L.DivIcon {
  return L.divIcon({
    className: "custom-pin-marker",
    html: `
      <div style="position: relative; width: 30px; height: 40px;">
        <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 25 15 25s15-14.5 15-25c0-8.284-6.716-15-15-15z" fill="${color}"/>
          <circle cx="15" cy="15" r="6" fill="white"/>
        </svg>
      </div>
    `,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40],
  });
}

// ============================================
// Map Center Updater Component
// ============================================

function MapCenterUpdater({
  lat,
  lng,
  zoom,
}: {
  lat: number;
  lng: number;
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lng], zoom);
  }, [map, lat, lng, zoom]);

  return null;
}

// ============================================
// MiniMap Component
// ============================================

export function MiniMap({
  lat,
  lng,
  address,
  height = "150px",
  width = "100%",
  zoom = 15,
  showAddress = true,
  showDirectionsButton = true,
  markerColor = "#ef4444",
  customMarker,
  onClick,
  className = "",
  interactive = false,
  popupContent,
}: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Create marker icon
  const markerIcon = customMarker || createPinMarker(markerColor);

  // Open directions in native maps
  const openDirections = () => {
    // Try to open in native maps app first, fallback to Google Maps
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    const appleMapsUrl = `maps://maps.apple.com/?daddr=${lat},${lng}`;

    // Check if on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      window.location.href = appleMapsUrl;
      // Fallback to Google Maps after a delay if Apple Maps doesn't open
      setTimeout(() => {
        window.open(mapsUrl, "_blank");
      }, 500);
    } else {
      window.open(mapsUrl, "_blank");
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      openDirections();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative rounded-lg overflow-hidden shadow-md ${className}`}
      style={{ height, width }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Map Container */}
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
        dragging={interactive}
        touchZoom={interactive}
        scrollWheelZoom={interactive}
        doubleClickZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        <MapCenterUpdater lat={lat} lng={lng} zoom={zoom} />
        <Marker position={[lat, lng]} icon={markerIcon}>
          {popupContent && <Popup>{popupContent}</Popup>}
        </Marker>
      </MapContainer>

      {/* Address Overlay */}
      {showAddress && address && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-6">
          <p className="text-white text-sm font-medium truncate">{address}</p>
        </div>
      )}

      {/* Click Overlay */}
      {!interactive && (
        <button
          onClick={handleClick}
          className="absolute inset-0 bg-transparent cursor-pointer z-10"
          aria-label={onClick ? "Open map" : "Open directions"}
        >
          {/* Hover effect */}
          <div
            className={`absolute inset-0 bg-black/10 transition-opacity duration-200 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          />
        </button>
      )}

      {/* Directions Button */}
      {showDirectionsButton && isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openDirections();
          }}
          className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-lg z-20 hover:bg-white transition-colors"
          aria-label="Get directions"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 11l19-9-9 19-2-8-8-2z" />
          </svg>
        </button>
      )}

      {/* Map indicator icon (shows on hover when not interactive) */}
      {!interactive && isHovered && (
        <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm rounded-full p-1.5 shadow-lg z-20">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6b7280"
            strokeWidth="2"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ============================================
// MiniMap Skeleton (Loading State)
// ============================================

export function MiniMapSkeleton({
  height = "150px",
  width = "100%",
  className = "",
}: {
  height?: string;
  width?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-lg overflow-hidden bg-gray-200 animate-pulse ${className}`}
      style={{ height, width }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>
    </div>
  );
}

// ============================================
// MiniMap with Address Lookup
// ============================================

export interface MiniMapWithAddressProps extends Omit<
  MiniMapProps,
  "lat" | "lng"
> {
  /** Full address string (will be geocoded) */
  fullAddress: string;
  /** Fallback coordinates if geocoding fails */
  fallbackLat?: number;
  fallbackLng?: number;
}

export function MiniMapWithAddress({
  fullAddress,
  fallbackLat = 0,
  fallbackLng = 0,
  ...props
}: MiniMapWithAddressProps) {
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function geocodeAddress() {
      try {
        setLoading(true);
        // Use Nominatim (OpenStreetMap) for free geocoding
        const encodedAddress = encodeURIComponent(fullAddress);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
        );
        const data = await response.json();

        if (data && data.length > 0) {
          setCoordinates({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          });
        } else {
          setError("Address not found");
          if (fallbackLat && fallbackLng) {
            setCoordinates({ lat: fallbackLat, lng: fallbackLng });
          }
        }
      } catch (err) {
        setError("Failed to geocode address");
        if (fallbackLat && fallbackLng) {
          setCoordinates({ lat: fallbackLat, lng: fallbackLng });
        }
      } finally {
        setLoading(false);
      }
    }

    if (fullAddress) {
      geocodeAddress();
    }
  }, [fullAddress, fallbackLat, fallbackLng]);

  if (loading) {
    return (
      <MiniMapSkeleton
        height={props.height}
        width={props.width}
        className={props.className}
      />
    );
  }

  if (!coordinates) {
    return (
      <div
        className={`relative rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center ${props.className || ""}`}
        style={{
          height: props.height || "150px",
          width: props.width || "100%",
        }}
      >
        <div className="text-center text-gray-500 p-4">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mx-auto mb-2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p className="text-sm">{error || "Location unavailable"}</p>
        </div>
      </div>
    );
  }

  return (
    <MiniMap
      lat={coordinates.lat}
      lng={coordinates.lng}
      address={fullAddress}
      {...props}
    />
  );
}

export default MiniMap;
