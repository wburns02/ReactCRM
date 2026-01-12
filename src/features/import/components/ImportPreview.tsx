import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";

interface ImportPreviewProps {
  file: File | null;
  onPreviewReady?: (rowCount: number, headers: string[]) => void;
}

export function ImportPreview({ file, onPreviewReady }: ImportPreviewProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) {
      setHeaders([]);
      setPreviewRows([]);
      setTotalRows(0);
      setError(null);
      return;
    }

    const parseCSV = async () => {
      setLoading(true);
      setError(null);

      try {
        const text = await file.text();
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length === 0) {
          setError("File is empty");
          setLoading(false);
          return;
        }

        // Parse headers
        const headerLine = lines[0];
        const parsedHeaders = parseCSVLine(headerLine);
        setHeaders(parsedHeaders);

        // Parse preview rows (first 5 data rows)
        const dataLines = lines.slice(1, 6);
        const parsedRows = dataLines.map((line) => parseCSVLine(line));
        setPreviewRows(parsedRows);

        // Count total rows (excluding header)
        const rowCount = lines.length - 1;
        setTotalRows(rowCount);

        if (onPreviewReady) {
          onPreviewReady(rowCount, parsedHeaders);
        }
      } catch (err) {
        setError("Failed to parse CSV file");
        console.error("CSV parse error:", err);
      } finally {
        setLoading(false);
      }
    };

    parseCSV();
  }, [file, onPreviewReady]);

  // Simple CSV line parser (handles quoted fields)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  if (!file) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-text-muted">Select a file to preview</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-text-muted">Parsing file...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-danger">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">File Preview</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="primary">{totalRows} rows</Badge>
            <Badge variant="secondary">{headers.length} columns</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center gap-4 text-sm text-text-muted">
            <span>📄 {file.name}</span>
            <span>•</span>
            <span>{(file.size / 1024).toFixed(1)} KB</span>
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2 text-left text-text-muted font-medium">
                    #
                  </th>
                  {headers.map((header, i) => (
                    <th
                      key={i}
                      className="p-2 text-left text-text-primary font-medium"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-border/50">
                    <td className="p-2 text-text-muted">{rowIndex + 1}</td>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="p-2 text-text-secondary max-w-[200px] truncate"
                      >
                        {cell || (
                          <span className="text-text-muted italic">empty</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalRows > 5 && (
            <p className="text-sm text-text-muted text-center">
              Showing first 5 of {totalRows} rows
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
