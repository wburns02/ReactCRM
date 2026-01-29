import { useState } from "react";
import {
  useTechnicianPayRates,
  useDumpSitesForCosting,
  useCalculateLabor,
  useCalculateDumpFee,
  useCalculateCommission,
  useCreateJobCost,
} from "../api/jobCosting";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

interface JobCostCalculatorProps {
  workOrderId?: string;
  jobTotal?: number;
  onCostAdded?: () => void;
}

export function JobCostCalculator({
  workOrderId,
  jobTotal = 0,
  onCostAdded,
}: JobCostCalculatorProps) {
  // Form state
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");
  const [hours, setHours] = useState<number>(0);
  const [selectedDumpSite, setSelectedDumpSite] = useState<string>("");
  const [gallons, setGallons] = useState<number>(0);
  const [materialCost, setMaterialCost] = useState<number>(0);
  const [materialDescription, setMaterialDescription] = useState<string>("");

  // Data hooks
  const { data: techData } = useTechnicianPayRates();
  const { data: dumpData } = useDumpSitesForCosting();

  // Calculation hooks
  const { data: laborCalc } = useCalculateLabor(selectedTechnician, hours);
  const { data: dumpFeeCalc } = useCalculateDumpFee(selectedDumpSite, gallons);
  const { data: commissionCalc } = useCalculateCommission(
    selectedTechnician,
    jobTotal,
    dumpFeeCalc?.total_dump_fee || 0
  );

  const createCost = useCreateJobCost();

  // Calculate totals
  const laborCost = laborCalc?.total_labor_cost || 0;
  const dumpFee = dumpFeeCalc?.total_dump_fee || 0;
  const commission = commissionCalc?.commission_amount || 0;
  const totalCost = laborCost + dumpFee + materialCost;
  const grossProfit = jobTotal - totalCost - commission;
  const profitMargin = jobTotal > 0 ? (grossProfit / jobTotal) * 100 : 0;

  const getMarginColor = (margin: number) => {
    if (margin >= 35) return "text-green-500";
    if (margin >= 25) return "text-yellow-500";
    return "text-red-500";
  };

  const handleAddLaborCost = async () => {
    if (!workOrderId || !selectedTechnician || hours <= 0) return;

    try {
      await createCost.mutateAsync({
        work_order_id: workOrderId,
        cost_type: "labor",
        description: `Labor - ${laborCalc?.technician_name || "Technician"}`,
        quantity: hours,
        unit: "hour",
        unit_cost: laborCalc?.hourly_rate || laborCalc?.hourly_equivalent || 25,
        technician_id: selectedTechnician,
        technician_name: laborCalc?.technician_name,
        cost_date: new Date().toISOString().split("T")[0],
        is_billable: true,
      });
      setHours(0);
      onCostAdded?.();
    } catch (error) {
      console.error("Failed to add labor cost:", error);
    }
  };

  const handleAddDumpFee = async () => {
    if (!workOrderId || !selectedDumpSite || gallons <= 0) return;

    try {
      await createCost.mutateAsync({
        work_order_id: workOrderId,
        cost_type: "disposal",
        description: `Dump Fee - ${dumpFeeCalc?.dump_site_name || "Dump Site"} (${gallons} gal)`,
        quantity: gallons,
        unit: "gallon",
        unit_cost: dumpFeeCalc?.fee_per_gallon || 0.07,
        cost_date: new Date().toISOString().split("T")[0],
        is_billable: true,
      });
      setGallons(0);
      onCostAdded?.();
    } catch (error) {
      console.error("Failed to add dump fee:", error);
    }
  };

  const handleAddMaterialCost = async () => {
    if (!workOrderId || materialCost <= 0 || !materialDescription) return;

    try {
      await createCost.mutateAsync({
        work_order_id: workOrderId,
        cost_type: "materials",
        description: materialDescription,
        quantity: 1,
        unit: "each",
        unit_cost: materialCost,
        cost_date: new Date().toISOString().split("T")[0],
        is_billable: true,
      });
      setMaterialCost(0);
      setMaterialDescription("");
      onCostAdded?.();
    } catch (error) {
      console.error("Failed to add material cost:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🧮</span>
          Job Cost Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Labor Cost Section */}
        <div className="p-4 border border-border rounded-lg bg-bg-secondary">
          <h4 className="font-medium text-text-primary mb-3 flex items-center gap-2">
            <span>👷</span> Labor Cost
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-text-muted block mb-1">Technician</label>
              <select
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
              >
                <option value="">Select technician</option>
                {techData?.technicians.map((tech) => (
                  <option key={tech.technician_id} value={tech.technician_id}>
                    {tech.name} ({tech.pay_type === "salary" ? "Salary" : `$${tech.hourly_rate || 25}/hr`})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-text-muted block mb-1">Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={hours || ""}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
                placeholder="0.0"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-sm text-text-muted block mb-1">Labor Cost</label>
                <div className="text-xl font-bold text-text-primary">
                  {formatCurrency(laborCost)}
                </div>
                {laborCalc && laborCalc.overtime_hours > 0 && (
                  <span className="text-xs text-warning">
                    Includes {laborCalc.overtime_hours}h OT
                  </span>
                )}
              </div>
              {workOrderId && (
                <Button
                  size="sm"
                  onClick={handleAddLaborCost}
                  disabled={!selectedTechnician || hours <= 0 || createCost.isPending}
                >
                  Add
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Dump Fee Section */}
        <div className="p-4 border border-border rounded-lg bg-bg-secondary">
          <h4 className="font-medium text-text-primary mb-3 flex items-center gap-2">
            <span>🗑️</span> Dump Fee Calculator
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-text-muted block mb-1">Dump Site</label>
              <select
                value={selectedDumpSite}
                onChange={(e) => setSelectedDumpSite(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
              >
                <option value="">Select dump site</option>
                {dumpData?.sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.state}) - ${site.fee_per_gallon}/gal
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-text-muted block mb-1">Gallons</label>
              <input
                type="number"
                min="0"
                step="100"
                value={gallons || ""}
                onChange={(e) => setGallons(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
                placeholder="0"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-sm text-text-muted block mb-1">Dump Fee</label>
                <div className="text-xl font-bold text-text-primary">
                  {formatCurrency(dumpFee)}
                </div>
                {dumpFeeCalc && (
                  <span className="text-xs text-text-muted">
                    {dumpFeeCalc.gallons} gal × ${dumpFeeCalc.fee_per_gallon}/gal
                  </span>
                )}
              </div>
              {workOrderId && (
                <Button
                  size="sm"
                  onClick={handleAddDumpFee}
                  disabled={!selectedDumpSite || gallons <= 0 || createCost.isPending}
                >
                  Add
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Material Cost Section */}
        <div className="p-4 border border-border rounded-lg bg-bg-secondary">
          <h4 className="font-medium text-text-primary mb-3 flex items-center gap-2">
            <span>📦</span> Material Cost
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-text-muted block mb-1">Description</label>
              <input
                type="text"
                value={materialDescription}
                onChange={(e) => setMaterialDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
                placeholder="Parts, supplies, etc."
              />
            </div>
            <div>
              <label className="text-sm text-text-muted block mb-1">Cost</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={materialCost || ""}
                onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
                placeholder="0.00"
              />
            </div>
            <div className="flex items-end">
              {workOrderId && (
                <Button
                  size="sm"
                  onClick={handleAddMaterialCost}
                  disabled={!materialDescription || materialCost <= 0 || createCost.isPending}
                >
                  Add Material Cost
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Commission Section */}
        {selectedTechnician && jobTotal > 0 && (
          <div className="p-4 border border-purple-500/30 rounded-lg bg-purple-500/10">
            <h4 className="font-medium text-text-primary mb-3 flex items-center gap-2">
              <span>💰</span> Commission Calculation
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-text-muted">Job Total</p>
                <p className="text-lg font-bold text-text-primary">{formatCurrency(jobTotal)}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Less Dump Fee</p>
                <p className="text-lg font-bold text-warning">-{formatCurrency(dumpFee)}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Commissionable</p>
                <p className="text-lg font-bold text-text-primary">
                  {formatCurrency(commissionCalc?.commissionable_amount || (jobTotal - dumpFee))}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-muted">
                  Commission ({commissionCalc?.commission_rate_percent || 0}%)
                </p>
                <p className="text-lg font-bold text-purple-500">{formatCurrency(commission)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Section */}
        <div className="p-4 border-2 border-primary rounded-lg bg-bg-secondary">
          <h4 className="font-medium text-text-primary mb-3 flex items-center gap-2">
            <span>📊</span> Cost Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-bg-hover rounded-lg text-center">
              <p className="text-sm text-text-muted">Total Costs</p>
              <p className="text-xl font-bold text-danger">{formatCurrency(totalCost)}</p>
            </div>
            <div className="p-3 bg-bg-hover rounded-lg text-center">
              <p className="text-sm text-text-muted">Commission</p>
              <p className="text-xl font-bold text-purple-500">{formatCurrency(commission)}</p>
            </div>
            <div className="p-3 bg-bg-hover rounded-lg text-center">
              <p className="text-sm text-text-muted">Gross Profit</p>
              <p className={`text-xl font-bold ${grossProfit >= 0 ? "text-success" : "text-danger"}`}>
                {formatCurrency(grossProfit)}
              </p>
            </div>
            <div className="p-3 bg-bg-hover rounded-lg text-center">
              <p className="text-sm text-text-muted">Profit Margin</p>
              <p className={`text-xl font-bold ${getMarginColor(profitMargin)}`}>
                {profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Margin Indicator */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>0%</span>
              <span>25%</span>
              <span>35%</span>
              <span>50%+</span>
            </div>
            <div className="h-3 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full relative">
              <div
                className="absolute w-3 h-5 bg-white border-2 border-gray-800 rounded -top-1"
                style={{
                  left: `${Math.min(Math.max(profitMargin, 0), 50) * 2}%`,
                  transform: "translateX(-50%)",
                }}
              />
            </div>
            <div className="text-center mt-2">
              {profitMargin < 20 && (
                <span className="text-xs text-danger">
                  ⚠️ Low margin - review costs or pricing
                </span>
              )}
              {profitMargin >= 20 && profitMargin < 35 && (
                <span className="text-xs text-warning">
                  ⚡ Acceptable margin - room for improvement
                </span>
              )}
              {profitMargin >= 35 && (
                <span className="text-xs text-success">
                  ✓ Healthy profit margin
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
