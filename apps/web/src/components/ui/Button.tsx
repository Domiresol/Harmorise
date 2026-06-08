import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-primary text-white active:bg-primary-dark hover:bg-primary-dark disabled:bg-primary/40',
  secondary:
    'bg-white text-primary border border-primary active:bg-primary-pale hover:bg-primary-pale disabled:opacity-40',
  danger:
    'bg-error text-white active:bg-red-600 hover:bg-red-600 disabled:bg-error/40',
  ghost:
    'bg-transparent text-slate-600 active:bg-slate-100 hover:bg-slate-100 disabled:opacity-40',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-12 px-6 text-base',
  lg: 'h-14 px-8 text-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center gap-2',
          'rounded-btn font-semibold',
          'transition-all duration-100',
          'select-none outline-none',
          'disabled:cursor-not-allowed',
          variantClass[variant],
          sizeClass[size],
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {loading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
