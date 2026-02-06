import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { WorkOrderForm } from "./components/WorkOrderForm.tsx";
import { useCreateWorkOrder } from "@/api/hooks/useWorkOrders.ts";
import { type WorkOrderFormData } from "@/api/types/workOrder.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast";

/**
 * New Work Order Page
 * Shows the work order creation form in a modal-like view
 */
export function NewWorkOrderPage() {
  const [isFormOpen, setIsFormOpen] = useState(true);
  const navigate = useNavigate();
  const createWorkOrder = useCreateWorkOrder();

  // Auto-open form on mount
  useEffect(() => {
    setIsFormOpen(true);
  }, []);

  const handleClose = () => {
    setIsFormOpen(false);
    // Navigate back to schedule or work orders list after closing
    navigate(-1);
  };

  const handleSubmit = async (data: WorkOrderFormData) => {
    try {
      const newWorkOrder = await createWorkOrder.mutateAsync(data);
      toastSuccess("Work order created successfully");
      setIsFormOpen(false);
      // Navigate to the new work order detail page
      navigate(`/work-orders/${newWorkOrder.id}`);
    } catch (error) {
      console.error("Failed to create work order:", error);
      toastError("Failed to create work order. Please try again.");
      throw error; // Let form handle error state
    }
  };

  return (
    <div className="p-6">
      <WorkOrderForm
        open={isFormOpen}
        onClose={handleClose}
        onSubmit={handleSubmit}
        isLoading={createWorkOrder.isPending}
      />
    </div>
  );
}
