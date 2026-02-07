/**
 * CSV Export Utility
 *
 * Utility functions for exporting data to CSV format
 */

/**
 * Convert JSON data to CSV format
 */
export function jsonToCsv<T extends Record<string, any>>(
  data: T[],
  columns?: Array<keyof T | { key: keyof T; label: string }>
): string {
  if (data.length === 0) return '';

  // Determine columns
  let cols: Array<{ key: string; label: string }> = [];
  if (columns) {
    cols = columns.map(col =>
      typeof col === 'string'
        ? { key: col, label: String(col) }
        : { key: String(col.key), label: col.label }
    );
  } else {
    cols = Object.keys(data[0]).map(key => ({ key, label: key }));
  }

  // Create header row
  const headers = cols.map(col => `"${col.label}"`).join(',');

  // Create data rows
  const rows = data.map(row => {
    return cols
      .map(col => {
        const value = row[col.key as keyof T];
        // Handle null/undefined
        if (value == null) return '""';
        // Handle dates
        if (value instanceof Date) return `"${value.toISOString()}"`;
        // Handle objects (JSON stringify)
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        // Handle strings with quotes or commas
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        // Handle numbers and booleans
        return String(value);
      })
      .join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Trigger a download of a CSV file
 */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV file
 */
export function exportToCsv<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: Array<keyof T | { key: keyof T; label: string }>
): void {
  const csv = jsonToCsv(data, columns);
  downloadCsv(csv, filename);
}
