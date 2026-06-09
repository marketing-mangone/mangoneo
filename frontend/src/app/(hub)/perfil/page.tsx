'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/components/theme/ThemeProvider';
import {
  Mail, Phone, Briefcase, Building2, Users2, Calendar, Clock,
  Edit2, X, Check, Loader2, Eye, EyeOff, KeyRound, ShieldCheck,
  Sun, Moon, Plus, Sparkles, UserRound,
} from 'lucide-react';
import { auth, meApi, type CurrentUser, type MeUpdateInput } from '@/lib/api';

// ── Constantes ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  team: 'Equipo',
  leadership: 'Liderazgo',
  viewer: 'Invitado',
};

const ROLE_VARIANT: Record<string, 'default' | 'orange' | 'info' | 'success'> = {
  admin: 'orange',
  team: 'default',
  leadership: 'info',
  viewer: 'success',
};

const AVATAR_OPTIONS = ['👤', '🧑‍💼', '👩‍💼', '👨‍💼', '🧑‍🎨', '✍️', '🎬', '📊', '📈', '🌐', '⚖️', '🚀'];

const EMPTY_FORM: MeUpdateInput = {
  first_name: '', last_name: '', email: '', position: '',
  department: '', area: '', phone: '', bio: '', avatar: '', skills: [],
};

// ── Estilos compartidos ───────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2.5 text-sm border border-[var(--s-e8e8f0)] bg-[var(--s-f7f8fc)] rounded-lg outline-none ' +
  'text-[var(--t-1a1a2e)] focus:border-[var(--s-f79c31)] focus:bg-[var(--surface)] transition-all ' +
  'placeholder-[var(--t-8888a8)] disabled:opacity-60 disabled:cursor-not-allowed';
const labelCls = 'block text-xs font-semibold text-[var(--t-6b7280)] uppercase tracking-wide mb-1.5';

function fmtDate(d?: string | null) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('es-US', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '—';
  }
}

function fmtDateTime(d?: string | null) {
  if (!d) return 'Nunca';
  try {
    return new Date(d).toLocaleString('es-US', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

// ── Página ──────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<MeUpdateInput>(EMPTY_FORM);
  const [skillDraft, setSkillDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await meApi.get();
      setUser(data);
    } catch {
      // Fallback: usar los datos de sesión cacheados si el servidor no responde
      const cached = auth.getCurrentUser();
      if (cached) {
        setUser(cached);
        setBanner({ type: 'err', msg: 'Mostrando datos guardados; no se pudo contactar al servidor.' });
      } else {
        setBanner({ type: 'err', msg: 'No se pudo cargar el perfil.' });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-ocultar banner
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  function startEdit() {
    if (!user) return;
    setForm({
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      email: user.email ?? '',
      position: user.position ?? '',
      department: user.department ?? '',
      area: user.area ?? '',
      phone: user.phone ?? '',
      bio: user.bio ?? '',
      avatar: user.avatar ?? '',
      skills: user.skills ?? [],
    });
    setEditing(true);
    setBanner(null);
  }

  function set<K extends keyof MeUpdateInput>(key: K, val: MeUpdateInput[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function addSkill() {
    const s = skillDraft.trim();
    if (!s) return;
    const current = form.skills ?? [];
    if (current.some(x => x.toLowerCase() === s.toLowerCase())) { setSkillDraft(''); return; }
    set('skills', [...current, s]);
    setSkillDraft('');
  }

  function removeSkill(s: string) {
    set('skills', (form.skills ?? []).filter(x => x !== s));
  }

  async function save() {
    setSaving(true);
    setBanner(null);
    try {
      const updated = await meApi.update(form);
      setUser(updated);
      setEditing(false);
      setBanner({ type: 'ok', msg: 'Perfil actualizado correctamente.' });
    } catch (e) {
      setBanner({ type: 'err', msg: e instanceof Error ? e.message : 'Error al guardar.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Mi Perfil" subtitle="Información de tu cuenta" />
        <div className="flex items-center justify-center py-32 text-[var(--t-8888a8)]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header title="Mi Perfil" subtitle="Información de tu cuenta" />
        <div className="p-8 text-center text-[var(--t-6b7280)]">No se pudo cargar el perfil.</div>
      </>
    );
  }

  const initials = (user.name || user.username || 'U')
    .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const roleKey = user.role || 'viewer';
  const displayAvatar = editing ? form.avatar : user.avatar;

  return (
    <>
      <Header
        title="Mi Perfil"
        subtitle="Gestiona tu información personal y preferencias"
        actions={
          !editing ? (
            <Button variant="outline" size="md" onClick={startEdit}>
              <Edit2 className="w-4 h-4" /> Editar perfil
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="md" onClick={() => setEditing(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="primary" size="md" onClick={save} loading={saving}>
                <Check className="w-4 h-4" /> Guardar cambios
              </Button>
            </div>
          )
        }
      />

      <div className="p-8 space-y-6 page-enter max-w-[1100px] mx-auto">
        {/* Banner de estado */}
        {banner && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
              banner.type === 'ok'
                ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
            }`}
          >
            {banner.type === 'ok' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {banner.msg}
          </div>
        )}

        {/* ── HERO ── */}
        <Card>
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center text-white font-bold text-3xl flex-shrink-0 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #0C2054 0%, #1a3a7a 100%)' }}
                >
                  {displayAvatar ? <span className="text-4xl">{displayAvatar}</span> : initials}
                </div>
              </div>

              {/* Identidad */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <h2 className="text-2xl font-bold text-[var(--t-1a1a2e)] tracking-tight">
                    {user.name || user.username}
                  </h2>
                  <Badge variant={ROLE_VARIANT[roleKey] ?? 'default'} size="md">
                    {ROLE_LABELS[roleKey] ?? roleKey}
                  </Badge>
                  {user.status && user.status !== 'active' && (
                    <Badge variant="warning" size="md">Inactivo</Badge>
                  )}
                </div>
                <p className="text-[var(--t-6b7280)] mt-1 font-medium">
                  {user.position || 'Sin cargo asignado'}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2 mt-4 text-sm text-[var(--t-6b7280)]">
                  <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-[var(--t-8888a8)]" /> {user.email || '—'}</span>
                  {user.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-[var(--t-8888a8)]" /> {user.phone}</span>}
                  {user.department && <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-[var(--t-8888a8)]" /> {user.department}</span>}
                  {user.area && <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-[var(--t-8888a8)]" /> {user.area}</span>}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Métricas de cuenta ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Users2 className="w-4 h-4" />} label="Reporta a" value={user.reports_to_name || '—'} />
          <StatCard icon={<Calendar className="w-4 h-4" />} label="Fecha de ingreso" value={fmtDate(user.start_date)} />
          <StatCard icon={<Clock className="w-4 h-4" />} label="Último acceso" value={fmtDateTime(user.last_login)} />
          <StatCard icon={<ShieldCheck className="w-4 h-4" />} label="Miembro desde" value={fmtDate(user.date_joined)} />
        </div>

        {/* ── Información personal ── */}
        <Card>
          <div className="px-6 pt-6 pb-2 flex items-center gap-2">
            <UserRound className="w-4 h-4 text-[var(--t-f79c31)]" />
            <h3 className="text-[15px] font-bold text-[var(--t-1a1a2e)]">Información personal</h3>
          </div>
          <div className="p-6 pt-3">
            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Nombre">
                  <input className={inputCls} value={form.first_name} onChange={e => set('first_name', e.target.value)} />
                </Field>
                <Field label="Apellido">
                  <input className={inputCls} value={form.last_name} onChange={e => set('last_name', e.target.value)} />
                </Field>
                <Field label="Correo electrónico">
                  <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} />
                </Field>
                <Field label="Teléfono">
                  <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(000) 000-0000" />
                </Field>
                <Field label="Cargo">
                  <input className={inputCls} value={form.position} onChange={e => set('position', e.target.value)} placeholder="ej: Coordinadora de Contenido" />
                </Field>
                <Field label="Departamento">
                  <input className={inputCls} value={form.department} onChange={e => set('department', e.target.value)} />
                </Field>
                <Field label="Área">
                  <input className={inputCls} value={form.area} onChange={e => set('area', e.target.value)} placeholder="ej: Contenido" />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Biografía">
                    <textarea
                      className={`${inputCls} min-h-[90px] resize-y`}
                      value={form.bio}
                      onChange={e => set('bio', e.target.value)}
                      placeholder="Cuéntale al equipo sobre ti…"
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                <ReadField label="Nombre completo" value={user.name} />
                <ReadField label="Correo electrónico" value={user.email} />
                <ReadField label="Teléfono" value={user.phone} />
                <ReadField label="Cargo" value={user.position} />
                <ReadField label="Departamento" value={user.department} />
                <ReadField label="Área" value={user.area} />
                <div className="md:col-span-2">
                  <ReadField label="Biografía" value={user.bio} multiline />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ── Avatar (solo en edición) ── */}
        {editing && (
          <Card>
            <div className="px-6 pt-6 pb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--t-f79c31)]" />
              <h3 className="text-[15px] font-bold text-[var(--t-1a1a2e)]">Avatar</h3>
            </div>
            <div className="p-6 pt-3">
              <p className={labelCls}>Elige un ícono</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => set('avatar', '')}
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xs font-bold text-[var(--t-6b7280)] transition-all ${
                    !form.avatar ? 'border-[var(--s-f79c31)] bg-[var(--s-fef5e7)]' : 'border-[var(--s-e8e8f0)] hover:border-[var(--s-d0d0e0)]'
                  }`}
                  title="Usar iniciales"
                >
                  {initials}
                </button>
                {AVATAR_OPTIONS.map(emo => (
                  <button
                    key={emo}
                    type="button"
                    onClick={() => set('avatar', emo)}
                    className={`w-12 h-12 rounded-xl border flex items-center justify-center text-2xl transition-all ${
                      form.avatar === emo ? 'border-[var(--s-f79c31)] bg-[var(--s-fef5e7)]' : 'border-[var(--s-e8e8f0)] hover:border-[var(--s-d0d0e0)]'
                    }`}
                  >
                    {emo}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* ── Habilidades ── */}
        <Card>
          <div className="px-6 pt-6 pb-2 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[var(--t-f79c31)]" />
            <h3 className="text-[15px] font-bold text-[var(--t-1a1a2e)]">Habilidades</h3>
          </div>
          <div className="p-6 pt-3">
            {editing ? (
              <>
                <div className="flex gap-2 mb-3">
                  <input
                    className={inputCls}
                    value={skillDraft}
                    onChange={e => setSkillDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                    placeholder="Agregar habilidad y presiona Enter"
                  />
                  <Button variant="outline" size="md" onClick={addSkill}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(form.skills ?? []).map(s => (
                    <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--s-f7f8fc)] border border-[var(--s-e8e8f0)] text-[var(--t-374151)]">
                      {s}
                      <button type="button" onClick={() => removeSkill(s)} className="text-[var(--t-8888a8)] hover:text-[var(--t-f79c31)]">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {(form.skills ?? []).length === 0 && (
                    <p className="text-sm text-[var(--t-8888a8)]">Sin habilidades aún.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(user.skills ?? []).length > 0 ? (
                  (user.skills ?? []).map(s => (
                    <span key={s} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--s-f7f8fc)] border border-[var(--s-e8e8f0)] text-[var(--t-374151)]">
                      {s}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-[var(--t-8888a8)]">No has agregado habilidades.</p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* ── Preferencias ── */}
        <Card>
          <div className="px-6 pt-6 pb-2 flex items-center gap-2">
            <Sun className="w-4 h-4 text-[var(--t-f79c31)]" />
            <h3 className="text-[15px] font-bold text-[var(--t-1a1a2e)]">Preferencias</h3>
          </div>
          <div className="p-6 pt-3">
            <p className={labelCls}>Apariencia</p>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <ThemeOption
                active={theme === 'light'}
                onClick={() => setTheme('light')}
                icon={<Sun className="w-5 h-5" />}
                label="Modo claro"
              />
              <ThemeOption
                active={theme === 'dark'}
                onClick={() => setTheme('dark')}
                icon={<Moon className="w-5 h-5" />}
                label="Modo oscuro"
              />
            </div>
          </div>
        </Card>

        {/* ── Seguridad ── */}
        <PasswordCard onResult={setBanner} />
      </div>
    </>
  );
}

// ── Subcomponentes ─────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center gap-2 text-[var(--t-8888a8)] mb-1.5">
          {icon}
          <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
        </div>
        <p className="text-sm font-bold text-[var(--t-1a1a2e)] truncate" title={value}>{value}</p>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function ReadField({ label, value, multiline }: { label: string; value?: string | null; multiline?: boolean }) {
  return (
    <div>
      <p className={labelCls}>{label}</p>
      <p className={`text-sm text-[var(--t-1a1a2e)] ${multiline ? 'whitespace-pre-wrap leading-relaxed' : 'font-medium'}`}>
        {value && value.trim() ? value : <span className="text-[var(--t-8888a8)] font-normal">—</span>}
      </p>
    </div>
  );
}

function ThemeOption({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        active
          ? 'border-[var(--s-f79c31)] bg-[var(--s-fef5e7)] text-[var(--t-f79c31)]'
          : 'border-[var(--s-e8e8f0)] text-[var(--t-6b7280)] hover:border-[var(--s-d0d0e0)] hover:bg-[var(--s-f7f8fc)]'
      }`}
    >
      <span className={active ? 'text-[var(--t-f79c31)]' : 'text-[var(--t-8888a8)]'}>{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
      {active && <Check className="w-4 h-4 ml-auto" />}
    </button>
  );
}

// ── Cambio de contraseña ──────────────────────────────────────────────────────

function PasswordCard({ onResult }: { onResult: (b: { type: 'ok' | 'err'; msg: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [oldP, setOldP] = useState('');
  const [newP, setNewP] = useState('');
  const [confirmP, setConfirmP] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setOldP(''); setNewP(''); setConfirmP(''); setErr(null); setOpen(false);
  }

  async function submit() {
    setErr(null);
    if (newP.length < 8) { setErr('La nueva contraseña debe tener al menos 8 caracteres.'); return; }
    if (newP !== confirmP) { setErr('Las contraseñas no coinciden.'); return; }
    setSaving(true);
    try {
      await meApi.changePassword(oldP, newP);
      reset();
      onResult({ type: 'ok', msg: 'Contraseña actualizada correctamente.' });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al cambiar la contraseña.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="px-6 pt-6 pb-2 flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-[var(--t-f79c31)]" />
        <h3 className="text-[15px] font-bold text-[var(--t-1a1a2e)]">Seguridad</h3>
      </div>
      <div className="p-6 pt-3">
        {!open ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--t-1a1a2e)]">Contraseña</p>
              <p className="text-xs text-[var(--t-8888a8)] mt-0.5">Cámbiala periódicamente para mantener tu cuenta segura.</p>
            </div>
            <Button variant="outline" size="md" onClick={() => setOpen(true)}>Cambiar contraseña</Button>
          </div>
        ) : (
          <div className="space-y-4 max-w-md">
            {err && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-xs font-medium">
                <X className="w-3.5 h-3.5" /> {err}
              </div>
            )}
            <Field label="Contraseña actual">
              <input type={show ? 'text' : 'password'} className={inputCls} value={oldP} onChange={e => setOldP(e.target.value)} autoComplete="current-password" />
            </Field>
            <Field label="Nueva contraseña">
              <div className="relative">
                <input type={show ? 'text' : 'password'} className={`${inputCls} pr-10`} value={newP} onChange={e => setNewP(e.target.value)} placeholder="Mín. 8 caracteres" autoComplete="new-password" />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t-8888a8)] hover:text-[var(--t-6b7280)]">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            <Field label="Confirmar nueva contraseña">
              <input type={show ? 'text' : 'password'} className={inputCls} value={confirmP} onChange={e => setConfirmP(e.target.value)} autoComplete="new-password" />
            </Field>
            <div className="flex items-center gap-2 pt-1">
              <Button variant="primary" size="md" onClick={submit} loading={saving}>Actualizar contraseña</Button>
              <Button variant="ghost" size="md" onClick={reset} disabled={saving}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
