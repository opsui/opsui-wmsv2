/**
 * Color Picker component for role customization
 *
 * Provides predefined color options with visual preview
 */

import { CheckIcon } from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

export interface ColorOption {
  name: string;
  value: string;
}

// Predefined color options - curated for good visibility and accessibility
export const ROLE_COLORS: ColorOption[] = [
  // Blue tones
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Cyan', value: '#06b6d4' },

  // Purple tones
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Fuchsia', value: '#d946ef' },

  // Red/Pink tones
  { name: 'Red', value: '#ef4444' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Pink', value: '#ec4899' },

  // Green tones
  { name: 'Green', value: '#22c55e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Lime', value: '#84cc16' },

  // Orange/Yellow tones
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },

  // Gray tones
  { name: 'Slate', value: '#64748b' },
  { name: 'Zinc', value: '#71717a' },
  { name: 'Stone', value: '#78716c' },

  // Indigo tones
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Blue Gray', value: '#475569' },
];

// ============================================================================
// COMPONENT
// ============================================================================

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ selectedColor, onColorChange, label }: ColorPickerProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="grid grid-cols-6 gap-2">
        {ROLE_COLORS.map(color => {
          const isSelected = selectedColor === color.value;
          return (
            <button
              key={color.value}
              onClick={() => onColorChange(color.value)}
              className={`group relative w-10 h-10 rounded-lg transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-offset-2 ring-offset-gray-900 dark:ring-offset-gray-800 ring-white dark:ring-gray-400 scale-110'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
              aria-label={`Select ${color.name}`}
            >
              {isSelected && (
                <CheckIcon className="h-5 w-5 text-white absolute inset-0 m-auto" />
              )}
              <span className="sr-only">{color.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// COLOR PREVIEW BADGE
// ============================================================================

interface ColorPreviewBadgeProps {
  color: string;
  label: string;
}

export function ColorPreviewBadge({ color, label }: ColorPreviewBadgeProps) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}
