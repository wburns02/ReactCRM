import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Label } from '@/components/ui/Label.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog.tsx';

interface TechnicianPayroll {
  id: string;
  name: string;
  hoursWorked: number;
  hourlyRate: number;
  workOrders: number;
  earnings: number;
}

// Mock data for technicians
const MOCK_TECHNICIANS: TechnicianPayroll[] = [
  { id: '1', name: 'John Smith', hoursWorked: 42, hourlyRate: 25, workOrders: 12, earnings: 1050 },
  { id: '2', name: 'Mike Johnson', hoursWorked: 38, hourlyRate: 28, workOrders: 10, earnings: 1064 },
  { id: '3', name: 'Sarah Williams', hoursWorked: 45, hourlyRate: 30, workOrders: 15, earnings: 1350 },
  { id: '4', name: 'David Brown', hoursWorked: 40, hourlyRate: 26, workOrders: 11, earnings: 1040 },
  { id: '5', name: 'Emily Davis', hoursWorked: 36, hourlyRate: 27, workOrders: 9, earnings: 972 },
];

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 14); // Two weeks ago
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function PayrollPage() {
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [technicians, setTechnicians] = useState<TechnicianPayroll[]>(MOCK_TECHNICIANS);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const totalEarnings = technicians.reduce((sum, t) => sum + t.earnings, 0);
  const totalHours = technicians.reduce((sum, t) => sum + t.hoursWorked, 0);
  const totalWorkOrders = technicians.reduce((sum, t) => sum + t.workOrders, 0);

  const handleRunPayroll = useCallback(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setTechnicians(MOCK_TECHNICIANS);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleProcessPayroll = useCallback(async () => {
    setIsProcessing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsProcessing(false);
    setShowConfirmDialog(false);
    setShowSuccessMessage(true);
    // Hide success message after 5 seconds
    setTimeout(() => setShowSuccessMessage(false), 5000);
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Payroll</h1>
          <p className="text-sm text-text-secondary mt-1">
            Process employee payroll and view earnings
          </p>
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-6 p-4 bg-success/10 border border-success rounded-lg">
          <p className="text-success font-medium">
            Payroll processed successfully! All technicians have been paid.
          </p>
        </div>
      )}

      {/* Date Range Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payroll Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-48">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleRunPayroll} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Run Payroll Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Total Earnings</div>
            <div className="text-2xl font-bold text-primary">${totalEarnings.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Total Hours</div>
            <div className="text-2xl font-bold text-text-primary">{totalHours}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Work Orders Completed</div>
            <div className="text-2xl font-bold text-text-primary">{totalWorkOrders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Technicians Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Technician Earnings</CardTitle>
          <Button onClick={() => setShowConfirmDialog(true)}>
            Process Payroll
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-bg-subtle border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Technician</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Hours Worked</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Hourly Rate</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Work Orders</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {technicians.map((tech) => (
                <tr key={tech.id} className="hover:bg-bg-hover">
                  <td className="px-4 py-3 font-medium text-text-primary">{tech.name}</td>
                  <td className="px-4 py-3 text-right text-text-primary">{tech.hoursWorked}</td>
                  <td className="px-4 py-3 text-right text-text-primary">${tech.hourlyRate.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-text-primary">{tech.workOrders}</td>
                  <td className="px-4 py-3 text-right font-medium text-primary">${tech.earnings.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-bg-subtle border-t border-border">
              <tr>
                <td className="px-4 py-3 font-semibold text-text-primary">Total</td>
                <td className="px-4 py-3 text-right font-semibold text-text-primary">{totalHours}</td>
                <td className="px-4 py-3 text-right text-text-secondary">-</td>
                <td className="px-4 py-3 text-right font-semibold text-text-primary">{totalWorkOrders}</td>
                <td className="px-4 py-3 text-right font-bold text-primary">${totalEarnings.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Process Payroll Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setShowConfirmDialog(false)}>
            Process Payroll
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary mb-4">
              Are you sure you want to process payroll for the period{' '}
              <span className="font-medium text-text-primary">{startDate}</span> to{' '}
              <span className="font-medium text-text-primary">{endDate}</span>?
            </p>
            <div className="p-4 bg-bg-subtle rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-text-secondary">Technicians:</span>
                <span className="font-medium text-text-primary">{technicians.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Total Amount:</span>
                <span className="font-bold text-primary">${totalEarnings.toLocaleString()}</span>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleProcessPayroll} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Confirm & Process'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
