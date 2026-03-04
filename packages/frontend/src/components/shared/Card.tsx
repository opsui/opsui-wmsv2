/**
 * Card component - Distinctive Purple Industrial Theme
 *
 * Features:
 * - Gradient backgrounds with atmospheric depth
 * - Subtle glow effects on hover
 * - Industrial corner accents option
 * - Distinctive typography for titles
 * - Grain texture overlay for depth
 * - Full dark mode support via CSS custom properties
 */

import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'glass' | 'industrial';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  accent?: boolean; // Show industrial corner accents
}

// ============================================================================
// COMPONENT
// ============================================================================

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      hover = false,
      accent = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = [
      // transition-colors instead of transition-all: only animate color/border/shadow properties.
      // transition-all forces the browser to watch every CSS property for changes, which is
      // expensive on low-end CPUs. Colors are the only properties that actually animate on cards.
      'rounded-xl transition-colors duration-300 ease-out',
      'relative overflow-hidden',
    ].join(' ');

    // Tailwind-based variant classes for proper dark mode support
    const variantClasses: Record<string, string> = {
      default:
        'bg-white dark:bg-slate-800/95 border border-gray-100 dark:border-white/10 shadow-sm dark:shadow-none',
      bordered:
        'bg-white dark:bg-slate-800/95 border-2 border-purple-300/50 dark:border-purple-500/30 shadow-sm dark:shadow-none',
      elevated:
        'bg-white dark:bg-slate-800/95 border border-gray-100 dark:border-white/10 shadow-lg dark:shadow-2xl',
      glass: 'glass-card',
      industrial:
        'bg-gradient-to-br from-slate-900 to-purple-900/80 border border-purple-500/30 shadow-xl',
    };

    const paddingStyles = {
      none: '',
      sm: 'p-3 xs:p-4',
      md: 'p-4 xs:p-5 sm:p-6',
      lg: 'p-5 xs:p-6 sm:p-8 lg:p-10',
    };

    const hoverClasses = hover
      ? 'cursor-pointer hover:shadow-purple-500/10 hover:-translate-y-1 dark:hover:shadow-purple-500/20'
      : '';

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variantClasses[variant],
          paddingStyles[padding],
          hoverClasses,
          className
        )}
        {...props}
      >
        {/* Grain texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            mixBlendMode: 'overlay',
          }}
        />

        {/* Industrial corner accents */}
        {accent && (
          <>
            <div
              className="absolute top-0 left-0 w-6 h-6"
              style={{
                borderLeft: '2px solid rgba(168, 85, 247, 0.4)',
                borderTop: '2px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '12px 0 0 0',
              }}
            />
            <div
              className="absolute bottom-0 right-0 w-6 h-6"
              style={{
                borderRight: '2px solid rgba(168, 85, 247, 0.4)',
                borderBottom: '2px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '0 0 12px 0',
              }}
            />
          </>
        )}

        {/* Content */}
        <div className="relative">{children}</div>
      </div>
    );
  }
);

Card.displayName = 'Card';

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
