import { useState } from 'react';
import {
  useImportStatus,
  useDownloadTemplate,
  useValidateImport,
  useUploadImport,
  IMPORT_TYPES,
  type ImportType,
  type ImportResult,
} from '../api/import.ts';
import { FileUploader } from '../components/FileUploader.tsx';
import { ImportPreview } from '../components/ImportPreview.tsx';
import { ImportResults } from '../components/ImportResults.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Badge } from '@/components/ui/Badge.tsx';

type Step = 'select-type' | 'upload' | 'preview' | 'results';

export function DataImportPage() {
  const [step, setStep] = useState<Step>('select-type');
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ImportResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [skipErrors, setSkipErrors] = useState(false);

  const { data: status } = useImportStatus();
  const downloadTemplate = useDownloadTemplate();
  const validateImport = useValidateImport();
  const uploadImport = useUploadImport();

  const handleTypeSelect = (type: ImportType) => {
    setSelectedType(type);
    setSelectedFile(null);
    setValidationResult(null);
    setImportResult(null);
    setStep('upload');
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setValidationResult(null);
    setImportResult(null);
    setStep('preview');
  };

  const handleValidate = async () => {
    if (!selectedType || !selectedFile) return;

    try {
      const result = await validateImport.mutateAsync({
        importType: selectedType,
        file: selectedFile,
      });
      setValidationResult(result);
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const handleImport = async () => {
    if (!selectedType || !selectedFile) return;

    try {
      const result = await uploadImport.mutateAsync({
        importType: selectedType,
        file: selectedFile,
        skipErrors,
      });
      setImportResult(result);
      setStep('results');
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const handleReset = () => {
    setStep('select-type');
    setSelectedType(null);
    setSelectedFile(null);
    setValidationResult(null);
    setImportResult(null);
    setSkipErrors(false);
  };

  const handleDownloadTemplate = (includeExamples: boolean) => {
    if (selectedType) {
      downloadTemplate.mutate({ importType: selectedType, includeExamples });
    }
  };

  const selectedTypeInfo = IMPORT_TYPES.find(t => t.value === selectedType);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          📥 Data Import
        </h1>
        <p className="text-text-muted mt-1">
          Import data from CSV files into the system
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-4">
        {['select-type', 'upload', 'preview', 'results'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step === s
                  ? 'bg-primary text-white'
                  : ['select-type', 'upload', 'preview', 'results'].indexOf(step) > i
                    ? 'bg-success text-white'
                    : 'bg-bg-body text-text-muted border border-border'
                }
              `}
            >
              {['select-type', 'upload', 'preview', 'results'].indexOf(step) > i ? '✓' : i + 1}
            </div>
            {i < 3 && (
              <div
                className={`w-12 h-0.5 ${['select-type', 'upload', 'preview', 'results'].indexOf(step) > i ? 'bg-success' : 'bg-border'}`}
              />
            )}
          </div>
        ))}
        <div className="flex-1" />
        {step !== 'select-type' && (
          <Button variant="ghost" onClick={handleReset}>
            Start Over
          </Button>
        )}
      </div>

      {/* Step 1: Select Import Type */}
      {step === 'select-type' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {IMPORT_TYPES.map((type) => (
            <Card
              key={type.value}
              className={`cursor-pointer transition-all hover:border-primary ${
                status?.available_import_types?.includes(type.value)
                  ? ''
                  : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={() => {
                if (status?.available_import_types?.includes(type.value)) {
                  handleTypeSelect(type.value);
                }
              }}
            >
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">{type.icon}</div>
                <h3 className="text-lg font-medium text-text-primary">{type.label}</h3>
                <p className="text-sm text-text-muted mt-2">{type.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 2: Upload File */}
      {step === 'upload' && selectedTypeInfo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedTypeInfo.icon}</span>
                  <CardTitle>Upload {selectedTypeInfo.label} CSV</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <FileUploader
                  onFileSelect={handleFileSelect}
                  maxSizeMB={status?.max_file_size_mb || 10}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📋 Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-text-muted">
                  Download a template to see the required format for {selectedTypeInfo.label.toLowerCase()} import.
                </p>
                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => handleDownloadTemplate(false)}
                    disabled={downloadTemplate.isPending}
                  >
                    📄 Download Template
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => handleDownloadTemplate(true)}
                    disabled={downloadTemplate.isPending}
                  >
                    📝 Template with Examples
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ℹ️ Import Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-text-muted space-y-2">
                  <li>• Use UTF-8 encoding for your CSV file</li>
                  <li>• First row must contain column headers</li>
                  <li>• Required fields cannot be empty</li>
                  <li>• Dates should be in YYYY-MM-DD format</li>
                  <li>• Maximum file size: {status?.max_file_size_mb || 10}MB</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Validate */}
      {step === 'preview' && selectedTypeInfo && (
        <div className="space-y-6">
          <ImportPreview file={selectedFile} />

          {/* Validation section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🔍 Validate & Import</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-text-muted">
                Validate your file before importing to check for errors.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  variant="secondary"
                  onClick={handleValidate}
                  disabled={!selectedFile || validateImport.isPending}
                >
                  {validateImport.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span>
                      Validating...
                    </>
                  ) : (
                    '🔍 Validate File'
                  )}
                </Button>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="skip-errors"
                    checked={skipErrors}
                    onChange={(e) => setSkipErrors(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="skip-errors" className="text-sm text-text-secondary">
                    Skip rows with errors during import
                  </label>
                </div>
              </div>

              {/* Validation results */}
              {validationResult && (
                <div className="pt-4 border-t border-border">
                  <ImportResults result={validationResult} isValidation />
                </div>
              )}

              {/* Import button */}
              <div className="pt-4 border-t border-border flex items-center gap-4">
                <Button
                  variant="primary"
                  onClick={handleImport}
                  disabled={!selectedFile || uploadImport.isPending}
                >
                  {uploadImport.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span>
                      Importing...
                    </>
                  ) : (
                    '📥 Import Data'
                  )}
                </Button>

                {validationResult && !validationResult.success && (
                  <Badge variant="warning">
                    ⚠️ {validationResult.errors.length} validation errors found
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 'results' && (
        <div className="space-y-6">
          <ImportResults result={importResult} />

          <div className="flex gap-4">
            <Button variant="primary" onClick={handleReset}>
              Import More Data
            </Button>
            <Button variant="secondary" onClick={() => setStep('preview')}>
              Re-import Same File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataImportPage;
