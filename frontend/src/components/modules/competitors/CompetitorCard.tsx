import Link from 'next/link';
import { ExternalLink, Globe, MapPin, ChevronRight } from 'lucide-react';
import type { ApiCompetitorList, CompetitorDimension } from '@/lib/api';

const DIMENSION_LABELS: Record<CompetitorDimension, string> = {
  seo: 'SEO',
  social_media: 'Social',
  advertising: 'Publicidad',
  web_presence: 'Web',
  content: 'Contenido',
  reviews: 'Reseñas',
};

function ScoreBadge({ score }: { score: number | undefined }) {
  if (score === undefined) return <span className="text-[var(--t-9ca3af)] text-xs">—</span>;
  const color = score >= 7 ? '#10b981' : score >= 5 ? '#F79C31' : '#ef4444';
  return (
    <span className="text-xs font-bold" style={{ color }}>{score.toFixed(1)}</span>
  );
}

export function CompetitorCard({ competitor }: { competitor: ApiCompetitorList }) {
  const dimensions: CompetitorDimension[] = ['seo', 'social_media', 'advertising', 'web_presence', 'content', 'reviews'];

  return (
    <Link href={`/competencia/${competitor.id}`} className="block group">
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-5 hover:border-[#0C2054]/20 hover:shadow-md transition-all duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                competitor.category === 'direct'
                  ? 'bg-red-50 text-red-600'
                  : 'bg-blue-50 text-blue-600'
              }`}>
                {competitor.category === 'direct' ? 'Directo' : 'Indirecto'}
              </span>
            </div>
            <h3 className="font-semibold text-[var(--t-0c2054)] text-sm leading-tight truncate group-hover:text-[#1a3a7a]">
              {competitor.name}
            </h3>
            {competitor.location && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-[var(--t-9ca3af)]" />
                <span className="text-[11px] text-[var(--t-9ca3af)]">{competitor.location}</span>
              </div>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--t-d1d5db)] group-hover:text-[var(--t-0c2054)] flex-shrink-0 transition-colors mt-0.5" />
        </div>

        {/* Website */}
        {competitor.website && (
          <div className="flex items-center gap-1.5 mb-3">
            <Globe className="w-3 h-3 text-[var(--t-9ca3af)]" />
            <a
              href={competitor.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-[11px] text-[var(--t-6b7280)] hover:text-[var(--t-0c2054)] truncate transition-colors"
            >
              {competitor.website.replace(/^https?:\/\//, '')}
            </a>
            <ExternalLink className="w-2.5 h-2.5 text-[var(--t-d1d5db)] flex-shrink-0" />
          </div>
        )}

        {/* Scores grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {dimensions.map(dim => (
            <div key={dim} className="bg-[var(--s-f8f9fb)] rounded-lg px-2 py-1.5 text-center">
              <div className="mb-0.5">
                <ScoreBadge score={competitor.latest_scores[dim]} />
              </div>
              <p className="text-[10px] text-[var(--t-9ca3af)] font-medium leading-none">{DIMENSION_LABELS[dim]}</p>
            </div>
          ))}
        </div>

        {/* Practice areas */}
        {competitor.practice_areas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {competitor.practice_areas.slice(0, 3).map(area => (
              <span key={area} className="text-[10px] bg-[var(--s-f0f2f8)] text-[var(--t-4b5563)] px-2 py-0.5 rounded-full">
                {area}
              </span>
            ))}
            {competitor.practice_areas.length > 3 && (
              <span className="text-[10px] text-[var(--t-9ca3af)]">+{competitor.practice_areas.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
