import { Button } from "@/components/ui/Button.tsx";
import { useExportCommissions } from "@/api/hooks/usePayroll.ts";
import type { CommissionFilters } from "@/api/types/payroll.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";
import { Download } from "lucide-react";

interface ExportButtonProps {
  filters: CommissionFilters;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

export function ExportButton({ filters }: ExportButtonProps) {
  const exportMutation = useExportCommissions();

  const handleExport = async () => {
    try {
      const blob = await exportMutation.mutateAsync(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `commissions-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toastSuccess("Export Complete", "Commissions exported successfully");
    } catch (error) {
      toastError("Export Failed", getErrorMessage(error));
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleExport}
      disabled={exportMutation.isPending}
    >
      <Download className="w-4 h-4 mr-2" />
      {exportMutation.isPending ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
