'use client';
import { Search } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const [search, setSearch] = useState('');

  return (
    <header
      className="flex items-center gap-6 px-10 py-6 sticky top-0 z-20"
      style={{
        background: 'var(--header-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--header-border)',
      }}
    >
      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-[22px] font-bold text-[var(--t-111827)] leading-tight tracking-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[var(--t-6b7280)] mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2.5 bg-[var(--surface)] border border-[var(--s-e5e7eb)] rounded-xl px-4 py-2.5 w-64 shadow-sm focus-within:border-[var(--s-f79c31)] focus-within:shadow-[0_0_0_3px_rgba(247,156,49,0.12)] transition-all">
        <Search className="w-4 h-4 text-[var(--t-9ca3af)] flex-shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="text-sm text-[var(--t-111827)] placeholder-[var(--t-9ca3af)] bg-transparent outline-none w-full"
        />
      </div>

      {/* Date */}
      <span className="hidden lg:block text-sm text-[var(--t-9ca3af)] whitespace-nowrap font-medium">
        {new Date().toLocaleDateString('es-US', { weekday: 'long', day: 'numeric', month: 'long' })}
      </span>

      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </header>
  );
}
