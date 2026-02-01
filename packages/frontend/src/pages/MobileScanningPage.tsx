/**
 * Mobile Scanning Page
 *
 * Handheld-optimized cycle counting interface with large touch targets,
 * camera-based barcode scanning, and quick quantity entry buttons.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { cycleCountApi } from '@/services/api';
import { CycleCountEntry } from '@opsui/shared';
import { useFormValidation } from '@/hooks/useFormValidation';

export function MobileScanningPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [scanHistory] = useState<CycleCountEntry[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Form validation for quantity input
  const {
    values: formData,
    errors,
    handleChange,
    handleSubmit: handleFormSubmit,
    isSubmitting,
    setFieldValue,
  } = useFormValidation({
    initialValues: {
      quantity: '',
    },
    validationRules: {
      quantity: {
        required: true,
        custom: (value: string) => {
          const num = parseInt(value);
          if (isNaN(num) || num < 0) {
            return 'Please enter a valid quantity';
          }
          return null;
        },
      },
    },
    onSubmit: async values => {
      if (!currentEntry) {
        return;
      }

      const qty = parseInt(values.quantity);
      try {
        await submitMutation.mutateAsync({ entryId: currentEntry.entryId, quantity: qty });
      } catch (error: any) {
        playFeedback('error');
      }
    },
  });

  // Fetch plan details
  const { data: plan, isLoading } = useQuery({
    queryKey: ['cycle-count', 'plans', planId],
    queryFn: () => cycleCountApi.getPlan(planId!),
    enabled: !!planId,
  });

  // Mutation for submitting counts
  const submitMutation = useMutation({
    mutationFn: ({ quantity }: { entryId: string; quantity: number }) =>
      cycleCountApi.createEntry({
        planId: planId!,
        sku: currentEntry?.sku || '',
        binLocation: currentEntry?.binLocation || '',
        countedQuantity: quantity,
      }),
    onSuccess: () => {
      playFeedback('success');
      setCurrentIndex(prev => prev + 1);
      setBarcodeInput('');
      // Reset form
      setFieldValue('quantity', '');
    },
    onError: () => {
      playFeedback('error');
    },
  });

  // Get pending entries (not yet counted)
  const pendingEntries =
    plan?.countEntries?.filter(
      (e: CycleCountEntry) => e.countedQuantity === 0 || e.countedQuantity == null
    ) || [];

  const currentEntry = pendingEntries[currentIndex];
  const completedCount = scanHistory.length;
  const totalCount = pendingEntries.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Auto-focus barcode input
  useEffect(() => {
    if (barcodeInputRef.current && !cameraActive) {
      barcodeInputRef.current.focus();
    }
  }, [currentIndex, cameraActive]);

  // Voice feedback
  const speak = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.2;
    speechSynthesis.speak(utterance);
  };

  // Audio/visual feedback
  const playFeedback = (type: 'success' | 'error') => {
    if ('vibrate' in navigator) {
      navigator.vibrate(type === 'success' ? [100] : [200, 100, 200]);
    }

    if (voiceEnabled) {
      speak(type === 'success' ? 'Saved' : 'Error');
    }
  };

  // Handle barcode scan (manual or camera)
  const handleBarcodeScan = (barcode: string) => {
    setBarcodeInput(barcode);

    // Look up SKU from barcode (simplified - in real app would call SKU API)
    if (currentEntry && barcode.includes(currentEntry.sku)) {
      playFeedback('success');
      speak(`${currentEntry.sku} found`);
      // Auto-focus quantity
      const qtyInput = document.getElementById('mobile-quantity-input') as HTMLInputElement;
      qtyInput?.focus();
    }
  };

  // Quick quantity buttons
  const quickCount = (qty: number) => {
    setFieldValue('quantity', qty.toString());
    setTimeout(() => handleFormSubmit(), 100);
  };

  // Camera barcode scanning (using html5-qrcode library pattern)
  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // In real implementation, would use barcode detection library
      // For now, placeholder for camera scanning logic
    } catch (err) {
      console.error('Camera access denied:', err);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  // Skip current item
  const handleSkip = () => {
    setCurrentIndex(prev => prev + 1);
    setBarcodeInput('');
    setFieldValue('quantity', '');
  };

  // Complete counting session
  const handleComplete = () => {
    navigate(`/cycle-counting/${planId}`);
  };

  if (isLoading) {
    return (
      <div className="mobile-scanning-page loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (!plan || !currentEntry) {
    return (
      <div className="mobile-scanning-page complete">
        <div className="completion-card">
          <h1>Count Complete!</h1>
          <p>You've counted {completedCount} items.</p>
          <button onClick={handleComplete} className="btn btn-primary btn-lg">
            Return to Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-scanning-page">
      {/* Header with progress */}
      <header className="scanning-header">
        <button onClick={handleComplete} className="btn-back">
          ←
        </button>
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="progress-text">
            {completedCount} / {totalCount}
          </span>
        </div>
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className={`btn-voice ${voiceEnabled ? 'active' : ''}`}
        >
          🔊
        </button>
      </header>

      {/* Camera view */}
      {cameraActive && (
        <div className="camera-view">
          <video ref={videoRef} className="camera-feed" />
          <div className="camera-overlay">
            <div className="scan-frame" />
            <p className="scan-instruction">Align barcode within frame</p>
          </div>
          <button onClick={stopCamera} className="btn btn-secondary">
            Close Camera
          </button>
        </div>
      )}

      {/* Current item display */}
      <section className="current-item-card">
        <div className="item-location">
          <span className="label">Location</span>
          <span className="value large">{currentEntry.binLocation}</span>
        </div>

        <div className="item-sku">
          <span className="label">SKU</span>
          <span className="value large">{currentEntry.sku}</span>
        </div>

        <div className="item-expected">
          <span className="label">Expected</span>
          <span className="value">{currentEntry.systemQuantity}</span>
        </div>
      </section>

      {/* Barcode input */}
      <section className="barcode-section">
        {!cameraActive ? (
          <>
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={e => handleBarcodeScan(e.target.value)}
              placeholder="Scan or enter barcode"
              className="input-barcode-large"
              autoComplete="off"
            />
            <button onClick={startCamera} className="btn-camera">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 15.2c1.77 0 3.2-1.43 3.2-3.2s-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2 1.43 3.2 3.2 3.2zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
              </svg>
              Open Camera
            </button>
          </>
        ) : (
          <button onClick={stopCamera} className="btn btn-secondary btn-lg">
            Use Manual Input
          </button>
        )}
      </section>

      {/* Quantity entry */}
      <section className="quantity-section">
        <label className="quantity-label">Counted Quantity</label>

        <div className="quantity-display">
          <input
            id="mobile-quantity-input"
            name="quantity"
            type="number"
            value={formData.quantity}
            onChange={handleChange}
            placeholder="0"
            className={`input-quantity-large ${errors.quantity ? 'input-error' : ''}`}
            inputMode="numeric"
          />
        </div>
        {errors.quantity && <p className="text-red-400 text-sm mt-1">{errors.quantity}</p>}
      </section>

      {/* Quick count buttons */}
      <section className="quick-buttons">
        <button onClick={() => quickCount(1)} className="btn-quick btn-quick-1">
          +1
        </button>
        <button onClick={() => quickCount(5)} className="btn-quick btn-quick-5">
          +5
        </button>
        <button onClick={() => quickCount(10)} className="btn-quick btn-quick-10">
          +10
        </button>
        <button
          onClick={() => {
            const expected = currentEntry.systemQuantity;
            quickCount(expected);
          }}
          className="btn-quick btn-quick-match"
        >
          Match
        </button>
      </section>

      {/* Action buttons */}
      <section className="action-buttons">
        <button
          onClick={handleFormSubmit}
          disabled={!formData.quantity || isSubmitting || submitMutation.isPending}
          className="btn btn-primary btn-submit btn-lg"
        >
          {isSubmitting || submitMutation.isPending ? 'Submitting...' : 'Submit ✓'}
        </button>
        <button onClick={handleSkip} className="btn btn-secondary btn-lg">
          Skip →
        </button>
      </section>

      {/* Scan history summary */}
      {scanHistory.length > 0 && (
        <section className="scan-history">
          <h3>Recent Scans</h3>
          <div className="history-list">
            {scanHistory
              .slice(-5)
              .reverse()
              .map(entry => (
                <div key={entry.entryId} className="history-item">
                  <span className="sku">{entry.sku}</span>
                  <span className="qty">{entry.countedQuantity}</span>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="scanning-footer">
        <button onClick={handleComplete} className="btn-text">
          Exit to Plan Details
        </button>
      </footer>
    </div>
  );
}

export default MobileScanningPage;
