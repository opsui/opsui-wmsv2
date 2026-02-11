/**
 * Card component - Theme-aware (light/dark mode)
 *
 * Uses CSS custom properties from tokens.css for consistent theming.
 * Light mode: Clean white cards with subtle shadows
 * Dark mode: Glassmorphism effect with subtle transparency
 */

import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Card({
  variant = 'default',
  padding = 'md',
  hover = false,
  className,
  children,
  ...props
}: CardProps) {
  const baseStyles = 'rounded-xl transition-all duration-200';

  const variantStyles = {
    default: [
      // Light mode: white background with subtle border and shadow
      'bg-white dark:bg-white/[0.03]',
      'border border-gray-100 dark:border-white/[0.08]',
      'shadow-sm dark:shadow-none',
    ].join(' '),
    bordered: [
      // Light mode: white with more prominent border
      'bg-white dark:bg-white/[0.03]',
      'border-2 border-gray-200 dark:border-white/[0.12]',
      'shadow-sm dark:shadow-none',
    ].join(' '),
    elevated: [
      // Light mode: white with nice shadow
      'bg-white dark:bg-white/[0.03]',
      'border border-gray-100 dark:border-white/[0.08]',
      'shadow-lg dark:shadow-premium',
    ].join(' '),
    glass: [
      // Glass effect - different for light/dark
      'glass-card',
    ].join(' '),
  };

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverStyles = hover ? 'card-hover cursor-pointer' : '';

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        paddingStyles[padding],
        hoverStyles,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// CARD SUBCOMPONENTS
// ============================================================================

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 pb-4', className)} {...props}>
      {children}
    </div>
  );
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn(
        'text-lg font-semibold tracking-tight',
        'text-gray-900 dark:text-white',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({ className, children, ...props }: CardDescriptionProps) {
  return (
    <p
      className={cn('text-sm leading-relaxed', 'text-gray-600 dark:text-gray-400', className)}
      {...props}
    >
      {children}
    </p>
  );
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={cn('pt-0', className)} {...props}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div className={cn('flex items-center pt-4', className)} {...props}>
      {children}
    </div>
  );
}
