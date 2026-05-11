import { cn } from '@/lib/utils';
import { type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-[#F79C31] text-white hover:bg-[#e08a20] shadow-sm',
  secondary: 'bg-[#0C2054] text-white hover:bg-[#0a1a44] shadow-sm',
  outline: 'border border-[#e8e8f0] text-[#4a4a6a] hover:bg-[#f7f8fc] hover:border-[#d0d0e0]',
  ghost: 'text-[#4a4a6a] hover:bg-[#f7f8fc]',
  danger: 'bg-red-50 text-red-700 hover:bg-red-100',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-9 px-4 text-sm rounded-lg',
  lg: 'h-11 px-6 text-sm rounded-xl',
  icon: 'h-9 w-9 rounded-lg',
};

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#F79C31]/30 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : null}
      {children}
    </button>
  );
}
