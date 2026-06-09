import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[var(--surface)] rounded-2xl border border-[var(--s-e5e7eb)]',
        'shadow-[0_1px_3px_rgba(12,32,84,0.06),0_4px_12px_rgba(12,32,84,0.03)]',
        hover && 'cursor-pointer transition-all duration-200 hover:border-[#F79C31]/50 hover:shadow-[0_4px_20px_rgba(12,32,84,0.1)] hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 pt-6 pb-0', className)}>{children}</div>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-[15px] font-bold text-[var(--t-111827)] tracking-tight', className)}>{children}</h3>;
}
