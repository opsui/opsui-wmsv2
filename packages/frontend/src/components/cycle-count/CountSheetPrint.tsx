/**
 * Count Sheet Print Component
 *
 * Print-optimized cycle count sheet for offline counting.
 * Includes checkboxes, item details, notes section, and signature lines.
 */

import { CycleCountPlan, CycleCountEntry } from '@opsui/shared';

interface CountSheetPrintProps {
  plan: CycleCountPlan;
  entries: CycleCountEntry[];
  onPrint: () => void;
}

export function CountSheetPrint({ plan, entries, onPrint }: CountSheetPrintProps) {
  // Format date for display
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get user name from ID (in real app, would look up from user list)
  const getUserName = (userId: string) => {
    return userId; // Placeholder - would get actual user name
  };

  const handlePrint = () => {
    window.print();
    onPrint();
  };

  return (
    <div className="count-sheet-print">
      {/* Print Controls (not visible when printing) */}
      <div className="print-controls no-print">
        <button onClick={handlePrint} className="btn btn-primary">
          <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-2 9a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm1-4a1 1 0 100 2h.01a1 1 0 100-2H4zm9 0a1 1 0 100 2h.01a1 1 0 100-2H13z"
              clipRule="evenodd"
            />
          </svg>
          Print Count Sheet
        </button>
        <button onClick={onPrint} className="btn btn-secondary">
          Close
        </button>
      </div>

      {/* Printable Sheet */}
      <div className="print-sheet">
        {/* Header */}
        <div className="sheet-header">
          <div className="company-info">
            <h1>Cycle Count Sheet</h1>
            <p className="company-name">Warehouse Management System</p>
          </div>
          <div className="sheet-meta">
            <div className="meta-row">
              <span className="label">Plan Name:</span>
              <span className="value">{plan.planName}</span>
            </div>
            <div className="meta-row">
              <span className="label">Count Type:</span>
              <span className="value">{plan.countType}</span>
            </div>
            <div className="meta-row">
              <span className="label">Scheduled Date:</span>
              <span className="value">{formatDate(plan.scheduledDate)}</span>
            </div>
            <div className="meta-row">
              <span className="label">Counter:</span>
              <span className="value">{getUserName(plan.countBy)}</span>
            </div>
            {plan.location && (
              <div className="meta-row">
                <span className="label">Location:</span>
                <span className="value">{plan.location}</span>
              </div>
            )}
            {plan.sku && (
              <div className="meta-row">
                <span className="label">SKU Focus:</span>
                <span className="value">{plan.sku}</span>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="sheet-instructions">
          <h4>Instructions:</h4>
          <ol>
            <li>Count each item at the specified bin location</li>
            <li>Record the actual counted quantity</li>
            <li>Check the box when complete</li>
            <li>Note any discrepancies or issues</li>
            <li>Sign and date when all items are counted</li>
          </ol>
        </div>

        {/* Count Table */}
        <div className="count-table">
          <table>
            <thead>
              <tr>
                <th className="col-number">#</th>
                <th className="col-location">Location</th>
                <th className="col-sku">SKU</th>
                <th className="col-description">Description</th>
                <th className="col-system-qty">System Qty</th>
                <th className="col-counted-qty">Counted Qty</th>
                <th className="col-variance">Variance</th>
                <th className="col-notes">Notes</th>
                <th className="col-complete">Complete</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry.entryId}>
                  <td className="col-number">{index + 1}</td>
                  <td className="col-location">{entry.binLocation}</td>
                  <td className="col-sku">{entry.sku}</td>
                  <td className="col-description">
                    {/* SKU name would be fetched from SKU data */}
                    <span className="placeholder">Item Name</span>
                  </td>
                  <td className="col-system-qty">{entry.systemQuantity}</td>
                  <td className="col-counted-qty"></td>
                  <td className="col-variance"></td>
                  <td className="col-notes"></td>
                  <td className="col-complete">
                    <input type="checkbox" className="checkbox" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Section */}
        <div className="sheet-summary">
          <div className="summary-stats">
            <div className="stat">
              <span className="label">Total Items:</span>
              <span className="value">{entries.length}</span>
            </div>
            <div className="stat">
              <span className="label">Total System Qty:</span>
              <span className="value">
                {entries.reduce((sum, e) => sum + e.systemQuantity, 0)}
              </span>
            </div>
          </div>

          <div className="counter-notes">
            <label>Counter Notes:</label>
            <div className="notes-area">
              {plan.notes && <p className="plan-notes">{plan.notes}</p>}
              <div className="handwritten-notes"></div>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="signature-section">
          <div className="signature-block">
            <div className="signature-line">
              <span>Counter Signature:</span>
              <div className="line"></div>
            </div>
            <div className="date-line">
              <span>Date:</span>
              <div className="line short"></div>
            </div>
          </div>
          <div className="signature-block">
            <div className="signature-line">
              <span>Supervisor Signature:</span>
              <div className="line"></div>
            </div>
            <div className="date-line">
              <span>Date:</span>
              <div className="line short"></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sheet-footer">
          <div className="footer-info">
            <p>Generated by WMS on {formatDate(new Date())}</p>
            <p className="plan-id">Plan ID: {plan.planId}</p>
          </div>
          <div className="footer-instructions">
            <p className="print-hint">Return completed form to inventory supervisor</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        /* Print-specific styles - only applied when printing */
        @media print {
          .print-controls {
            display: none !important;
          }

          .count-sheet-print {
            font-size: 10pt;
          }

          .print-sheet {
            box-shadow: none;
            border: 1px solid #ddd;
          }

          .count-table table {
            page-break-inside: auto;
          }

          .count-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          .signature-section {
            page-break-inside: avoid;
          }

          /* Ensure background colors print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }

        /* Screen-only styles */
        .no-print {
          display: block;
        }

        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default CountSheetPrint;
