import { useMemo } from "react";
import { useNextAvailable, formatDateShort, type DayAvailability } from "../hooks/useAvailability";
import { TIME_SLOT_OPTIONS, type TimeSlot } from "../types/lead";

interface AvailabilityPickerProps {
  selectedDate: string | undefined;
  selectedTimeSlot: TimeSlot | undefined;
  isAsap: boolean;
  onDateChange: (date: string | undefined) => void;
  onTimeSlotChange: (slot: TimeSlot | undefined) => void;
  onAsapChange: (isAsap: boolean) => void;
  serviceType?: string;
}

export function AvailabilityPicker({
  selectedDate,
  selectedTimeSlot,
  isAsap,
  onDateChange,
  onTimeSlotChange,
  onAsapChange,
  serviceType,
}: AvailabilityPickerProps) {
  const { data: availability, isLoading, error } = useNextAvailable(serviceType);

  // Get next 5 available weekdays from API or generate fallback
  const availableDays = useMemo(() => {
    if (availability?.slots) {
      return availability.slots.filter(slot => slot.available).slice(0, 5);
    }
    // Fallback: Generate next 5 weekdays if API fails
    const days: DayAvailability[] = [];
    const today = new Date();
    let current = new Date(today);

    while (days.length < 5) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        days.push({
          date: current.toISOString().split("T")[0],
          day_name: current.toLocaleDateString("en-US", { weekday: "long" }),
          is_weekend: false,
          available: true,
          time_windows: [
            { start: "08:00", end: "12:00", available: true, slots_remaining: 3 },
            { start: "12:00", end: "17:00", available: true, slots_remaining: 3 },
          ],
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [availability]);

  // Handle ASAP toggle
  const handleAsapClick = () => {
    if (isAsap) {
      onAsapChange(false);
    } else {
      onAsapChange(true);
      onDateChange(undefined);
      onTimeSlotChange(undefined);
    }
  };

  // Handle date selection
  const handleDateClick = (date: string) => {
    if (isAsap) {
      onAsapChange(false);
    }
    if (selectedDate === date) {
      onDateChange(undefined);
    } else {
      onDateChange(date);
    }
  };

  // Handle time slot selection
  const handleTimeSlotClick = (slot: TimeSlot) => {
    if (selectedTimeSlot === slot) {
      onTimeSlotChange(undefined);
    } else {
      onTimeSlotChange(slot);
    }
  };

  // Check if a time window is available for selected date
  const getTimeWindowAvailability = (slot: TimeSlot) => {
    if (!selectedDate || !availability) return true;

    const daySlot = availability.slots.find((s) => s.date === selectedDate);
    if (!daySlot) return true;

    if (slot === "any") return true;

    const windowIndex = slot === "morning" ? 0 : 1;
    const window = daySlot.time_windows[windowIndex];
    return window?.available ?? true;
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        When do you need service?
      </label>

      {/* ASAP / Emergency Option */}
      <button
        type="button"
        onClick={handleAsapClick}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg font-semibold transition-all ${
          isAsap
            ? "border-red-500 bg-red-50 text-red-700"
            : "border-gray-200 hover:border-red-300 text-gray-700 hover:bg-red-50"
        }`}
      >
        <span className="text-xl">⚡</span>
        <span>ASAP / Emergency</span>
        {isAsap && (
          <svg className="w-5 h-5 ml-auto" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Date Selection */}
      {!isAsap && (
        <>
          <div className="text-sm text-gray-500 text-center">
            Or select a preferred date:
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="text-sm text-red-600 text-center py-2">
              Unable to load availability. Please select any date below.
            </div>
          ) : null}

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {availableDays.map((day) => {
              const isSelected = selectedDate === day.date;
              const dateObj = new Date(day.date + "T00:00:00");
              const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "short" });
              const dayNum = dateObj.getDate();

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => handleDateClick(day.date)}
                  disabled={!day.available}
                  className={`flex flex-col items-center justify-center p-3 border-2 rounded-lg transition-all min-h-[70px] ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : day.available
                      ? "border-gray-200 hover:border-primary/50 text-gray-700 hover:bg-gray-50"
                      : "border-gray-100 text-gray-300 cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-medium uppercase">{dayOfWeek}</span>
                  <span className="text-lg font-bold">{dayNum}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Time Slot Selection - Only show when date is selected */}
      {selectedDate && !isAsap && (
        <div className="space-y-2 pt-2">
          <label className="block text-sm font-medium text-gray-600">
            Preferred time:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOT_OPTIONS.map((option) => {
              const isSelected = selectedTimeSlot === option.value;
              const isAvailable = getTimeWindowAvailability(option.value as TimeSlot);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTimeSlotClick(option.value as TimeSlot)}
                  disabled={!isAvailable}
                  className={`flex flex-col items-center justify-center p-3 border-2 rounded-lg transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : isAvailable
                      ? "border-gray-200 hover:border-primary/50 text-gray-700 hover:bg-gray-50"
                      : "border-gray-100 text-gray-300 cursor-not-allowed"
                  }`}
                >
                  <span className="text-lg">{option.icon}</span>
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-gray-500">{option.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {(isAsap || selectedDate) && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          <span className="font-medium">Selected: </span>
          {isAsap ? (
            <span className="text-red-600 font-semibold">ASAP / Emergency</span>
          ) : (
            <>
              <span className="font-semibold">{formatDateShort(selectedDate!)}</span>
              {selectedTimeSlot && (
                <span>
                  {" "}
                  -{" "}
                  {TIME_SLOT_OPTIONS.find((o) => o.value === selectedTimeSlot)?.label}{" "}
                  ({TIME_SLOT_OPTIONS.find((o) => o.value === selectedTimeSlot)?.description})
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
