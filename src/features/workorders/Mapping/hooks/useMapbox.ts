/**
 * useMapbox Hook (Leaflet Implementation)
 * Map initialization, marker management, and interactions using Leaflet with OpenStreetMap
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import * as L from 'leaflet';
import type { Map as LeafletMap, Marker, LatLngExpression } from 'leaflet';

// ============================================
// Types
// ============================================

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  icon?: L.DivIcon | L.Icon;
  popup?: string;
  draggable?: boolean;
  data?: Record<string, unknown>;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface UseMapboxOptions {
  /** Container element ID or ref */
  containerId?: string;
  /** Initial center coordinates */
  center?: { lat: number; lng: number };
  /** Initial zoom level (1-18) */
  zoom?: number;
  /** Min zoom level */
  minZoom?: number;
  /** Max zoom level */
  maxZoom?: number;
  /** Tile layer URL */
  tileUrl?: string;
  /** Show zoom controls */
  zoomControl?: boolean;
  /** Show attribution */
  attributionControl?: boolean;
  /** Callback when map is ready */
  onMapReady?: (map: LeafletMap) => void;
  /** Callback when marker is clicked */
  onMarkerClick?: (marker: MapMarker) => void;
  /** Callback when map is clicked */
  onMapClick?: (lat: number, lng: number) => void;
  /** Callback when map is moved */
  onMapMove?: (center: { lat: number; lng: number }, zoom: number) => void;
}

export interface UseMapboxReturn {
  /** Leaflet map instance */
  map: LeafletMap | null;
  /** Is map initialized */
  isReady: boolean;
  /** Current map center */
  center: { lat: number; lng: number } | null;
  /** Current zoom level */
  zoom: number;
  /** Map bounds */
  bounds: MapBounds | null;
  /** Initialize map on a container */
  initializeMap: (container: HTMLElement) => void;
  /** Add a marker */
  addMarker: (marker: MapMarker) => Marker | null;
  /** Remove a marker by ID */
  removeMarker: (id: string) => void;
  /** Remove all markers */
  clearMarkers: () => void;
  /** Update marker position */
  updateMarkerPosition: (id: string, lat: number, lng: number) => void;
  /** Set map center */
  setCenter: (lat: number, lng: number, zoom?: number) => void;
  /** Set zoom level */
  setZoom: (zoom: number) => void;
  /** Fit bounds to show all markers */
  fitBounds: (padding?: number) => void;
  /** Fit bounds to specific coordinates */
  fitBoundsToCoords: (coords: { lat: number; lng: number }[], padding?: number) => void;
  /** Pan to coordinates */
  panTo: (lat: number, lng: number) => void;
  /** Get current bounds */
  getBounds: () => MapBounds | null;
  /** Invalidate size (call after container resize) */
  invalidateSize: () => void;
  /** Destroy map */
  destroy: () => void;
}

// ============================================
// Default Tile Layers
// ============================================

export const TILE_LAYERS = {
  /** CartoDB Voyager - Clean, modern look */
  voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  /** CartoDB Light - Minimal, light theme */
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  /** CartoDB Dark - Dark theme */
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  /** OpenStreetMap Standard */
  osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  /** Stadia Maps - Alidade Smooth */
  stadia: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
} as const;

// ============================================
// Default Options
// ============================================

const DEFAULT_OPTIONS: Required<Omit<UseMapboxOptions, 'containerId' | 'onMapReady' | 'onMarkerClick' | 'onMapClick' | 'onMapMove'>> = {
  center: { lat: 29.4252, lng: -98.4946 }, // San Antonio, TX (near ECBTX)
  zoom: 12,
  minZoom: 3,
  maxZoom: 19,
  tileUrl: TILE_LAYERS.voyager,
  zoomControl: true,
  attributionControl: false,
};

// ============================================
// Hook Implementation
// ============================================

export function useMapbox(options: UseMapboxOptions = {}): UseMapboxReturn {
  const {
    center: initialCenter = DEFAULT_OPTIONS.center,
    zoom: initialZoom = DEFAULT_OPTIONS.zoom,
    minZoom = DEFAULT_OPTIONS.minZoom,
    maxZoom = DEFAULT_OPTIONS.maxZoom,
    tileUrl = DEFAULT_OPTIONS.tileUrl,
    zoomControl = DEFAULT_OPTIONS.zoomControl,
    attributionControl = DEFAULT_OPTIONS.attributionControl,
    onMapReady,
    onMarkerClick,
    onMapClick,
    onMapMove,
  } = options;

  // State
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(initialCenter);
  const [zoom, setZoom] = useState(initialZoom);
  const [bounds, setBounds] = useState<MapBounds | null>(null);

  // Refs
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMapClickRef = useRef(onMapClick);
  const onMapMoveRef = useRef(onMapMove);
  const onMapReadyRef = useRef(onMapReady);

  // Keep callback refs in sync
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
    onMapClickRef.current = onMapClick;
    onMapMoveRef.current = onMapMove;
    onMapReadyRef.current = onMapReady;
  }, [onMarkerClick, onMapClick, onMapMove, onMapReady]);

  // Update bounds from map
  const updateBounds = useCallback((leafletMap: LeafletMap) => {
    const mapBounds = leafletMap.getBounds();
    setBounds({
      north: mapBounds.getNorth(),
      south: mapBounds.getSouth(),
      east: mapBounds.getEast(),
      west: mapBounds.getWest(),
    });
  }, []);

  // Initialize map
  const initializeMap = useCallback((container: HTMLElement) => {
    if (map) {
      // Map already initialized
      return;
    }

    const leafletMap = L.map(container, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: initialZoom,
      minZoom,
      maxZoom,
      zoomControl,
      attributionControl,
    });

    // Add tile layer
    L.tileLayer(tileUrl).addTo(leafletMap);

    // Event handlers
    leafletMap.on('click', (e) => {
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    leafletMap.on('moveend', () => {
      const mapCenter = leafletMap.getCenter();
      const mapZoom = leafletMap.getZoom();
      setCenter({ lat: mapCenter.lat, lng: mapCenter.lng });
      setZoom(mapZoom);
      updateBounds(leafletMap);
      onMapMoveRef.current?.({ lat: mapCenter.lat, lng: mapCenter.lng }, mapZoom);
    });

    leafletMap.on('zoomend', () => {
      setZoom(leafletMap.getZoom());
      updateBounds(leafletMap);
    });

    setMap(leafletMap);
    setIsReady(true);
    updateBounds(leafletMap);
    onMapReadyRef.current?.(leafletMap);
  }, [map, initialCenter, initialZoom, minZoom, maxZoom, zoomControl, attributionControl, tileUrl, updateBounds]);

  // Add marker
  const addMarker = useCallback((markerData: MapMarker): Marker | null => {
    if (!map) return null;

    // Remove existing marker with same ID if any
    const existingMarker = markersRef.current.get(markerData.id);
    if (existingMarker) {
      existingMarker.remove();
    }

    const markerOptions: L.MarkerOptions = {
      draggable: markerData.draggable || false,
    };

    if (markerData.icon) {
      markerOptions.icon = markerData.icon;
    }

    const marker = L.marker([markerData.lat, markerData.lng], markerOptions).addTo(map);

    if (markerData.popup) {
      marker.bindPopup(markerData.popup);
    }

    if (markerData.title) {
      marker.bindTooltip(markerData.title);
    }

    // Click handler
    marker.on('click', () => {
      onMarkerClickRef.current?.(markerData);
    });

    markersRef.current.set(markerData.id, marker);
    return marker;
  }, [map]);

  // Remove marker
  const removeMarker = useCallback((id: string) => {
    const marker = markersRef.current.get(id);
    if (marker) {
      marker.remove();
      markersRef.current.delete(id);
    }
  }, []);

  // Clear all markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
  }, []);

  // Update marker position
  const updateMarkerPosition = useCallback((id: string, lat: number, lng: number) => {
    const marker = markersRef.current.get(id);
    if (marker) {
      marker.setLatLng([lat, lng]);
    }
  }, []);

  // Set center
  const setCenterFn = useCallback((lat: number, lng: number, newZoom?: number) => {
    if (!map) return;
    if (newZoom !== undefined) {
      map.setView([lat, lng], newZoom);
    } else {
      map.setView([lat, lng]);
    }
  }, [map]);

  // Set zoom
  const setZoomFn = useCallback((newZoom: number) => {
    if (!map) return;
    map.setZoom(newZoom);
  }, [map]);

  // Fit bounds to all markers
  const fitBounds = useCallback((padding = 50) => {
    if (!map || markersRef.current.size === 0) return;

    const markerPositions: LatLngExpression[] = [];
    markersRef.current.forEach((marker) => {
      const latlng = marker.getLatLng();
      markerPositions.push([latlng.lat, latlng.lng]);
    });

    if (markerPositions.length > 0) {
      const leafletBounds = L.latLngBounds(markerPositions);
      map.fitBounds(leafletBounds, { padding: [padding, padding] });
    }
  }, [map]);

  // Fit bounds to specific coordinates
  const fitBoundsToCoords = useCallback((coords: { lat: number; lng: number }[], padding = 50) => {
    if (!map || coords.length === 0) return;

    const positions: LatLngExpression[] = coords.map((c) => [c.lat, c.lng]);
    const leafletBounds = L.latLngBounds(positions);
    map.fitBounds(leafletBounds, { padding: [padding, padding] });
  }, [map]);

  // Pan to coordinates
  const panTo = useCallback((lat: number, lng: number) => {
    if (!map) return;
    map.panTo([lat, lng]);
  }, [map]);

  // Get current bounds
  const getBounds = useCallback((): MapBounds | null => {
    if (!map) return null;
    const mapBounds = map.getBounds();
    return {
      north: mapBounds.getNorth(),
      south: mapBounds.getSouth(),
      east: mapBounds.getEast(),
      west: mapBounds.getWest(),
    };
  }, [map]);

  // Invalidate size
  const invalidateSize = useCallback(() => {
    if (!map) return;
    map.invalidateSize();
  }, [map]);

  // Destroy map
  const destroy = useCallback(() => {
    if (map) {
      clearMarkers();
      map.remove();
      setMap(null);
      setIsReady(false);
    }
  }, [map, clearMarkers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (map) {
        clearMarkers();
        map.remove();
      }
    };
  }, []);

  return {
    map,
    isReady,
    center,
    zoom,
    bounds,
    initializeMap,
    addMarker,
    removeMarker,
    clearMarkers,
    updateMarkerPosition,
    setCenter: setCenterFn,
    setZoom: setZoomFn,
    fitBounds,
    fitBoundsToCoords,
    panTo,
    getBounds,
    invalidateSize,
    destroy,
  };
}

// ============================================
// Helper: Create Custom Marker Icons
// ============================================

export function createMarkerIcon(options: {
  color?: string;
  size?: number;
  iconHtml?: string;
  className?: string;
}): L.DivIcon {
  const { color = '#3b82f6', size = 32, iconHtml, className = '' } = options;

  const html = iconHtml || `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="white">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    className: `custom-marker ${className}`,
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function createNumberedMarkerIcon(options: {
  number: number;
  color?: string;
  size?: number;
}): L.DivIcon {
  const { number, color = '#3b82f6', size = 32 } = options;

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: ${size * 0.4}px;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      ${number}
    </div>
  `;

  return L.divIcon({
    className: 'numbered-marker',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export default useMapbox;
