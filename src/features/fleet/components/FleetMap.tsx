import { useRef, useCallback, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useFleetStore, useFilteredVehicles, useSelectedVehicle } from "../stores/fleetStore.ts";
import { useVehicleHistory } from "../api.ts";
import { VehicleInfoPopup } from "./VehicleInfoPopup.tsx";
import { VEHICLE_STATUS_COLORS } from "../types.ts";
import type { Vehicle, VehicleStatus } from "../types.ts";
import type { MapStyle } from "../stores/fleetStore.ts";

// Free tile style URLs
const MAP_STYLES: Record<MapStyle, string> = {
  streets: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  satellite: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json", // Carto doesn't have satellite, use positron
};

interface FleetMapProps {
  height?: string;
}

/**
 * Vehicle marker component with directional arrow
 */
function VehicleMapMarker({
  vehicle,
  isSelected,
  onClick,
}: {
  vehicle: Vehicle;
  isSelected: boolean;
  onClick: () => void;
}) {
  const color =
    VEHICLE_STATUS_COLORS[vehicle.status as VehicleStatus] || "#9ca3af";
  const size = isSelected ? 52 : 40;
  const isMoving = vehicle.status === "moving";

  return (
    <div
      onClick={onClick}
      className="cursor-pointer relative group"
      style={{ width: size, height: size }}
    >
      {/* Pulsing ring for moving vehicles */}
      {isMoving && (
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            backgroundColor: color,
            opacity: 0.2,
            animationDuration: "2s",
          }}
        />
      )}

      {/* Selected ring */}
      {isSelected && (
        <div
          className="absolute -inset-1 rounded-full animate-pulse"
          style={{ border: `3px solid ${color}` }}
        />
      )}

      {/* Arrow SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: `rotate(${vehicle.location.heading}deg)`,
          filter: isSelected
            ? `drop-shadow(0 0 8px ${color})`
            : `drop-shadow(0 2px 4px rgba(0,0,0,0.3))`,
          transition: "transform 0.5s ease, filter 0.2s ease",
        }}
      >
        {/* Background circle */}
        <circle cx="24" cy="24" r="20" fill={color} opacity="0.2" />
        {/* Arrow */}
        <path
          d="M24 6 L36 36 L24 28 L12 36 Z"
          fill={color}
          stroke="white"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* Vehicle name label on hover */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="bg-white dark:bg-gray-800 px-2 py-1 rounded-md shadow-lg text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap border border-gray-200 dark:border-gray-700">
          {vehicle.name}
          {vehicle.location.speed > 0 && (
            <span className="text-gray-500 ml-1">
              {Math.round(vehicle.location.speed)} mph
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Main fleet map component using MapLibre GL (WebGL)
 */
export function FleetMap({ height = "100%" }: FleetMapProps) {
  const mapRef = useRef<MapRef>(null);
  const vehicles = useFilteredVehicles();
  const selectedVehicle = useSelectedVehicle();
  const selectVehicle = useFleetStore((s) => s.selectVehicle);
  const mapStyle = useFleetStore((s) => s.mapStyle);
  const showTrails = useFleetStore((s) => s.showTrails);
  const [showPopup, setShowPopup] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { data: history } = useVehicleHistory(
    showTrails ? selectedVehicle?.id : undefined,
    1,
  );

  // Fit bounds to all vehicles on initial load
  const fitBounds = useCallback(() => {
    if (!mapRef.current || vehicles.length === 0) return;

    const validVehicles = vehicles.filter(
      (v) => v.location.lat !== 0 && v.location.lng !== 0,
    );
    if (validVehicles.length === 0) return;

    if (validVehicles.length === 1) {
      mapRef.current.flyTo({
        center: [validVehicles[0].location.lng, validVehicles[0].location.lat],
        zoom: 14,
        duration: 1000,
      });
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    for (const v of validVehicles) {
      bounds.extend([v.location.lng, v.location.lat]);
    }

    mapRef.current.fitBounds(bounds, {
      padding: 60,
      maxZoom: 14,
      duration: 1000,
    });
  }, [vehicles]);

  // Fit bounds on first data load
  useEffect(() => {
    if (mapLoaded && vehicles.length > 0) {
      fitBounds();
    }
    // Only run on initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, vehicles.length > 0]);

  // Fly to selected vehicle
  useEffect(() => {
    if (!mapRef.current || !selectedVehicle) return;

    mapRef.current.flyTo({
      center: [selectedVehicle.location.lng, selectedVehicle.location.lat],
      zoom: 15,
      duration: 800,
    });
    setShowPopup(true);
  }, [selectedVehicle]);

  // Draw history trail
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current.getMap();
    const sourceId = "vehicle-trail";
    const layerId = "vehicle-trail-line";

    // Remove existing trail
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    if (!history || history.length < 2 || !selectedVehicle) return;

    // Build GeoJSON for trail with speed-coded colors
    const coordinates = history.map((p) => [p.lng, p.lat]);

    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates,
        },
      },
    });

    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#3b82f6",
        "line-width": 3,
        "line-opacity": 0.7,
        "line-dasharray": [2, 2],
      },
    });

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [history, selectedVehicle, mapLoaded]);

  const handleMarkerClick = useCallback(
    (vehicle: Vehicle) => {
      if (selectedVehicle?.id === vehicle.id) {
        selectVehicle(null);
        setShowPopup(false);
      } else {
        selectVehicle(vehicle.id);
        setShowPopup(true);
      }
    },
    [selectedVehicle, selectVehicle],
  );

  const isDark = mapStyle === "dark";

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-border"
      style={{ height }}
    >
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        mapStyle={MAP_STYLES[mapStyle]}
        initialViewState={{
          longitude: -84.0,
          latitude: 34.5,
          zoom: 6,
        }}
        style={{ width: "100%", height: "100%" }}
        onLoad={() => setMapLoaded(true)}
        onClick={(e) => {
          // Click on empty map area deselects
          if (!(e.originalEvent.target as HTMLElement).closest(".cursor-pointer")) {
            selectVehicle(null);
            setShowPopup(false);
          }
        }}
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />
        <ScaleControl position="bottom-right" />

        {/* Vehicle markers */}
        {vehicles.map((vehicle) => (
          <Marker
            key={vehicle.id}
            longitude={vehicle.location.lng}
            latitude={vehicle.location.lat}
            anchor="center"
          >
            <VehicleMapMarker
              vehicle={vehicle}
              isSelected={selectedVehicle?.id === vehicle.id}
              onClick={() => handleMarkerClick(vehicle)}
            />
          </Marker>
        ))}

        {/* Selected vehicle popup */}
        {selectedVehicle && showPopup && (
          <Popup
            longitude={selectedVehicle.location.lng}
            latitude={selectedVehicle.location.lat}
            anchor="bottom"
            offset={30}
            closeOnClick={false}
            onClose={() => {
              selectVehicle(null);
              setShowPopup(false);
            }}
            className="fleet-popup"
            maxWidth="320px"
          >
            <VehicleInfoPopup
              vehicle={selectedVehicle}
              onClose={() => {
                selectVehicle(null);
                setShowPopup(false);
              }}
            />
          </Popup>
        )}
      </Map>

      {/* Map style toggle */}
      <div className="absolute top-3 left-3 z-10 flex gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-1 border border-gray-200 dark:border-gray-700">
        {(["streets", "dark", "satellite"] as MapStyle[]).map((style) => (
          <button
            key={style}
            onClick={() => useFleetStore.getState().setMapStyle(style)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mapStyle === style
                ? "bg-blue-600 text-white"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            {style === "streets"
              ? "Light"
              : style === "dark"
                ? "Dark"
                : "Satellite"}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div
        className={`absolute bottom-8 left-3 z-10 rounded-lg shadow-lg p-3 text-xs border ${
          isDark
            ? "bg-gray-800/90 border-gray-700 text-white"
            : "bg-white/90 border-gray-200 text-gray-900"
        } backdrop-blur-sm`}
      >
        <div className="font-semibold mb-2">Vehicle Status</div>
        <div className="space-y-1.5">
          {(
            [
              ["Moving", VEHICLE_STATUS_COLORS.moving],
              ["Idling", VEHICLE_STATUS_COLORS.idling],
              ["Stopped", VEHICLE_STATUS_COLORS.stopped],
              ["Offline", VEHICLE_STATUS_COLORS.offline],
            ] as const
          ).map(([label, color]) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fit all button */}
      <button
        onClick={fitBounds}
        className={`absolute bottom-8 right-3 z-10 rounded-lg shadow-lg px-3 py-2 text-xs font-medium border transition-colors ${
          isDark
            ? "bg-gray-800/90 border-gray-700 text-white hover:bg-gray-700"
            : "bg-white/90 border-gray-200 text-gray-700 hover:bg-gray-100"
        } backdrop-blur-sm`}
        title="Fit all vehicles"
      >
        Fit All
      </button>
    </div>
  );
}
