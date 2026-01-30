/**
 * Form Validation Hook
 *
 * Provides form validation logic with error handling and state management
 *
 * Usage:
 * ```tsx
 * const { values, errors, handleChange, handleSubmit, isValid } = useFormValidation({
 *   initialValues: { name: '', email: '' },
 *   validationRules: {
 *     name: { required: true, minLength: 3 },
 *     email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
 *   },
 *   onSubmit: async (values) => { await saveData(values); }
 * });
 * ```
 */

import { useState, useCallback, ChangeEvent } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule;
};

export type FormErrors<T> = {
  [K in keyof T]?: string;
};

export interface UseFormValidationOptions<T> {
  initialValues: T;
  validationRules: ValidationRules<T>;
  onSubmit: (values: T) => void | Promise<void>;
  validateOnChange?: boolean;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validateField<T>(
  fieldName: keyof T,
  value: any,
  rules: ValidationRule
): string | null {
  // Required validation
  if (rules.required) {
    if (value === undefined || value === null || value === '') {
      return 'This field is required';
    }
  }

  // Skip other validations if value is empty and not required
  if (!value && !rules.required) {
    return null;
  }

  // String length validations
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return `Must be at least ${rules.minLength} characters`;
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return `Must be no more than ${rules.maxLength} characters`;
    }
  }

  // Number range validations
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      return `Must be at least ${rules.min}`;
    }
    if (rules.max !== undefined && value > rules.max) {
      return `Must be no more than ${rules.max}`;
    }
  }

  // Pattern validation
  if (rules.pattern && typeof value === 'string') {
    if (!rules.pattern.test(value)) {
      return 'Invalid format';
    }
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
}

function validateForm<T>(values: T, rules: ValidationRules<T>): FormErrors<T> {
  const errors: FormErrors<T> = {};

  for (const fieldName in rules) {
    const rule = rules[fieldName];
    if (rule) {
      const error = validateField(fieldName, values[fieldName], rule);
      if (error) {
        errors[fieldName] = error;
      }
    }
  }

  return errors;
}

// ============================================================================
// HOOK
// ============================================================================

export function useFormValidation<T extends Record<string, any>>({
  initialValues,
  validationRules,
  onSubmit,
  validateOnChange = false,
}: UseFormValidationOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<Set<keyof T>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle field change
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const fieldName = name as keyof T;

      // Handle checkbox
      const newValue =
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

      setValues(prev => ({ ...prev, [fieldName]: newValue }));

      // Validate on change if enabled
      if (validateOnChange || touched.has(fieldName)) {
        const rule = validationRules[fieldName];
        if (rule) {
          const error = validateField(fieldName, newValue, rule);
          setErrors(prev => ({
            ...prev,
            [fieldName]: error || undefined,
          }));
        }
      }
    },
    [validationRules, validateOnChange, touched]
  );

  // Handle field blur (mark as touched)
  const handleBlur = useCallback((fieldName: keyof T) => {
    setTouched(prev => new Set(prev).add(fieldName));

    // Validate field on blur
    const rule = validationRules[fieldName];
    if (rule) {
      const error = validateField(fieldName, values[fieldName], rule);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error || undefined,
      }));
    }
  }, [validationRules, values]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      // Validate all fields
      const formErrors = validateForm(values, validationRules);
      setErrors(formErrors);

      // Mark all fields as touched
      const allFields = new Set(Object.keys(validationRules) as Array<keyof T>);
      setTouched(allFields);

      // If no errors, submit
      if (Object.keys(formErrors).length === 0) {
        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } catch (error) {
          console.error('Form submission error:', error);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [values, validationRules, onSubmit]
  );

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched(new Set());
    setIsSubmitting(false);
  }, [initialValues]);

  // Set field value programmatically
  const setFieldValue = useCallback((fieldName: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  // Set field error programmatically
  const setFieldError = useCallback((fieldName: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  }, []);

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError,
  };
}

// ============================================================================
// COMMON VALIDATION RULES
// ============================================================================

export const commonValidations = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  phone: {
    pattern: /^\+?[\d\s-()]+$/,
  },
  url: {
    pattern: /^https?:\/\/.+/,
  },
  number: {
    custom: (value: any) => {
      if (value && isNaN(Number(value))) {
        return 'Must be a valid number';
      }
      return null;
    },
  },
  positiveNumber: {
    custom: (value: any) => {
      const num = Number(value);
      if (isNaN(num)) {
        return 'Must be a valid number';
      }
      if (num < 0) {
        return 'Must be a positive number';
      }
      return null;
    },
  },
  alphanumeric: {
    pattern: /^[a-zA-Z0-9]+$/,
  },
};

/**
 * Example usage:
 *
 * ```tsx
 * function CreateCustomerForm() {
 *   const { showToast } = useToast();
 *
 *   const { values, errors, handleChange, handleBlur, handleSubmit, isSubmitting } = useFormValidation({
 *     initialValues: {
 *       companyName: '',
 *       contactName: '',
 *       email: '',
 *       phone: '',
 *     },
 *     validationRules: {
 *       companyName: { required: true, minLength: 2, maxLength: 100 },
 *       contactName: { required: true, minLength: 2 },
 *       email: commonValidations.email,
 *       phone: { ...commonValidations.phone, required: false },
 *     },
 *     onSubmit: async (values) => {
 *       try {
 *         await createCustomer(values);
 *         showToast('Customer created successfully', 'success');
 *         onClose();
 *       } catch (error) {
 *         showToast('Failed to create customer', 'error');
 *       }
 *     },
 *   });
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <Input
 *         name="companyName"
 *         value={values.companyName}
 *         onChange={handleChange}
 *         onBlur={() => handleBlur('companyName')}
 *         error={errors.companyName}
 *       />
 *       <Button type="submit" disabled={isSubmitting}>
 *         {isSubmitting ? 'Creating...' : 'Create Customer'}
 *       </Button>
 *     </form>
 *   );
 * }
 * ```
 */
