'use client';
import Link from 'next/link';
import { ArrowRight, CalendarClock, DollarSign, MapPin } from 'lucide-react';
import type { ApiLeadList } from '@/lib/api';
import { PRIORITY_OPTIONS, SOURCE_OPTIONS, formatMoney, formatDate } from './constants';

interface Props {
  lead: ApiLeadList;
  onAdvance?: (lead: ApiLeadList) => void;
  advancing?: boolean;
}

export function LeadCard({ lead, onAdvance, advancing }: Props) {
  const priority = PRIORITY_OPTIONS.find(p => p.value === lead.priority);
  const sourceLabel = SOURCE_OPTIONS.find(s => s.value === lead.source)?.label ?? lead.source_display;
  const overdue = lead.next_followup && new Date(lead.next_followup) < new Date(new Date().toDateString());

  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--s-e8eaf0)] p-3.5 space-y-2.5 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/ventas/leads/${lead.id}`} className="min-w-0">
          <p className="text-[13px] font-bold text-[var(--t-0c2054)] leading-tight truncate hover:underline">
            {lead.name}
          </p>
          <p className="text-[11px] text-[var(--t-9ca3af)] truncate mt-0.5">{lead.practice_area_display}</p>
        </Link>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${priority?.color}18`, color: priority?.color }}
        >
          {priority?.label}
        </span>
      </div>

      <div className="space-y-1 text-[11px] text-[var(--t-6b7280)]">
        <p className="truncate">{sourceLabel}</p>
        {lead.location && (
          <p className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 flex-shrink-0" />{lead.location}</p>
        )}
        {lead.estimated_value && (
          <p className="flex items-center gap-1"><DollarSign className="w-3 h-3 flex-shrink-0" />{formatMoney(lead.estimated_value)}</p>
        )}
        {lead.next_followup && (
          <p className={`flex items-center gap-1 ${overdue ? 'text-red-500 font-semibold' : ''}`}>
            <CalendarClock className="w-3 h-3 flex-shrink-0" />
            {formatDate(lead.next_followup)}{overdue ? ' · vencido' : ''}
          </p>
        )}
      </div>

      {onAdvance && lead.stage !== 'ganado' && lead.stage !== 'perdido' && (
        <button
          onClick={() => onAdvance(lead)}
          disabled={advancing}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[var(--t-6b7280)] border border-[var(--s-e5e7eb)] rounded-lg py-1.5 opacity-0 group-hover:opacity-100 hover:bg-[var(--s-f0f2f8)] hover:text-[var(--t-0c2054)] disabled:opacity-40 transition-all"
        >
          Avanzar etapa <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
