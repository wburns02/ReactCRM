/**
 * TimeSlotPicker Component
 * Time selection with preset options and custom time range
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import { Button } from '@/components/ui/Button.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { useAvailableSlots } from './hooks/useScheduling.ts';

interface TimeSlot {
  id: string;
  label: string;
  start: string;
  end: string;
  icon: string;
}

interface TimeSlotPickerProps {
  date: string;
  technicianId?: string;
  value?: { start: string; end: string };
  onSelect: (slot: { start: string; end: string }) => void;
  showAvailability?: boolean;
  className?: string;
}

// Preset time slots
const PRESET_SLOTS: TimeSlot[] = [
  { id: 'early', label: 'Early Morning', start: '06:00', end: '08:00', icon: '🌅' },
  { id: 'morning', label: 'Morning', start: '08:00', end: '12:00', icon: '☀️' },
  { id: 'afternoon', label: 'Afternoon', start: '12:00', end: '17:00', icon: '🌤️' },
  { id: 'evening', label: 'Evening', start: '17:00', end: '20:00', icon: '🌙' },
];

// Specific hour slots
const HOUR_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00',
];

export function TimeSlotPicker({
  date,
  technicianId,
  value,
  onSelect,
  showAvailability = true,
  className,
}: TimeSlotPickerProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [customStart, setCustomStart] = useState(value?.start || '08:00');
  const [customEnd, setCustomEnd] = useState(value?.end || '09:00');

  // Get availability data
  const { slots: availableSlots, isLoading } = useAvailableSlots(date, technicianId);

  // Check if a time is available
  const isTimeAvailable = (time: string): boolean => {
    if (!showAvailability || !availableSlots.length) return true;
    const [hour] = time.split(':').map(Number);
    const slot = availableSlots.find((s) => {
      const [slotHour] = s.start.split(':').map(Number);
      return slotHour === hour;
    });
    return slot?.available ?? true;
  };

  // Check if preset slot has availability
  const getPresetAvailability = (preset: TimeSlot): { available: number; total: number } => {
    if (!showAvailability || !availableSlots.length) {
      return { available: 4, total: 4 };
    }

    const [startHour] = preset.start.split(':').map(Number);
    const [endHour] = preset.end.split(':').map(Number);
    let available = 0;
    let total = 0;

    for (let hour = startHour; hour < endHour; hour++) {
      total++;
      const slot = availableSlots.find((s) => {
        const [slotHour] = s.start.split(':').map(Number);
        return slotHour === hour;
      });
      if (slot?.available) {
        available++;
      }
    }

    return { available, total };
  };

  // Handle preset selection
  const handlePresetSelect = (preset: TimeSlot) => {
    onSelect({ start: preset.start, end: preset.end });
  };

  // Handle custom time selection
  const handleCustomApply = () => {
    onSelect({ start: customStart, end: customEnd });
  };

  // Handle hour slot selection
  const handleHourSelect = (hour: string) => {
    const [h] = hour.split(':').map(Number);
    const endHour = `${String(h + 1).padStart(2, '0')}:00`;
    onSelect({ start: hour, end: endHour });
  };

  // Check if value matches a preset
  const selectedPreset = value
    ? PRESET_SLOTS.find((p) => p.start === value.start && p.end === value.end)?.id
    : null;

  // Check if value matches an hour slot
  const selectedHour = value?.start;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Mode toggle */}
      <div className="flex items-center gap-1 bg-bg-muted rounded-lg p-1">
        <button
          type="button"
          onClick={() => setMode('preset')}
          className={cn(
            'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            mode === 'preset'
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          Presets
        </button>
        <button
          type="button"
          onClick={() => setMode('custom')}
          className={cn(
            'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            mode === 'custom'
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          Custom
        </button>
      </div>

      {mode === 'preset' ? (
        <>
          {/* Preset slots */}
          <div className="grid grid-cols-2 gap-2">
            {PRESET_SLOTS.map((preset) => {
              const availability = getPresetAvailability(preset);
              const isSelected = selectedPreset === preset.id;
              const hasAvailability = availability.available > 0;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  disabled={!hasAvailability}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-bg-hover',
                    !hasAvailability && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{preset.icon}</span>
                    <span className="font-medium text-sm text-text-primary">
                      {preset.label}
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary">
                    {preset.start.slice(0, 5)} - {preset.end.slice(0, 5)}
                  </div>
                  {showAvailability && (
                    <div className="mt-2 flex items-center gap-1">
                      <div className="flex-1 h-1.5 bg-bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            availability.available === availability.total
                              ? 'bg-success'
                              : availability.available > 0
                              ? 'bg-warning'
                              : 'bg-danger'
                          )}
                          style={{
                            width: `${(availability.available / availability.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-text-muted">
                        {availability.available}/{availability.total}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick hour selection */}
          <div>
            <div className="text-xs font-medium text-text-secondary mb-2">
              Or select specific hour:
            </div>
            <div className="grid grid-cols-7 gap-1">
              {HOUR_SLOTS.map((hour) => {
                const isAvailable = isTimeAvailable(hour);
                const isSelected = selectedHour === hour;

                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => handleHourSelect(hour)}
                    disabled={!isAvailable}
                    className={cn(
                      'p-1.5 text-xs rounded border transition-all',
                      isSelected
                        ? 'border-primary bg-primary text-white'
                        : isAvailable
                        ? 'border-border hover:border-primary/50 text-text-primary'
                        : 'border-border bg-bg-muted text-text-muted cursor-not-allowed'
                    )}
                  >
                    {hour.slice(0, 5)}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* Custom time selection */
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Start Time
              </label>
              <Input
                type="time"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                min="06:00"
                max="19:00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                End Time
              </label>
              <Input
                type="time"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                min="07:00"
                max="20:00"
              />
            </div>
          </div>

          {/* Duration display */}
          <div className="flex items-center justify-between p-2 bg-bg-muted rounded">
            <span className="text-sm text-text-secondary">Duration:</span>
            <span className="text-sm font-medium text-text-primary">
              {(() => {
                const [startH, startM] = customStart.split(':').map(Number);
                const [endH, endM] = customEnd.split(':').map(Number);
                const diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                const hours = Math.floor(diffMinutes / 60);
                const minutes = diffMinutes % 60;
                if (diffMinutes <= 0) return 'Invalid';
                return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
              })()}
            </span>
          </div>

          <Button
            type="button"
            onClick={handleCustomApply}
            className="w-full"
            disabled={customStart >= customEnd}
          >
            Apply Custom Time
          </Button>
        </div>
      )}

      {/* Current selection display */}
      {value && (
        <div className="flex items-center justify-between p-3 bg-bg-hover rounded-lg border border-border">
          <div>
            <div className="text-xs text-text-secondary">Selected time:</div>
            <div className="font-medium text-text-primary">
              {value.start.slice(0, 5)} - {value.end.slice(0, 5)}
            </div>
          </div>
          <Badge variant="success">Selected</Badge>
        </div>
      )}

      {/* Loading state */}
      {isLoading && showAvailability && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          <span className="ml-2 text-sm text-text-secondary">
            Checking availability...
          </span>
        </div>
      )}
    </div>
  );
}
