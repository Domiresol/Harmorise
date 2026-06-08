import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';

/* ── TextField ─────────────────────────────────────────────── */
interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hint, leftIcon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-slate-700">{label}</label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-slate-400">{leftIcon}</span>
          )}
          <input
            ref={ref}
            className={[
              'w-full h-12 rounded-btn bg-slate-100 text-base text-slate-900',
              'px-4 outline-none transition-all duration-150',
              'placeholder:text-slate-400',
              'focus:bg-white focus:ring-2 focus:ring-primary/30 focus:border focus:border-primary',
              error ? 'ring-2 ring-error/30 border border-error' : 'border border-transparent',
              leftIcon  ? 'pl-10' : '',
              rightIcon ? 'pr-10' : '',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 text-slate-400">{rightIcon}</span>
          )}
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
        {!error && hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    );
  },
);

TextField.displayName = 'TextField';

/* ── TextArea ──────────────────────────────────────────────── */
interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  maxLength?: number;
  showCount?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, maxLength, showCount, value, className = '', ...props }, ref) => {
    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-slate-700">{label}</label>
        )}
        <textarea
          ref={ref}
          maxLength={maxLength}
          value={value}
          className={[
            'w-full rounded-btn bg-slate-100 text-base text-slate-900',
            'p-4 outline-none transition-all duration-150 resize-none',
            'placeholder:text-slate-400',
            'focus:bg-white focus:ring-2 focus:ring-primary/30 focus:border focus:border-primary',
            error ? 'ring-2 ring-error/30 border border-error' : 'border border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          rows={4}
          {...props}
        />
        <div className="flex justify-between">
          {error ? (
            <p className="text-xs text-error">{error}</p>
          ) : (
            <span />
          )}
          {showCount && maxLength && (
            <p className="text-xs text-slate-400">
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  },
);

TextArea.displayName = 'TextArea';
