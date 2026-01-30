/**
 * Quick Count Panel Component
 *
 * Rapid inline count entry without modal popups.
 * Features keyboard shortcuts, barcode scanning, and auto-focus for efficient counting.
 */

import { useState, useEffect, useRef } from 'react';
import { CycleCountEntry, CycleCountPlan } from '@opsui/shared';

interface QuickCountPanelProps {
  plan: CycleCountPlan;
  pendingEntries: CycleCountEntry[];
  onCompleteEntry: (entryId: string, countedQuantity: number) => void;
  onCancel: () => void;
}

interface QuickCountState {
  currentIndex: number;
  barcodeInput: string;
  quantityInput: string;
  lastScannedBarcode: string;
  entrySuccess: boolean;
}

export function QuickCountPanel({
  plan,
  pendingEntries,
  onCompleteEntry,
  onCancel,
}: QuickCountPanelProps) {
  const [state, setState] = useState<QuickCountState>({
    currentIndex: 0,
    barcodeInput: '',
    quantityInput: '',
    lastScannedBarcode: '',
    entrySuccess: false,
  });

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout>();

  const currentEntry = pendingEntries[state.currentIndex];
  const remainingCount = pendingEntries.length - state.currentIndex;
  const progressPercent = (state.currentIndex / pendingEntries.length) * 100;

  // Clear success timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // Auto-focus barcode input when index changes
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [state.currentIndex]);

  // Reset success indicator after delay
  useEffect(() => {
    if (state.entrySuccess) {
      successTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, entrySuccess: false }));
      }, 1500);
    }
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, [state.entrySuccess]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }

      // Ctrl+Enter to submit
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state]);

  // Handle barcode scan or manual input
  const handleBarcodeChange = (value: string) => {
    setState(prev => ({ ...prev, barcodeInput: value }));

    // Auto-lookup when barcode matches expected SKU
    if (currentEntry && value.length > 0) {
      // Check if input matches current entry's SKU or barcode
      // In a real implementation, you'd look up the SKU from barcode
      if (value === currentEntry.sku || value.endsWith(currentEntry.sku)) {
        // Barcode matches - auto-advance to quantity
        setState(prev => ({
          ...prev,
          lastScannedBarcode: value,
        }));
        if (quantityInputRef.current) {
          quantityInputRef.current.focus();
          quantityInputRef.current.select();
        }
      }
    }
  };

  // Handle quantity input
  const handleQuantityChange = (value: string) => {
    // Only allow positive numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setState(prev => ({ ...prev, quantityInput: numericValue }));
  };

  // Quick increment/decrement buttons
  const adjustQuantity = (delta: number) => {
    const currentQty = parseInt(state.quantityInput) || 0;
    const newQty = Math.max(0, currentQty + delta);
    setState(prev => ({ ...prev, quantityInput: newQty.toString() }));
  };

  // Submit count entry
  const handleSubmit = () => {
    if (!currentEntry) return;

    const countedQty = parseInt(state.quantityInput);
    if (isNaN(countedQty) || countedQty < 0) {
      // Show error feedback
      return;
    }

    // Submit the count
    onCompleteEntry(currentEntry.entryId, countedQty);

    // Show success indicator
    setState(prev => ({
      ...prev,
      entrySuccess: true,
      barcodeInput: '',
      quantityInput: '',
      lastScannedBarcode: '',
    }));

    // Move to next entry after short delay
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        currentIndex: Math.min(prev.currentIndex + 1, pendingEntries.length - 1),
      }));
    }, 500);
  };

  // Quick count buttons (+1, +5, +10)
  const quickCount = (qty: number) => {
    setState(prev => ({ ...prev, quantityInput: qty.toString() }));
    // Auto-submit on quick count
    setTimeout(() => {
      handleSubmit();
    }, 100);
  };

  if (!currentEntry) {
    return (
      <div className="quick-count-panel complete">
        <div className="completion-message">
          <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <h3>All Items Counted!</h3>
          <p>You've completed {pendingEntries.length} count entries for this plan.</p>
          <button onClick={onCancel} className="btn btn-primary">
            Return to Plan Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`quick-count-panel ${state.entrySuccess ? 'success' : ''}`}>
      {/* Progress Header */}
      <div className="quick-count-header">
        <div className="progress-info">
          <h3>Quick Count Mode</h3>
          <span className="item-counter">
            {state.currentIndex + 1} / {pendingEntries.length}
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="remaining-text">{remainingCount} remaining</span>
      </div>

      {/* Current Item Display */}
      <div className="current-item">
        <div className="item-info">
          <div className="item-header">
            <span className="label">Location</span>
            <span className="value">{currentEntry.binLocation}</span>
          </div>
          <div className="item-header">
            <span className="label">SKU</span>
            <span className="value">{currentEntry.sku}</span>
          </div>
          {state.lastScannedBarcode && (
            <div className="item-header">
              <span className="label">Scanned</span>
              <span className="value success">{state.lastScannedBarcode}</span>
            </div>
          )}
        </div>

        <div className="expected-qty">
          <span className="label">Expected Qty</span>
          <span className="value">{currentEntry.systemQuantity}</span>
        </div>
      </div>

      {/* Count Input */}
      <div className="count-input-section">
        <div className="barcode-section">
          <label htmlFor="barcode-input">Scan Barcode or Enter SKU</label>
          <input
            ref={barcodeInputRef}
            id="barcode-input"
            type="text"
            value={state.barcodeInput}
            onChange={e => handleBarcodeChange(e.target.value)}
            placeholder="Scan or type..."
            className="input-barcode"
            autoComplete="off"
          />
        </div>

        <div className="quantity-section">
          <label htmlFor="quantity-input">Counted Quantity</label>
          <div className="quantity-input-group">
            <button
              type="button"
              onClick={() => adjustQuantity(-1)}
              className="btn-qty btn-decrease"
              disabled={!state.quantityInput || parseInt(state.quantityInput) <= 0}
            >
              −
            </button>
            <input
              ref={quantityInputRef}
              id="quantity-input"
              type="text"
              value={state.quantityInput}
              onChange={e => handleQuantityChange(e.target.value)}
              placeholder="0"
              className="input-quantity"
              inputMode="numeric"
            />
            <button
              type="button"
              onClick={() => adjustQuantity(1)}
              className="btn-qty btn-increase"
            >
              +
            </button>
          </div>
        </div>

        {/* Quick Count Buttons */}
        <div className="quick-count-buttons">
          <button type="button" onClick={() => quickCount(1)} className="btn-quick">
            +1
          </button>
          <button type="button" onClick={() => quickCount(5)} className="btn-quick">
            +5
          </button>
          <button type="button" onClick={() => quickCount(10)} className="btn-quick">
            +10
          </button>
          <button
            type="button"
            onClick={() => {
              setState(prev => ({
                ...prev,
                quantityInput: currentEntry.systemQuantity.toString(),
              }));
            }}
            className="btn-quick btn-match"
          >
            Match
          </button>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!state.quantityInput || parseInt(state.quantityInput) < 0}
            className="btn btn-primary btn-submit"
          >
            Submit Entry (Ctrl+Enter)
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Exit Quick Count
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="shortcuts-help">
        <small className="text-muted">
          <strong>Shortcuts:</strong> Ctrl+Enter to submit • Escape to exit
        </small>
      </div>

      {/* Success Overlay */}
      {state.entrySuccess && (
        <div className="success-overlay">
          <svg className="success-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>Entry Saved!</span>
        </div>
      )}
    </div>
  );
}

export default QuickCountPanel;
