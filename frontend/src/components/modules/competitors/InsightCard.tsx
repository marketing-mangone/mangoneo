import { AlertTriangle, Lightbulb, Eye, Trash2 } from 'lucide-react';
import type { ApiCompetitorInsight } from '@/lib/api';

const TYPE_CONFIG = {
  threat: { label: 'Amenaza', icon: AlertTriangle, bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
  opportunity: { label: 'Oportunidad', icon: Lightbulb, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  observation: { label: 'Observación', icon: Eye, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
};

const IMPACT_CONFIG = {
  high: { label: 'Alto impacto', color: 'text-red-500 bg-red-50' },
  medium: { label: 'Impacto medio', color: 'text-amber-500 bg-amber-50' },
  low: { label: 'Bajo impacto', color: 'text-green-500 bg-green-50' },
};

interface Props {
  insight: ApiCompetitorInsight;
  onDelete?: (id: number) => void;
  competitorName?: string;
}

export function InsightCard({ insight, onDelete, competitorName }: Props) {
  const type = TYPE_CONFIG[insight.insight_type];
  const impact = IMPACT_CONFIG[insight.impact];
  const Icon = type.icon;

  return (
    <div className={`bg-white rounded-xl border ${type.border} p-4 group`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg ${type.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <Icon className={`w-4 h-4 ${type.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${type.text}`}>{type.label}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${impact.color}`}>{impact.label}</span>
            {competitorName && (
              <span className="text-[10px] text-[#9ca3af]">· {competitorName}</span>
            )}
          </div>
          <h4 className="font-semibold text-[#0C2054] text-sm leading-tight mb-1">{insight.title}</h4>
          <p className="text-[#6b7280] text-xs leading-relaxed">{insight.description}</p>
          {insight.action_items.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {insight.action_items.map((item, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-[#374151]">
                  <span className="text-[#F79C31] font-bold mt-0.5">→</span>
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(insight.id)}
            className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-[#9ca3af] hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
