import { useRef, useEffect, useState } from "react";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
  Source,
  Layer,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { nashvilleZones } from "../data/nashville-zones";
import { ZoneLegend } from "./ZoneLegend";
import type { NearbyJob } from "../types";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

interface FullMapProps {
  lat: number;
  lng: number;
  marketSlug?: string;
  nearbyJobs?: NearbyJob[];
}

export function FullMap({ lat, lng, marketSlug = "nashville", nearbyJobs = [] }: FullMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [selectedJob, setSelectedJob] = useState<NearbyJob | null>(null);

  useEffect(() => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 11, duration: 1200 });
  }, [lat, lng]);

  const showZones = marketSlug === "nashville";

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE}
        initialViewState={{ longitude: lng, latitude: lat, zoom: 10 }}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />

        {showZones && (
          <>
            <Source id="zone-extended" type="geojson" data={nashvilleZones.extended as GeoJSON.Feature}>
              <Layer
                id="zone-extended-fill"
                type="fill"
                paint={{ "fill-color": "#f59e0b", "fill-opacity": 0.06 }}
              />
              <Layer
                id="zone-extended-line"
                type="line"
                paint={{
                  "line-color": "#f59e0b",
                  "line-width": 2,
                  "line-dasharray": [4, 3],
                  "line-opacity": 0.7,
                }}
              />
            </Source>
            <Source id="zone-core" type="geojson" data={nashvilleZones.core as GeoJSON.Feature}>
              <Layer
                id="zone-core-fill"
                type="fill"
                paint={{ "fill-color": "#ef4444", "fill-opacity": 0.08 }}
              />
              <Layer
                id="zone-core-line"
                type="line"
                paint={{ "line-color": "#ef4444", "line-width": 2, "line-opacity": 0.7 }}
              />
            </Source>
          </>
        )}

        {/* Caller pin */}
        <Marker longitude={lng} latitude={lat} anchor="bottom">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 shadow-lg ring-3 ring-white">
            <div className="h-3 w-3 rounded-full bg-white" />
          </div>
        </Marker>

        {/* Nearby job markers */}
        {nearbyJobs.map((job) => (
          <Marker
            key={job.id}
            longitude={job.lng}
            latitude={job.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedJob(job);
            }}
          >
            <div className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-amber-500 shadow-md ring-2 ring-white transition-transform hover:scale-110">
              <div className="h-2 w-2 rounded-full bg-white" />
            </div>
          </Marker>
        ))}

        {/* Job popup */}
        {selectedJob && (
          <Popup
            longitude={selectedJob.lng}
            latitude={selectedJob.lat}
            anchor="bottom"
            offset={20}
            onClose={() => setSelectedJob(null)}
            closeOnClick={false}
          >
            <div className="text-xs">
              <div className="font-semibold">{selectedJob.customer_name}</div>
              <div className="text-muted-foreground">{selectedJob.address}</div>
              {selectedJob.scheduled_date && (
                <div className="mt-1 font-medium text-amber-600">
                  {new Date(selectedJob.scheduled_date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              )}
              <div className="text-muted-foreground">{selectedJob.distance_miles} mi away</div>
            </div>
          </Popup>
        )}
      </Map>

      {showZones && (
        <div className="absolute bottom-3 left-3">
          <ZoneLegend />
        </div>
      )}

      {/* Nearby jobs count badge */}
      {nearbyJobs.length > 0 && (
        <div className="absolute top-3 left-3 rounded-lg bg-white/90 px-2 py-1 text-xs font-medium shadow-sm backdrop-blur">
          <span className="text-amber-600">{nearbyJobs.length}</span> jobs this week nearby
        </div>
      )}
    </div>
  );
}
