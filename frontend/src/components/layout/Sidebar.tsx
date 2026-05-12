'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, BarChart3, FolderOpen, Users,
  CheckSquare, Calendar, Bell, ChevronLeft, ChevronRight,
  Settings, Sparkles, TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

type SubNavItem = { href: string; label: string; exact?: boolean };
type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  subItems?: SubNavItem[];
};

const NAV_MAIN: { label: string; items: NavItem[] }[] = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', desc: 'Vista general' },
      {
        href: '/metricas',
        icon: BarChart3,
        label: 'Métricas',
        desc: 'KPIs y datos',
        subItems: [
          { href: '/metricas', label: 'Departamentales', exact: true },
          { href: '/metricas/individuales', label: 'Individuales' },
        ],
      },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/recursos', icon: FolderOpen, label: 'Recursos', desc: 'Docs y brand' },
      { href: '/equipo', icon: Users, label: 'Equipo', desc: 'Directorio' },
      { href: '/tareas', icon: CheckSquare, label: 'Tareas', desc: 'Kanban' },
      { href: '/calendario', icon: Calendar, label: 'Calendario', desc: 'Contenido' },
    ],
  },
];

export function Sidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen flex-shrink-0 transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[264px]'
      )}
      style={{
        background: 'linear-gradient(180deg, #0c2054 0%, #0f2860 60%, #091840 100%)',
        boxShadow: '1px 0 0 rgba(255,255,255,0.06), 4px 0 20px rgba(0,0,0,0.15)',
      }}
    >
      {/* Subtle texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(ellipse at 80% 0%, rgba(247,156,49,0.08) 0%, transparent 60%)',
        }}
      />

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] z-30 w-6 h-6 rounded-full bg-white border border-[#e5e7eb] shadow-md flex items-center justify-center text-[#6b7280] hover:text-[#0C2054] hover:border-[#0C2054] transition-all"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft className="w-3 h-3" />
        }
      </button>

      {/* ── LOGO ── */}
      <div className={cn(
        'relative z-10 flex items-center border-b border-white/8',
        collapsed ? 'justify-center px-0 py-5' : 'gap-3 px-5 py-5'
      )}>
        <div className="relative flex-shrink-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-display text-[#0C2054] text-xl leading-none shadow-lg"
            style={{ background: 'linear-gradient(135deg, #F79C31 0%, #f0a94a 100%)' }}
          >
            M
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#10b981] border-2 border-[#0C2054]" />
        </div>

        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight tracking-tight">Marketing Hub</p>
            <p className="text-white/40 text-[11px] mt-0.5 truncate">Mangone Law Firm, LLC</p>
          </div>
        )}
      </div>

      {/* ── NAV ── */}
      <nav className="relative z-10 flex-1 px-3 py-5 overflow-y-auto space-y-6">
        {NAV_MAIN.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-white/25 text-[10px] font-semibold uppercase tracking-[0.12em] px-3 mb-2">
                {group.label}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map(({ href, icon: Icon, label, desc, subItems }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      title={collapsed ? label : undefined}
                      className={cn(
                        'group flex items-center rounded-xl transition-all duration-150 relative overflow-hidden',
                        collapsed ? 'justify-center w-12 h-12 mx-auto' : 'gap-3 px-3 py-2.5',
                        active
                          ? 'bg-white/12 text-white'
                          : 'text-white/50 hover:bg-white/6 hover:text-white/80'
                      )}
                    >
                      {/* Active left bar */}
                      {active && (
                        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#F79C31]" />
                      )}

                      {/* Icon container */}
                      <div className={cn(
                        'flex items-center justify-center rounded-lg flex-shrink-0 transition-all',
                        collapsed ? 'w-9 h-9' : 'w-8 h-8',
                        active
                          ? 'bg-[#F79C31] text-[#0C2054] shadow-[0_2px_8px_rgba(247,156,49,0.4)]'
                          : 'bg-white/6 text-white/60 group-hover:bg-white/10 group-hover:text-white'
                      )}>
                        <Icon style={{ width: '16px', height: '16px' }} strokeWidth={active ? 2.5 : 2} />
                      </div>

                      {!collapsed && (
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-[13px] font-semibold leading-tight truncate',
                            active ? 'text-white' : 'text-white/70 group-hover:text-white/90'
                          )}>
                            {label}
                          </p>
                          <p className="text-[11px] text-white/30 group-hover:text-white/40 truncate mt-0.5">
                            {desc}
                          </p>
                        </div>
                      )}
                    </Link>

                    {/* Sub-items */}
                    {subItems && !collapsed && (
                      <ul className="mt-0.5 mb-1 space-y-0.5 pl-[44px] pr-1">
                        {subItems.map(sub => {
                          const subActive = sub.exact
                            ? pathname === sub.href
                            : pathname.startsWith(sub.href);
                          return (
                            <li key={sub.href}>
                              <Link
                                href={sub.href}
                                className={cn(
                                  'flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all',
                                  subActive
                                    ? 'text-white bg-white/10'
                                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                                )}
                              >
                                <span className={cn(
                                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                                  subActive ? 'bg-[#F79C31]' : 'bg-white/20'
                                )} />
                                {sub.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── STATS MINI (solo expandido) ── */}
      {!collapsed && (
        <div className="relative z-10 mx-3 mb-4 rounded-xl p-3.5"
          style={{ background: 'rgba(247,156,49,0.08)', border: '1px solid rgba(247,156,49,0.15)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#F79C31]" />
            <span className="text-[11px] font-semibold text-[#F79C31]">Mayo 2026</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[['284', 'Leads'], ['18.4K', 'Sesiones']].map(([val, lbl]) => (
              <div key={lbl}>
                <p className="text-white font-bold text-base leading-none">{val}</p>
                <p className="text-white/35 text-[10px] mt-0.5">{lbl}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BOTTOM ── */}
      <div className={cn(
        'relative z-10 border-t border-white/8',
        collapsed ? 'px-0 py-3' : 'px-3 py-3'
      )}>
        {/* Notifications */}
        <Link
          href="/notificaciones"
          className={cn(
            'flex items-center rounded-xl text-white/50 hover:bg-white/6 hover:text-white/80 transition-all mb-1',
            collapsed ? 'justify-center w-12 h-12 mx-auto' : 'gap-3 px-3 py-2.5'
          )}
        >
          <div className="relative flex-shrink-0">
            <div className={cn(
              'flex items-center justify-center rounded-lg bg-white/6',
              collapsed ? 'w-9 h-9' : 'w-8 h-8'
            )}>
              <Bell style={{ width: '15px', height: '15px' }} />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-[#F79C31] text-[#0C2054] text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount}
              </span>
            )}
          </div>
          {!collapsed && (
            <span className="text-[13px] font-medium text-white/60">Notificaciones</span>
          )}
        </Link>

        {/* User profile */}
        <div className={cn(
          'flex items-center rounded-xl transition-all cursor-pointer hover:bg-white/6',
          collapsed ? 'justify-center w-12 h-12 mx-auto' : 'gap-3 px-3 py-2.5'
        )}>
          <div className={cn(
            'rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-[#0C2054] shadow-md',
            collapsed ? 'w-9 h-9 text-sm' : 'w-8 h-8 text-[13px]'
          )}
            style={{ background: 'linear-gradient(135deg, #F79C31 0%, #f0a94a 100%)' }}
          >
            SQ
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-semibold truncate leading-tight">Sebastian Quijada</p>
              <p className="text-white/35 text-[11px] truncate">Director · Admin</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

