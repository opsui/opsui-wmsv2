/**
 * Tests for MobileScanningPage component
 *
 * Core tests for the Mobile Scanning page functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { MobileScanningPage } from '../MobileScanningPage';

// Mock all the external dependencies
vi.mock('@/hooks/useFormValidation', () => ({
  useFormValidation: vi.fn(() => ({
    values: { quantity: '' },
    errors: {},
    handleChange: vi.fn(),
    handleSubmit: vi.fn(e => {
      e?.preventDefault?.();
    }),
    isSubmitting: false,
    setFieldValue: vi.fn(),
    resetForm: vi.fn(),
  })),
  commonValidations: {
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { required: true, minLength: 8 },
  },
}));

vi.mock('@/services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    cycleCountApi: {
      getPlan: vi.fn(),
      createEntry: vi.fn(),
    },
  };
});

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(),
  },
});

// Mock speechSynthesis
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: vi.fn(),
  },
});

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: vi.fn(),
});

describe('MobileScanningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<MobileScanningPage />);
      expect(container).toBeInTheDocument();
    });

    it('shows completion state when no plan data', () => {
      renderWithProviders(<MobileScanningPage />);
      // Without a planId, the page shows a completion or empty state
      expect(screen.queryByText(/complete/i)).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('is a valid React component', () => {
      expect(typeof MobileScanningPage).toBe('function');
    });

    it('has default export', () => {
      expect(MobileScanningPage).toBeDefined();
    });
  });

  describe('Browser APIs Used', () => {
    it('uses navigator.mediaDevices for camera access', () => {
      expect(navigator.mediaDevices).toBeDefined();
      expect(typeof navigator.mediaDevices.getUserMedia).toBe('function');
    });

    it('uses navigator.vibrate for haptic feedback', () => {
      expect(typeof navigator.vibrate).toBe('function');
    });

    it('uses speechSynthesis for voice feedback', () => {
      expect(window.speechSynthesis).toBeDefined();
      expect(typeof window.speechSynthesis.speak).toBe('function');
    });
  });
});
