import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { useIsMobileOrTablet } from "@/hooks/useMediaQuery";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  useBookings,
  useBooking,
  useCaptureBookingPayment,
  useCancelBooking,
} from "@/api/hooks/useBookings.ts";
import type { Booking } from "@/api/types/booking.ts";
import { formatDate, formatCurrency } from "@/lib/utils.ts";

const STATUS_COLORS: Record<
  string,
  "default" | "success" | "warning" | "danger"
> = {
  confirmed: "default",
  in_progress: "warning",
  completed: "success",
  cancelled: "danger",
};

const PAYMENT_COLORS: Record<
  string,
  "default" | "success" | "warning" | "danger"
> = {
  pending: "default",
  preauthorized: "warning",
  captured: "success",
  refunded: "danger",
  failed: "danger",
  test: "default",
};

function BookingRow({
  booking,
  onSelect,
}: {
  booking: Booking;
  onSelect: (b: Booking) => void;
}) {
  const name = [booking.customer_first_name, booking.customer_last_name]
    .filter(Boolean)
    .join(" ") || "Unknown";

  return (
    <tr
      className="border-b border-border hover:bg-surface-secondary cursor-pointer"
      onClick={() => onSelect(booking)}
    >
      <td className="px-4 py-3 text-sm font-mono">
        {booking.id.slice(0, 8)}
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-text-secondary">{booking.customer_phone}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        {booking.scheduled_date ? formatDate(booking.scheduled_date) : "TBD"}
      </td>
      <td className="px-4 py-3 text-sm capitalize">
        {booking.time_slot || "Any"}
      </td>
      <td className="px-4 py-3">
        <Badge variant={STATUS_COLORS[booking.status] || "default"}>
          {booking.status.replace("_", " ")}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <Badge variant={PAYMENT_COLORS[booking.payment_status] || "default"}>
          {booking.payment_status}
        </Badge>
      </td>
      <td className="px-4 py-3 text-sm text-right">
        {booking.final_amount
          ? formatCurrency(Number(booking.final_amount))
          : booking.base_price
            ? formatCurrency(Number(booking.base_price))
            : "$575.00"}
      </td>
      <td className="px-4 py-3 text-sm">
        {booking.is_test && (
          <Badge variant="default">TEST</Badge>
        )}
      </td>
    </tr>
  );
}

function CaptureModal({
  booking,
  onClose,
}: {
  booking: Booking;
  onClose: () => void;
}) {
  const [gallons, setGallons] = useState("");
  const [notes, setNotes] = useState("");
  const captureMutation = useCaptureBookingPayment();

  const handleCapture = async () => {
    if (!gallons || isNaN(Number(gallons))) return;
    await captureMutation.mutateAsync({
      bookingId: booking.id,
      actual_gallons: Number(gallons),
      notes: notes || undefined,
    });
    onClose();
  };

  const estimatedAmount =
    gallons && Number(gallons) > (booking.included_gallons || 1750)
      ? Number(booking.base_price || 575) +
        (Number(gallons) - (booking.included_gallons || 1750)) *
          Number(booking.overage_rate || 0.45)
      : Number(booking.base_price || 575);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>Capture Payment</DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Actual Gallons Pumped
              </label>
              <input
                type="number"
                value={gallons}
                onChange={(e) => setGallons(e.target.value)}
                placeholder="e.g. 1500"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary"
                min="0"
                max="50000"
              />
            </div>

            {gallons && Number(gallons) > 0 && (
              <div className="bg-surface-secondary p-3 rounded-md text-sm">
                <div className="flex justify-between">
                  <span>Base price ({booking.included_gallons || 1750} gal included)</span>
                  <span>{formatCurrency(Number(booking.base_price || 575))}</span>
                </div>
                {Number(gallons) > (booking.included_gallons || 1750) && (
                  <div className="flex justify-between text-orange-600">
                    <span>
                      Overage: {Number(gallons) - (booking.included_gallons || 1750)} gal @{" "}
                      {formatCurrency(Number(booking.overage_rate || 0.45))}/gal
                    </span>
                    <span>
                      {formatCurrency(
                        (Number(gallons) - (booking.included_gallons || 1750)) *
                          Number(booking.overage_rate || 0.45),
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-border pt-2 mt-2">
                  <span>Total</span>
                  <span>{formatCurrency(estimatedAmount)}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Service notes..."
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary"
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCapture}
            disabled={!gallons || captureMutation.isPending}
          >
            {captureMutation.isPending ? "Capturing..." : "Capture Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BookingDetailModal({
  bookingId,
  onClose,
}: {
  bookingId: string;
  onClose: () => void;
}) {
  const { data: booking } = useBooking(bookingId);
  const cancelMutation = useCancelBooking();
  const [showCapture, setShowCapture] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!booking) return null;

  const name = [booking.customer_first_name, booking.customer_last_name]
    .filter(Boolean)
    .join(" ") || "Unknown";

  const handleCancel = async () => {
    await cancelMutation.mutateAsync(booking.id);
    setShowCancelConfirm(false);
    onClose();
  };

  if (showCapture) {
    return <CaptureModal booking={booking} onClose={() => setShowCapture(false)} />;
  }

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>Booking Details</DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              {/* Customer info */}
              <div>
                <h4 className="text-sm font-medium text-text-secondary mb-1">
                  Customer
                </h4>
                <p className="font-medium">{name}</p>
                {booking.customer_phone && (
                  <p className="text-sm text-text-secondary">
                    {booking.customer_phone}
                  </p>
                )}
                {booking.customer_email && (
                  <p className="text-sm text-text-secondary">
                    {booking.customer_email}
                  </p>
                )}
              </div>

              {/* Service details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-1">
                    Service
                  </h4>
                  <p className="text-sm capitalize">{booking.service_type}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-1">
                    Date
                  </h4>
                  <p className="text-sm">
                    {booking.scheduled_date
                      ? formatDate(booking.scheduled_date)
                      : "TBD"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-1">
                    Time Slot
                  </h4>
                  <p className="text-sm capitalize">
                    {booking.time_slot || "Any"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-1">
                    Status
                  </h4>
                  <Badge variant={STATUS_COLORS[booking.status] || "default"}>
                    {booking.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>

              {/* Address */}
              {booking.service_address && (
                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-1">
                    Service Address
                  </h4>
                  <p className="text-sm">{booking.service_address}</p>
                </div>
              )}

              {/* Payment */}
              <div className="bg-surface-secondary p-3 rounded-md">
                <h4 className="text-sm font-medium mb-2">Payment</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-text-secondary">Status:</span>
                  <Badge
                    variant={
                      PAYMENT_COLORS[booking.payment_status] || "default"
                    }
                  >
                    {booking.payment_status}
                  </Badge>
                  <span className="text-text-secondary">Base Price:</span>
                  <span>
                    {formatCurrency(Number(booking.base_price || 575))}
                  </span>
                  {booking.preauth_amount && (
                    <>
                      <span className="text-text-secondary">Pre-auth:</span>
                      <span>
                        {formatCurrency(Number(booking.preauth_amount))}
                      </span>
                    </>
                  )}
                  {booking.actual_gallons != null && (
                    <>
                      <span className="text-text-secondary">
                        Actual Gallons:
                      </span>
                      <span>{booking.actual_gallons}</span>
                    </>
                  )}
                  {booking.final_amount != null && (
                    <>
                      <span className="text-text-secondary font-medium">
                        Final Amount:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(Number(booking.final_amount))}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Notes */}
              {booking.customer_notes && (
                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-1">
                    Customer Notes
                  </h4>
                  <p className="text-sm bg-surface-secondary p-2 rounded">
                    {booking.customer_notes}
                  </p>
                </div>
              )}

              {/* Links */}
              <div className="flex gap-2">
                {booking.work_order_id && (
                  <Link to={`/work-orders/${booking.work_order_id}`}>
                    <Button variant="outline" size="sm">
                      View Work Order
                    </Button>
                  </Link>
                )}
                {booking.customer_id && (
                  <Link to={`/customers/${booking.customer_id}`}>
                    <Button variant="outline" size="sm">
                      View Customer
                    </Button>
                  </Link>
                )}
              </div>

              {booking.is_test && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-sm text-yellow-800 dark:text-yellow-200">
                  This is a test booking — no real payment was processed.
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            {booking.status !== "cancelled" &&
              booking.status !== "completed" &&
              booking.payment_status !== "captured" && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={cancelMutation.isPending}
                  >
                    Cancel Booking
                  </Button>
                  {(booking.payment_status === "preauthorized" ||
                    booking.payment_status === "test") && (
                    <Button
                      variant="primary"
                      onClick={() => setShowCapture(true)}
                    >
                      Capture Payment
                    </Button>
                  )}
                </>
              )}
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <Dialog open onOpenChange={() => setShowCancelConfirm(false)}>
          <DialogContent>
            <DialogHeader>Cancel Booking?</DialogHeader>
            <DialogBody>
              <p className="text-sm text-text-secondary">
                This will cancel the booking and release any pre-authorized
                payment. This action cannot be undone.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setShowCancelConfirm(false)}
              >
                Keep Booking
              </Button>
              <Button
                variant="danger"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function BookingsPage() {
  const isMobile = useIsMobileOrTablet();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const { data, isLoading, error } = useBookings({
    page,
    page_size: 20,
    status: statusFilter || undefined,
  });

  const bookings = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Bookings</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage customer bookings and payment captures
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-secondary">Total</p>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-secondary">Confirmed</p>
            <p className="text-2xl font-bold text-blue-600">
              {bookings.filter((b) => b.status === "confirmed").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-secondary">Awaiting Capture</p>
            <p className="text-2xl font-bold text-orange-600">
              {bookings.filter((b) => b.payment_status === "preauthorized").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-secondary">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {bookings.filter((b) => b.status === "completed").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
        {["", "confirmed", "in_progress", "completed", "cancelled"].map(
          (status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "primary" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
            >
              {status ? status.replace("_", " ") : "All"}
            </Button>
          ),
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Bookings {total > 0 && `(${total})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-text-secondary">
              Loading bookings...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              Failed to load bookings
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-8 text-center text-text-secondary">
              <p className="text-lg mb-2">No bookings found</p>
              <p className="text-sm">
                Bookings are created when customers submit the online booking
                form.
              </p>
            </div>
          ) : isMobile ? (
            /* Mobile card view */
            <div className="space-y-3 p-4">
              {bookings.map((booking) => {
                const name = [booking.customer_first_name, booking.customer_last_name]
                  .filter(Boolean)
                  .join(" ") || "Unknown";
                return (
                  <article
                    key={booking.id}
                    className="bg-bg-card border border-border rounded-xl p-4 cursor-pointer active:bg-bg-hover transition-colors touch-manipulation"
                    onClick={() => setSelectedBookingId(booking.id)}
                    aria-label={`Booking for ${name}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-text-primary">{name}</h3>
                        {booking.customer_phone && (
                          <p className="text-sm text-text-secondary">{booking.customer_phone}</p>
                        )}
                      </div>
                      <span className="text-lg font-semibold text-text-primary">
                        {booking.final_amount
                          ? formatCurrency(Number(booking.final_amount))
                          : booking.base_price
                            ? formatCurrency(Number(booking.base_price))
                            : "$575.00"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={STATUS_COLORS[booking.status] || "default"}>
                        {booking.status.replace("_", " ")}
                      </Badge>
                      <Badge variant={PAYMENT_COLORS[booking.payment_status] || "default"}>
                        {booking.payment_status}
                      </Badge>
                      {booking.is_test && <Badge variant="default">TEST</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                      <span>{booking.scheduled_date ? formatDate(booking.scheduled_date) : "TBD"}</span>
                      <span className="capitalize">{booking.time_slot || "Any time"}</span>
                      <span className="font-mono text-xs text-text-muted ml-auto">{booking.id.slice(0, 8)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                      Flags
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <BookingRow
                      key={booking.id}
                      booking={booking}
                      onSelect={(b) => setSelectedBookingId(b.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-text-secondary">
                Page {page} of {totalPages} ({total} bookings)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail modal */}
      {selectedBookingId && (
        <BookingDetailModal
          bookingId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
        />
      )}
    </div>
  );
}
