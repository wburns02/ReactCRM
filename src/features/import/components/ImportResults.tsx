import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import type { ImportResult } from '../api/import.ts';

interface ImportResultsProps {
  result: ImportResult | null;
  isValidation?: boolean;
}

export function ImportResults({ result, isValidation = false }: ImportResultsProps) {
  if (!result) {
    return null;
  }

  const { success, total_rows, imported_rows, skipped_rows, errors, warnings } = result;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {isValidation ? '🔍 Validation Results' : '📊 Import Results'}
          </CardTitle>
          <Badge variant={success ? 'success' : 'danger'}>
            {success ? (isValidation ? 'Valid' : 'Success') : 'Failed'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-bg-body rounded-lg text-center">
              <p className="text-2xl font-bold text-text-primary">{total_rows}</p>
              <p className="text-sm text-text-muted">Total Rows</p>
            </div>
            <div className="p-4 bg-success/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-success">
                {isValidation ? total_rows - errors.length : imported_rows}
              </p>
              <p className="text-sm text-text-muted">{isValidation ? 'Valid' : 'Imported'}</p>
            </div>
            <div className="p-4 bg-danger/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-danger">
                {isValidation ? errors.length : skipped_rows}
              </p>
              <p className="text-sm text-text-muted">{isValidation ? 'Errors' : 'Skipped'}</p>
            </div>
          </div>

          {/* Warnings */}
          {warnings && warnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-warning flex items-center gap-2">
                ⚠️ Warnings ({warnings.length})
              </h3>
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-md">
                <ul className="text-sm text-warning space-y-1">
                  {warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Errors */}
          {errors && errors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-danger flex items-center gap-2">
                ❌ Errors ({errors.length})
              </h3>
              <div className="max-h-60 overflow-y-auto border border-border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-bg-body sticky top-0">
                    <tr className="border-b border-border">
                      <th className="p-2 text-left text-text-muted font-medium">Row</th>
                      <th className="p-2 text-left text-text-muted font-medium">Field</th>
                      <th className="p-2 text-left text-text-muted font-medium">Error</th>
                      <th className="p-2 text-left text-text-muted font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.slice(0, 50).map((error, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="p-2 text-text-secondary">{error.row}</td>
                        <td className="p-2">
                          <Badge variant="secondary">{error.field}</Badge>
                        </td>
                        <td className="p-2 text-danger">{error.message}</td>
                        <td className="p-2 text-text-muted max-w-[150px] truncate">
                          {error.value || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {errors.length > 50 && (
                  <p className="p-2 text-sm text-text-muted text-center bg-bg-body">
                    Showing first 50 of {errors.length} errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Success message */}
          {success && !isValidation && (
            <div className="p-4 bg-success/10 border border-success/20 rounded-md text-center">
              <p className="text-lg font-medium text-success">✅ Import completed successfully!</p>
              <p className="text-sm text-text-muted mt-1">
                {imported_rows} records have been imported.
              </p>
            </div>
          )}

          {success && isValidation && (
            <div className="p-4 bg-success/10 border border-success/20 rounded-md text-center">
              <p className="text-lg font-medium text-success">✅ File is valid!</p>
              <p className="text-sm text-text-muted mt-1">
                Ready to import {total_rows} records.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
