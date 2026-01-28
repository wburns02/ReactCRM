import { useState } from "react";
import { Button } from "@/components/ui/Button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/Dialog.tsx";
import { CheckCircle, XCircle, DollarSign } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  onApproveAll: () => Promise<void>;
  onMarkPaid: () => Promise<void>;
  onClear: () => void;
  isApproving?: boolean;
  isMarkingPaid?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  onApproveAll,
  onMarkPaid,
  onClear,
  isApproving,
  isMarkingPaid,
}: BulkActionsBarProps) {
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showPaidConfirm, setShowPaidConfirm] = useState(false);

  const handleApprove = async () => {
    await onApproveAll();
    setShowApproveConfirm(false);
  };

  const handleMarkPaid = async () => {
    await onMarkPaid();
    setShowPaidConfirm(false);
  };

  return (
    <>
      <div className="sticky top-0 z-10 bg-primary/10 border border-primary/30 rounded-lg p-3 mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">
          {selectedCount} commission{selectedCount !== 1 ? "s" : ""} selected
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClear}>
            <XCircle className="w-4 h-4 mr-1" />
            Clear Selection
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowApproveConfirm(true)}
            disabled={isApproving || isMarkingPaid}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            {isApproving ? "Approving..." : "Approve All"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowPaidConfirm(true)}
            disabled={isApproving || isMarkingPaid}
            className="bg-success/20 hover:bg-success/30 text-success border-success/30"
          >
            <DollarSign className="w-4 h-4 mr-1" />
            {isMarkingPaid ? "Processing..." : "Mark All Paid"}
          </Button>
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Commissions</DialogTitle>
          </DialogHeader>
          <p className="text-text-secondary py-4">
            Are you sure you want to approve {selectedCount} commission
            {selectedCount !== 1 ? "s" : ""}? This action will move them to the
            approved status.
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowApproveConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApprove}
              disabled={isApproving}
            >
              {isApproving ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Paid Confirmation Dialog */}
      <Dialog open={showPaidConfirm} onOpenChange={setShowPaidConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
          </DialogHeader>
          <p className="text-text-secondary py-4">
            Are you sure you want to mark {selectedCount} commission
            {selectedCount !== 1 ? "s" : ""} as paid? This indicates the
            technician has received payment.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPaidConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleMarkPaid}
              disabled={isMarkingPaid}
              className="bg-success hover:bg-success/90"
            >
              {isMarkingPaid ? "Processing..." : "Mark as Paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
