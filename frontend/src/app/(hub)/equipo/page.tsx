'use client';
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Mail, Phone, ExternalLink, Search,
  Grid, List, ChevronDown, Star,
} from 'lucide-react';
import { MOCK_TEAM } from '@/lib/mock-data';
import type { TeamMember } from '@/types';

const AVATAR_COLORS: Record<string, string> = {
  SQ: '#0C2054',
  AA: '#7c3aed',
  AC: '#0984e3',
  GL: '#00b894',
  SC: '#e17055',
  JM: '#F79C31',
};

const areaColors: Record<string, string> = {
  Dirección: 'bg-[#0C2054]/10 text-[#0C2054]',
  Contenido: 'bg-purple-50 text-purple-700',
  Digital: 'bg-blue-50 text-blue-700',
  Producción: 'bg-green-50 text-green-700',
  Diseño: 'bg-pink-50 text-pink-700',
  'Paid Media': 'bg-[#fef5e7] text-[#F79C31]',
};

function MemberCard({ member, expanded, onToggle }: { member: TeamMember; expanded: boolean; onToggle: () => void }) {
  const initials = member.avatar || member.name.split(' ').map(n => n[0]).join('');
  const bgColor = AVATAR_COLORS[initials] || '#0C2054';

  return (
    <Card className={`overflow-hidden transition-all duration-200 ${expanded ? 'ring-2 ring-[#F79C31]' : 'hover:shadow-md'}`}>
      {/* Top accent */}
      <div className="h-2" style={{ background: bgColor }} />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm"
            style={{ background: bgColor }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-[#1a1a2e] text-base leading-tight">{member.name}</p>
                <p className="text-sm text-[#8888a8] mt-0.5">{member.position}</p>
              </div>
              {member.role === 'admin' && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-[#0C2054] text-white rounded-full flex-shrink-0">
                  <Star className="w-2.5 h-2.5" /> Admin
                </span>
              )}
            </div>
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-2 ${areaColors[member.area] || 'bg-gray-50 text-gray-600'}`}>
              {member.area}
            </span>
          </div>
        </div>

        {/* Bio */}
        {member.bio && (
          <p className="text-sm text-[#4a4a6a] mt-4 leading-relaxed line-clamp-2">{member.bio}</p>
        )}

        {/* Skills */}
        {member.skills && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {member.skills.map(s => (
              <span key={s} className="text-[10px] font-medium px-2 py-0.5 bg-[#f7f8fc] text-[#4a4a6a] rounded-full border border-[#e8e8f0]">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-[#f0f0f0] space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 text-sm text-[#4a4a6a]">
              <Mail className="w-3.5 h-3.5 text-[#8888a8]" />
              <a href={`mailto:${member.email}`} className="hover:text-[#F79C31] transition-colors truncate">{member.email}</a>
            </div>
            {member.phone && (
              <div className="flex items-center gap-2 text-sm text-[#4a4a6a]">
                <Phone className="w-3.5 h-3.5 text-[#8888a8]" />
                <span>{member.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-[#4a4a6a]">
              <span className="text-[#8888a8] text-xs">Desde:</span>
              <span>{new Date(member.startDate).toLocaleDateString('es', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#f0f0f0]">
          <a
            href={`mailto:${member.email}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#4a4a6a] hover:text-[#0C2054] transition-colors"
          >
            <Mail className="w-3.5 h-3.5" /> Contactar
          </a>
          <button
            onClick={onToggle}
            className="flex items-center gap-1 text-xs font-semibold text-[#8888a8] hover:text-[#4a4a6a] transition-colors"
          >
            {expanded ? 'Menos' : 'Más info'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </Card>
  );
}

function OrgChart() {
  return (
    <Card className="p-6">
      <h3 className="text-base font-bold text-[#1a1a2e] mb-6">Organigrama del Departamento</h3>
      <div className="flex flex-col items-center gap-4">
        {/* Director */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 bg-[#0C2054] text-white px-5 py-3 rounded-xl shadow-md">
            <div className="w-8 h-8 rounded-lg bg-[#F79C31] flex items-center justify-center font-bold text-[#0C2054] text-sm">SQ</div>
            <div>
              <p className="font-bold text-sm">Sebastian Quijada</p>
              <p className="text-[#F79C31] text-xs">Director de Marketing</p>
            </div>
          </div>
        </div>

        {/* Connector */}
        <div className="w-px h-8 bg-[#e8e8f0]" />
        <div className="w-full max-w-2xl h-px bg-[#e8e8f0] relative">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="absolute w-px h-6 bg-[#e8e8f0] bottom-0" style={{ left: `${10 + i * 20}%` }} />
          ))}
        </div>

        {/* Team */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
          {MOCK_TEAM.slice(1).map(m => {
            const initials = m.avatar || '';
            const bg = AVATAR_COLORS[initials] || '#8888a8';
            return (
              <div key={m.id} className="flex flex-col items-center p-3 bg-[#f7f8fc] border border-[#e8e8f0] rounded-xl hover:border-[#F79C31]/40 hover:bg-white transition-all">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm mb-2 flex-shrink-0" style={{ background: bg }}>
                  {initials}
                </div>
                <p className="text-xs font-bold text-[#1a1a2e] text-center leading-tight">{m.name.split(' ')[0]}</p>
                <p className="text-[10px] text-[#8888a8] text-center mt-0.5 leading-tight">{m.position.split(' ').slice(0, 2).join(' ')}</p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1.5 ${areaColors[m.area] || 'bg-gray-50 text-gray-600'}`}>
                  {m.area}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export default function EquipoPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = MOCK_TEAM.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.position.toLowerCase().includes(search.toLowerCase()) ||
    m.area.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <Header
        title="Equipo"
        subtitle="Directorio del departamento de marketing"
      />

      <div className="px-10 py-10 space-y-10">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-6">
          {[
            { val: MOCK_TEAM.length, label: 'Miembros', icon: '👥' },
            { val: MOCK_TEAM.filter(m => m.status === 'active').length, label: 'Activos', icon: '✅' },
            { val: [...new Set(MOCK_TEAM.map(m => m.area))].length, label: 'Áreas', icon: '🗂️' },
            { val: 0, label: 'Vacantes', icon: '📋' },
          ].map(({ val, label, icon }) => (
            <Card key={label} className="p-6 text-center">
              <p className="text-2xl mb-2">{icon}</p>
              <p className="text-3xl font-bold text-[#111827] tracking-tight">{val}</p>
              <p className="text-xs text-[#6b7280] mt-1.5 font-medium">{label}</p>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888a8]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, cargo o área..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#e8e8f0] bg-white rounded-lg outline-none focus:border-[#F79C31] transition-colors"
            />
          </div>
          <div className="flex gap-1 bg-white border border-[#e8e8f0] rounded-lg p-1">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-md transition-all ${view === 'grid' ? 'bg-[#0C2054] text-white' : 'text-[#8888a8] hover:text-[#4a4a6a]'}`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-md transition-all ${view === 'list' ? 'bg-[#0C2054] text-white' : 'text-[#8888a8] hover:text-[#4a4a6a]'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Org chart */}
        <OrgChart />

        {/* Team grid */}
        <div>
          <h3 className="text-base font-bold text-[#1a1a2e] mb-4">
            Perfiles del equipo
            <span className="ml-2 text-sm font-normal text-[#8888a8]">({filtered.length} personas)</span>
          </h3>
          {view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(m => (
                <MemberCard
                  key={m.id}
                  member={m}
                  expanded={expandedId === m.id}
                  onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <div className="divide-y divide-[#f0f0f0]">
                {filtered.map(m => {
                  const initials = m.avatar || '';
                  const bg = AVATAR_COLORS[initials] || '#0C2054';
                  return (
                    <div key={m.id} className="flex items-center gap-4 p-4 hover:bg-[#fafafe] transition-colors">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: bg }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#1a1a2e]">{m.name}</p>
                          {m.role === 'admin' && <Badge variant="default" size="sm">Admin</Badge>}
                        </div>
                        <p className="text-sm text-[#8888a8]">{m.position}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${areaColors[m.area] || 'bg-gray-50 text-gray-600'}`}>
                        {m.area}
                      </span>
                      <a href={`mailto:${m.email}`} className="p-2 hover:bg-[#f7f8fc] rounded-lg text-[#8888a8] hover:text-[#F79C31] transition-colors">
                        <Mail className="w-4 h-4" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
