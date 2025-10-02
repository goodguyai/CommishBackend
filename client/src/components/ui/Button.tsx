import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center rounded-md font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-brand-teal text-text-primary hover:bg-brand-teal/90 focus-visible:ring-brand-teal shadow-depth1':
              variant === 'primary',
            'bg-surface-hover text-text-primary hover:bg-surface-overlay focus-visible:ring-brand-teal border border-border-subtle':
              variant === 'secondary',
            'hover:bg-surface-hover hover:text-text-primary text-text-secondary focus-visible:ring-brand-teal':
              variant === 'ghost',
            'text-sm px-3 py-1.5': size === 'sm',
            'text-base px-4 py-2': size === 'md',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
