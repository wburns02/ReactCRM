import { useState, useEffect } from "react";
import { useClockIn, useClockOut } from "../api/timeTracking.ts";
import { Button } from "@/components/ui/Button.tsx";
import { Card, CardContent } from "@/components/ui/Card.tsx";

interface TimeClockWidgetProps {
  workOrderId?: string;
}

export function TimeClockWidget({ workOrderId }: TimeClockWidgetProps) {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [gettingLocation, setGettingLocation] = useState(false);

  const clockIn = useClockIn();
  const clockOut = useClockOut();

  // Update elapsed time every second when clocked in
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isClockedIn && clockInTime) {
      interval = setInterval(() => {
        const elapsed = Date.now() - clockInTime.getTime();
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        setElapsedTime(
          `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
        );
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isClockedIn, clockInTime]);

  const getLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          // Default to 0,0 if location unavailable
          console.warn("Could not get location:", error);
          resolve({ latitude: 0, longitude: 0 });
        },
        { timeout: 10000, enableHighAccuracy: true },
      );
    });
  };

  const handleClockIn = async () => {
    try {
      setGettingLocation(true);
      const location = await getLocation();

      await clockIn.mutateAsync({
        ...location,
        work_order_id: workOrderId,
      });

      setIsClockedIn(true);
      setClockInTime(new Date());
    } catch (err) {
      console.error("Clock in failed:", err);
    } finally {
      setGettingLocation(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setGettingLocation(true);
      const location = await getLocation();

      await clockOut.mutateAsync({
        ...location,
        work_order_id: workOrderId,
      });

      setIsClockedIn(false);
      setClockInTime(null);
      setElapsedTime("00:00:00");
    } catch (err) {
      console.error("Clock out failed:", err);
    } finally {
      setGettingLocation(false);
    }
  };

  const isPending = clockIn.isPending || clockOut.isPending || gettingLocation;

  return (
    <Card className={isClockedIn ? "border-success" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full text-2xl ${isClockedIn ? "bg-green-100" : "bg-gray-100"}`}
            >
              {isClockedIn ? "🟢" : "⏰"}
            </div>
            <div>
              <p className="font-medium text-text-primary">
                {isClockedIn ? "Clocked In" : "Time Clock"}
              </p>
              {isClockedIn && (
                <p className="text-2xl font-mono font-bold text-success">
                  {elapsedTime}
                </p>
              )}
              {!isClockedIn && (
                <p className="text-sm text-text-muted">
                  Click to start your shift
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={isClockedIn ? handleClockOut : handleClockIn}
            disabled={isPending}
            variant={isClockedIn ? "danger" : "primary"}
            className="min-w-[120px]"
          >
            {isPending
              ? gettingLocation
                ? "Getting Location..."
                : "Processing..."
              : isClockedIn
                ? "Clock Out"
                : "Clock In"}
          </Button>
        </div>

        {clockInTime && (
          <p className="text-xs text-text-muted mt-2">
            Started at {clockInTime.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
