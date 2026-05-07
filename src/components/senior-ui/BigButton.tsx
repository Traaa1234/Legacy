import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'secondary';

interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const BigButton = forwardRef<HTMLButtonElement, BigButtonProps>(
  function BigButton({ variant = 'primary', className, children, ...rest }, ref) {
    const base =
      'min-h-touch-target px-6 py-4 rounded-button font-semibold text-body transition-shadow';
    const variants: Record<Variant, string> = {
      primary:
        'bg-soft-coral text-white shadow-[0_3px_0_#c95a36] active:shadow-none active:translate-y-[2px]',
      secondary:
        'bg-white text-deep-navy border-2 border-deep-navy',
    };
    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], className)}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
