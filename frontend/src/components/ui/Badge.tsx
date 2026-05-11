'use client';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'orange' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  size?: 'sm' | 'md';
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-[#0C2054]/10 text-[#0C2054]',
  orange: 'bg-[#fef5e7] text-[#F79C31]',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
  outline: 'border border-[#e8e8f0] text-[#4a4a6a] bg-transparent',
};

export function Badge({ children, variant = 'default', className, size = 'sm' }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-semibold',
      size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
