import { useRef, useEffect } from "react";
import Map, { Marker, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { NearbyJob } from "../types";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

interface MiniMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  nearbyJobs?: NearbyJob[];
}

export function MiniMap({ lat, lng, zoom = 11, nearbyJobs = [] }: MiniMapProps) {
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1200 });
  }, [lat, lng, zoom]);

  return (
    <div className="h-[200px] w-full overflow-hidden">
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE}
        initialViewState={{ longitude: lng, latitude: lat, zoom }}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        interactive={false}
      >
        {/* Caller pin */}
        <Marker longitude={lng} latitude={lat} anchor="bottom">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 shadow-lg ring-2 ring-white">
            <div className="h-2 w-2 rounded-full bg-white" />
          </div>
        </Marker>

        {/* Nearby job markers */}
        {nearbyJobs.slice(0, 5).map((job) => (
          <Marker key={job.id} longitude={job.lng} latitude={job.lat} anchor="bottom">
            <div
              className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 shadow ring-1 ring-white"
              title={`${job.customer_name} - ${job.scheduled_date}`}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-white" />
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}
