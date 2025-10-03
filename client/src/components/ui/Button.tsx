import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-brand-teal text-text-primary hover:bg-brand-teal/90 focus-visible:ring-brand-teal shadow-depth1',
        primary: 'bg-brand-teal text-text-primary hover:bg-brand-teal/90 focus-visible:ring-brand-teal shadow-depth1',
        secondary: 'bg-surface-hover text-text-primary hover:bg-surface-overlay focus-visible:ring-brand-teal border border-border-subtle',
        ghost: 'hover:bg-surface-hover hover:text-text-primary text-text-secondary focus-visible:ring-brand-teal',
        outline: 'border border-border-subtle bg-transparent hover:bg-surface-hover text-text-primary',
        destructive: 'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500',
      },
      size: {
        default: 'text-base px-4 py-2',
        sm: 'text-sm px-3 py-1.5',
        md: 'text-base px-4 py-2',
        lg: 'text-lg px-6 py-3',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };
