import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { OnboardingStep, StepSection } from '../OnboardingStep';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { CSVColumnMapper, type ColumnMapping } from './CSVColumnMapper';
import type { ImportedCustomer } from '../useOnboarding';

export interface ImportCustomersStepProps {
  customers: ImportedCustomer[];
  onAddCustomers: (customers: ImportedCustomer[]) => void;
  onRemoveCustomer: (customerId: string) => void;
  onClearCustomers: () => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

interface ManualCustomerForm {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface CSVParseData {
  headers: string[];
  rows: string[][];
}

const EMPTY_FORM: ManualCustomerForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
};

/**
 * Parse CSV content to customer objects
 */
function parseCSV(content: string): ImportedCustomer[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());
  const customers: ImportedCustomer[] = [];

  // Find column indices
  const nameIdx = headers.findIndex((h) => h.includes('name'));
  const emailIdx = headers.findIndex((h) => h.includes('email'));
  const phoneIdx = headers.findIndex((h) => h.includes('phone'));
  const addressIdx = headers.findIndex((h) => h.includes('address'));

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));

    if (values.length >= 1 && values[nameIdx !== -1 ? nameIdx : 0]) {
      customers.push({
        id: `import-${Date.now()}-${i}`,
        name: nameIdx !== -1 ? values[nameIdx] : values[0],
        email: emailIdx !== -1 ? values[emailIdx] : '',
        phone: phoneIdx !== -1 ? values[phoneIdx] : '',
        address: addressIdx !== -1 ? values[addressIdx] : '',
      });
    }
  }

  return customers;
}

/**
 * Apply column mapping to raw CSV data
 */
function applyMapping(rows: string[][], mapping: ColumnMapping): ImportedCustomer[] {
  return rows
    .filter(row => mapping.name !== null && row[mapping.name]?.trim())
    .map((row, idx) => ({
      id: `import-${Date.now()}-${idx}`,
      name: mapping.name !== null ? row[mapping.name] || '' : '',
      email: mapping.email !== null ? row[mapping.email] || '' : '',
      phone: mapping.phone !== null ? row[mapping.phone] || '' : '',
      address: [
        mapping.address !== null ? row[mapping.address] : '',
        mapping.city !== null ? row[mapping.city] : '',
        mapping.state !== null ? row[mapping.state] : '',
        mapping.zipCode !== null ? row[mapping.zipCode] : '',
      ].filter(Boolean).join(', '),
    }));
}

/**
 * Step 2: Import Customers
 * CSV upload or manual entry for customer import
 */
export function ImportCustomersStep({
  customers,
  onAddCustomers,
  onRemoveCustomer,
  onClearCustomers,
  onNext,
  onBack,
  onSkip,
}: ImportCustomersStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [csvData, setCsvData] = useState<CSVParseData | null>(null);
  const [manualForm, setManualForm] = useState<ManualCustomerForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFile = (file: File, useMapper: boolean = false) => {
    setError(null);

    // Validate file type
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      setError('Please upload a CSV file');
      return;
    }

    // Read file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.trim().split('\n');

        if (lines.length < 2) {
          setError('CSV file must have a header row and at least one data row.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1).map(line =>
          line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        );

        if (useMapper) {
          // Show the column mapper for manual mapping
          setCsvData({ headers, rows });
          setShowColumnMapper(true);
        } else {
          // Try auto-detection
          const parsed = parseCSV(content);

          if (parsed.length === 0) {
            // Auto-detection failed, show the mapper
            setCsvData({ headers, rows });
            setShowColumnMapper(true);
            return;
          }

          onAddCustomers(parsed);
        }
      } catch {
        setError('Failed to parse CSV file. Please check the format.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleColumnMapComplete = (mapping: ColumnMapping) => {
    if (csvData) {
      const customers = applyMapping(csvData.rows, mapping);
      if (customers.length === 0) {
        setError('No valid customers found with the selected mapping. Make sure the Name column has values.');
        return;
      }
      onAddCustomers(customers);
      setShowColumnMapper(false);
      setCsvData(null);
    }
  };

  const handleMapperCancel = () => {
    setShowColumnMapper(false);
    setCsvData(null);
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleManualFormChange = (field: keyof ManualCustomerForm) => (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    setManualForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleAddManualCustomer = () => {
    if (!manualForm.name.trim()) {
      return;
    }

    const customer: ImportedCustomer = {
      id: `manual-${Date.now()}`,
      name: manualForm.name.trim(),
      email: manualForm.email.trim(),
      phone: manualForm.phone.trim(),
      address: manualForm.address.trim(),
    };

    onAddCustomers([customer]);
    setManualForm(EMPTY_FORM);
  };

  return (
    <OnboardingStep
      title="Import Customers"
      description="Import your existing customers from a CSV file or add them manually."
      isOptional
      isValid
      onNext={onNext}
      onBack={onBack}
      onSkip={onSkip}
    >
      <div className="space-y-8">
        {/* CSV Column Mapper */}
        {showColumnMapper && csvData && (
          <CSVColumnMapper
            headers={csvData.headers}
            sampleData={csvData.rows}
            onMapComplete={handleColumnMapComplete}
            onCancel={handleMapperCancel}
          />
        )}

        {/* Upload Zone */}
        {!showManualForm && !showColumnMapper && (
          <StepSection title="Upload CSV">
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex flex-col items-center gap-3">
                <div className="text-4xl">CSV</div>
                <div>
                  <p className="text-text-primary font-medium mb-1">
                    {isDragging ? 'Drop CSV file here' : 'Drag and drop CSV file here'}
                  </p>
                  <p className="text-sm text-text-muted mb-3">or</p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleClickUpload}
                  >
                    Browse Files
                  </Button>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  CSV should have columns: Name, Email, Phone, Address
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-md">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowManualForm(true)}
                className="text-sm text-primary hover:underline"
              >
                Or add customers manually
              </button>
            </div>
          </StepSection>
        )}

        {/* Manual Entry Form */}
        {showManualForm && !showColumnMapper && (
          <StepSection title="Add Customer Manually">
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Name"
                  placeholder="John Smith"
                  value={manualForm.name}
                  onChange={handleManualFormChange('name')}
                  required
                />
                <FormField
                  label="Email"
                  type="email"
                  placeholder="john@example.com"
                  value={manualForm.email}
                  onChange={handleManualFormChange('email')}
                />
                <FormField
                  label="Phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={manualForm.phone}
                  onChange={handleManualFormChange('phone')}
                />
                <FormField
                  label="Address"
                  placeholder="123 Main St, Tampa, FL 33601"
                  value={manualForm.address}
                  onChange={handleManualFormChange('address')}
                />
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  type="button"
                  onClick={handleAddManualCustomer}
                  disabled={!manualForm.name.trim()}
                >
                  Add Customer
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowManualForm(false)}
                >
                  Back to CSV upload
                </Button>
              </div>
            </Card>
          </StepSection>
        )}

        {/* Imported Customers List */}
        {customers.length > 0 && !showColumnMapper && (
          <StepSection title={`Imported Customers (${customers.length})`}>
            <div className="flex justify-end mb-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClearCustomers}
              >
                Clear all
              </Button>
            </div>
            <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-auto">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-3 hover:bg-bg-hover"
                >
                  <div>
                    <p className="font-medium text-text-primary">{customer.name}</p>
                    <p className="text-sm text-text-muted">
                      {[customer.email, customer.phone].filter(Boolean).join(' | ') || 'No contact info'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveCustomer(customer.id)}
                    className="text-text-muted hover:text-danger p-1"
                    aria-label="Remove customer"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          </StepSection>
        )}
      </div>
    </OnboardingStep>
  );
}
