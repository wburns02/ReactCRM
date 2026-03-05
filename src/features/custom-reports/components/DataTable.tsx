interface DataTableProps {
  rows: Record<string, unknown>[];
  maxRows?: number;
}

export function DataTable({ rows, maxRows = 100 }: DataTableProps) {
  if (!rows.length) {
    return <p className="text-text-muted text-sm text-center py-8">No data to display.</p>;
  }

  const columns = Object.keys(rows[0]);
  const displayRows = rows.slice(0, maxRows);

  return (
    <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-bg-secondary border-b border-border">
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-medium text-text-secondary whitespace-nowrap">
                {col.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-bg-secondary/50">
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 whitespace-nowrap text-text-primary">
                  {formatCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > maxRows && (
        <div className="px-3 py-2 text-xs text-text-muted bg-bg-secondary border-t border-border">
          Showing {maxRows} of {rows.length} rows
        </div>
      )}
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
