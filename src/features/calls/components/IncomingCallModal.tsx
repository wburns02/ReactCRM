import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import type { IncomingCallPayload } from "@/api/types/incoming-call";
import { Phone, User, MapPin, Mail, Wrench, Calendar } from "lucide-react";

interface Props {
  call: IncomingCallPayload | null;
  open: boolean;
  onDismiss: () => void;
}

export function IncomingCallModal({ call, open, onDismiss }: Props) {
  const navigate = useNavigate();

  if (!call) return null;

  return (
    <Dialog open={open} onClose={onDismiss} ariaLabel="Incoming Call">
      <DialogContent size="lg">
        <DialogHeader onClose={onDismiss}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Phone className="w-5 h-5 text-green-500" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full" />
            </div>
            Incoming Call
          </div>
        </DialogHeader>

        <DialogBody>
          {/* Caller number */}
          <p className="text-2xl font-mono font-bold text-text-primary mb-4">
            {call.caller_display}
          </p>

          {/* Customer info or unknown */}
          {call.customer ? (
            <div className="bg-bg-hover rounded-lg p-4 mb-4 space-y-2">
              <div className="flex items-center gap-2 text-text-primary font-semibold text-lg">
                <User className="w-5 h-5 text-primary" />
                {call.customer.name}
              </div>
              <div className="flex items-center gap-2 text-text-secondary text-sm">
                <MapPin className="w-4 h-4" />
                {call.customer.address}
              </div>
              {call.customer.email && (
                <div className="flex items-center gap-2 text-text-secondary text-sm">
                  <Mail className="w-4 h-4" />
                  {call.customer.email}
                </div>
              )}
              <div className="flex items-center gap-2 text-text-secondary text-sm">
                <Phone className="w-4 h-4" />
                {call.customer.phone}
              </div>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                Unknown Caller
              </p>
              <p className="text-sm text-text-secondary mt-1">
                No customer found matching this phone number.
              </p>
            </div>
          )}

          {/* Last service */}
          {call.last_service && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-text-secondary mb-2">Last Service</h4>
              <div className="flex items-center gap-3 text-sm bg-bg-hover rounded-md px-3 py-2">
                <Wrench className="w-4 h-4 text-text-muted" />
                <span className="capitalize">{call.last_service.job_type}</span>
                <span className="text-text-muted">-</span>
                <span>{call.last_service.date || "N/A"}</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                  call.last_service.status === "completed"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}>
                  {call.last_service.status}
                </span>
              </div>
            </div>
          )}

          {/* Open work orders */}
          {call.open_work_orders.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-2">
                Open Work Orders ({call.open_work_orders.length})
              </h4>
              <div className="space-y-1.5">
                {call.open_work_orders.map((wo) => (
                  <button
                    key={wo.id}
                    onClick={() => { navigate(`/work-orders/${wo.id}`); onDismiss(); }}
                    className="w-full flex items-center gap-3 text-sm bg-bg-hover rounded-md px-3 py-2 hover:bg-bg-hover/80 transition-colors text-left"
                  >
                    <Calendar className="w-4 h-4 text-text-muted" />
                    <span className="capitalize">{wo.job_type}</span>
                    <span className="text-text-muted">{wo.scheduled_date || "Unscheduled"}</span>
                    <span className="ml-auto text-xs text-text-muted capitalize">{wo.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={onDismiss}>
            Dismiss
          </Button>
          {call.customer ? (
            <Button
              variant="primary"
              onClick={() => { navigate(`/customers/${call.customer!.id}`); onDismiss(); }}
            >
              View Customer
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => { navigate("/customers/new"); onDismiss(); }}
            >
              Create Customer
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => {
              const params = call.customer ? `?customer_id=${call.customer.id}` : "";
              navigate(`/work-orders/new${params}`);
              onDismiss();
            }}
          >
            Create Work Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
