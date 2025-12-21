import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface LocationCaptureProps {
  onCapture: (location: LocationData) => void;
  onCancel?: () => void;
  autoCapture?: boolean;
}

/**
 * GPS location capture component
 */
export function LocationCapture({
  onCapture,
  onCancel,
  autoCapture = false,
}: LocationCaptureProps) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check if geolocation is supported
    if (!('geolocation' in navigator)) {
      setIsSupported(false);
      setError('Geolocation is not supported by your browser');
      return;
    }

    // Auto-capture on mount if requested
    if (autoCapture) {
      captureLocation();
    }
  }, [autoCapture]);

  /**
   * Capture current location
   */
  const captureLocation = () => {
    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

        setLocation(locationData);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error getting location:', err);
        let errorMessage = 'Unable to get your location';

        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }

        setError(errorMessage);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  /**
   * Confirm and save location
   */
  const handleConfirm = () => {
    if (location) {
      onCapture(location);
    }
  };

  /**
   * Format coordinates for display
   */
  const formatCoordinates = (lat: number, lng: number): string => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`;
  };

  if (!isSupported) {
    return (
      <Card className="p-4">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🗺️</div>
          <p className="text-text-secondary">{error}</p>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel} className="mt-4">
              Cancel
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-text-primary">Location</h3>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-md p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4 animate-pulse">📍</div>
            <p className="text-text-secondary">Getting your location...</p>
          </div>
        )}

        {/* Location display */}
        {!isLoading && location && (
          <div className="space-y-4">
            <div className="bg-bg-muted rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-2xl">📍</span>
                <div className="flex-1">
                  <p className="font-medium text-text-primary mb-1">Current Location</p>
                  <p className="text-sm text-text-secondary font-mono">
                    {formatCoordinates(location.latitude, location.longitude)}
                  </p>
                  <p className="text-xs text-text-muted mt-2">
                    Accuracy: ±{Math.round(location.accuracy)}m
                  </p>
                </div>
              </div>

              {/* Map link */}
              <a
                href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-block mt-2"
              >
                View on Google Maps →
              </a>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={captureLocation} className="flex-1">
                Refresh
              </Button>
              <Button variant="primary" onClick={handleConfirm} className="flex-1">
                Use Location
              </Button>
            </div>
          </div>
        )}

        {/* Initial capture button */}
        {!isLoading && !location && !error && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📍</div>
            <p className="text-text-secondary mb-4">
              Capture your current GPS location
            </p>
            <Button variant="primary" onClick={captureLocation}>
              Get Location
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Simple location display component (read-only)
 */
export function LocationDisplay({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const formatCoordinates = (lat: number, lng: number): string => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`;
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-lg">📍</span>
      <a
        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline font-mono"
      >
        {formatCoordinates(latitude, longitude)}
      </a>
    </div>
  );
}
