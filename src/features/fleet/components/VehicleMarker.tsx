import { VEHICLE_STATUS_COLORS } from '../types.ts';
import type { Vehicle } from '../types.ts';

interface VehicleMarkerProps {
  vehicle: Vehicle;
  onClick: (vehicle: Vehicle) => void;
  isSelected: boolean;
}

/**
 * Custom marker for each vehicle on the map
 * Shows vehicle direction with rotation and status with color
 */
export function VehicleMarker({ vehicle, onClick, isSelected }: VehicleMarkerProps) {
  const color = VEHICLE_STATUS_COLORS[vehicle.status];

  return (
    <div
      className="cursor-pointer relative"
      onClick={() => onClick(vehicle)}
      style={{
        transform: `rotate(${vehicle.location.heading}deg)`,
      }}
    >
      {/* Vehicle icon (arrow pointing up, rotated by heading) */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        className={`transition-all ${isSelected ? 'scale-125' : 'scale-100'}`}
      >
        {/* Shadow/outline */}
        <path
          d="M20 5 L30 30 L20 25 L10 30 Z"
          fill="black"
          opacity="0.3"
          transform="translate(1, 1)"
        />
        {/* Main arrow */}
        <path
          d="M20 5 L30 30 L20 25 L10 30 Z"
          fill={color}
          stroke="white"
          strokeWidth="2"
        />
      </svg>

      {/* Label */}
      <div
        className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 whitespace-nowrap"
        style={{ transform: `translateX(-50%) rotate(-${vehicle.location.heading}deg)` }}
      >
        <div className="bg-white px-2 py-1 rounded shadow text-xs font-medium border border-gray-300">
          {vehicle.driver_name || vehicle.name}
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute inset-0 rounded-full border-4 border-primary animate-pulse -m-2" />
      )}
    </div>
  );
}
