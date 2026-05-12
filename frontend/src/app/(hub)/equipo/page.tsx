'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Mail, Phone, Search, Grid, List, ChevronDown,
  Star, Plus, Edit2, Trash2, KeyRound, X, Eye, EyeOff, Loader2,
  Network, Check,
} from 'lucide-react';
import { auth, meApi, teamApi, usersApi, type ApiTeamMember, type ApiUserManagement } from '@/lib/api';

const AVATAR_COLORS: Record<string, string> = {
  SQ: '#0C2054', AA: '#7c3aed', AC: '#0984e3',
  GL: '#00b894', SC: '#e17055', JM: '#F79C31',
};

const AREA_COLORS: Record<string, string> = {
  'Dirección':  'bg-[#0C2054]/10 text-[#0C2054]',
  'Contenido':  'bg-purple-50 text-purple-700',
  'Digital':    'bg-blue-50 text-blue-700',
  'Producción': 'bg-green-50 text-green-700',
  'Diseño':     'bg-pink-50 text-pink-700',
  'Paid Media': 'bg-[#fef5e7] text-[#F79C31]',
};

const AREAS = ['Dirección', 'Contenido', 'Digital', 'Producción', 'Diseño', 'Paid Media'];
const ROLES = [
  { value: 'admin',      label: 'Admin' },
  { value: 'team',       label: 'Team' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'viewer',     label: 'Viewer' },
];

function avatarColor(initials: string) {
  return AVATAR_COLORS[initials] || '#0C2054';
}

// ── Member card ───────────────────────────────────────────────────────────────

function MemberCard({
  member, expanded, onToggle, isAdmin,
  onEdit, onResetPassword, onDeactivate,
}: {
  member: ApiTeamMember;
  expanded: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  onEdit: () => void;
  onResetPassword: () => void;
  onDeactivate: () => void;
}) {
  const bg = avatarColor(member.avatar);

  return (
    <Card className={`overflow-hidden transition-all duration-200 ${expanded ? 'ring-2 ring-[#F79C31]' : 'hover:shadow-md'}`}>
      <div className="h-2" style={{ background: bg }} />
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm" style={{ background: bg }}>
            {member.avatar || member.name.slice(0, 2).toUpperCase()}
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
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-2 ${AREA_COLORS[member.area] || 'bg-gray-50 text-gray-600'}`}>
              {member.area}
            </span>
          </div>
        </div>

        {member.bio && (
          <p className="text-sm text-[#4a4a6a] mt-4 leading-relaxed line-clamp-2">{member.bio}</p>
        )}

        {member.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {member.skills.map(s => (
              <span key={s} className="text-[10px] font-medium px-2 py-0.5 bg-[#f7f8fc] text-[#4a4a6a] rounded-full border border-[#e8e8f0]">
                {s}
              </span>
            ))}
          </div>
        )}

        {expanded && (
          <div className="mt-4 pt-4 border-t border-[#f0f0f0] space-y-2">
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
            {member.start_date && (
              <div className="flex items-center gap-2 text-sm text-[#4a4a6a]">
                <span className="text-[#8888a8] text-xs">Desde:</span>
                <span>{new Date(member.start_date).toLocaleDateString('es', { month: 'long', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#f0f0f0]">
          <div className="flex items-center gap-2">
            <a href={`mailto:${member.email}`} className="flex items-center gap-1.5 text-xs font-semibold text-[#4a4a6a] hover:text-[#0C2054] transition-colors">
              <Mail className="w-3.5 h-3.5" /> Contactar
            </a>
            {isAdmin && (
              <>
                <button onClick={onEdit} className="p-1.5 text-[#8888a8] hover:text-[#0C2054] hover:bg-[#f0f0f8] rounded-lg transition-colors" title="Editar">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={onResetPassword} className="p-1.5 text-[#8888a8] hover:text-[#F79C31] hover:bg-[#fef5e7] rounded-lg transition-colors" title="Cambiar contraseña">
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                <button onClick={onDeactivate} className="p-1.5 text-[#8888a8] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Desactivar">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
          <button onClick={onToggle} className="flex items-center gap-1 text-xs font-semibold text-[#8888a8] hover:text-[#4a4a6a] transition-colors">
            {expanded ? 'Menos' : 'Más info'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </Card>
  );
}

// ── User form modal ───────────────────────────────────────────────────────────

interface UserFormData {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
  role: string;
  position: string;
  area: string;
  department: string;
  phone: string;
  bio: string;
  avatar: string;
  skills: string;
  start_date: string;
}

const EMPTY_FORM: UserFormData = {
  first_name: '', last_name: '', username: '', email: '',
  password: '', role: 'team', position: '', area: 'Contenido',
  department: 'Marketing', phone: '', bio: '', avatar: '',
  skills: '', start_date: '',
};

function UserModal({
  mode,
  initial,
  onSave,
  onClose,
}: {
  mode: 'create' | 'edit';
  initial?: ApiUserManagement;
  onSave: (data: UserFormData) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<UserFormData>(() => {
    if (initial) {
      return {
        first_name:  initial.first_name,
        last_name:   initial.last_name,
        username:    initial.username,
        email:       initial.email,
        password:    '',
        role:        initial.profile?.role ?? 'team',
        position:    initial.profile?.position ?? '',
        area:        initial.profile?.area ?? 'Contenido',
        department:  initial.profile?.department ?? 'Marketing',
        phone:       initial.profile?.phone ?? '',
        bio:         initial.profile?.bio ?? '',
        avatar:      initial.profile?.avatar ?? '',
        skills:      (initial.profile?.skills ?? []).join(', '),
        start_date:  initial.profile?.start_date ?? '',
      };
    }
    return EMPTY_FORM;
  });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field: keyof UserFormData, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  // Auto-generate avatar from initials
  function handleNameChange(first: string, last: string) {
    const av = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    setForm(f => ({ ...f, first_name: first, last_name: last, avatar: av || f.avatar }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-[#e8e8f0] bg-[#f7f8fc] rounded-lg outline-none focus:border-[#F79C31] focus:bg-white transition-all placeholder-[#8888a8]';
  const labelCls = 'block text-xs font-semibold text-[#1a1a2e] mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e8f0]">
          <h2 className="font-bold text-[#1a1a2e] text-lg">
            {mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-[#8888a8] hover:text-[#1a1a2e] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Personal */}
          <div>
            <p className="text-xs font-bold text-[#8888a8] uppercase tracking-wider mb-3">Información personal</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nombre *</label>
                <input value={form.first_name} onChange={e => handleNameChange(e.target.value, form.last_name)} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Apellido *</label>
                <input value={form.last_name} onChange={e => handleNameChange(form.first_name, e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Teléfono</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(000) 000-0000" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div>
            <p className="text-xs font-bold text-[#8888a8] uppercase tracking-wider mb-3">Credenciales de acceso</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Usuario *</label>
                <input value={form.username} onChange={e => set('username', e.target.value)} placeholder="ej: alejandra.a" className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>{mode === 'create' ? 'Contraseña *' : 'Nueva contraseña'}</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder={mode === 'create' ? 'Mín. 8 caracteres' : 'Dejar vacío para no cambiar'}
                    required={mode === 'create'}
                    minLength={mode === 'create' ? 8 : undefined}
                    className={`${inputCls} pr-10`}
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8888a8]">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Role & position */}
          <div>
            <p className="text-xs font-bold text-[#8888a8] uppercase tracking-wider mb-3">Rol y cargo</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Rol *</label>
                <select value={form.role} onChange={e => set('role', e.target.value)} className={inputCls}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Cargo *</label>
                <input value={form.position} onChange={e => set('position', e.target.value)} placeholder="ej: Diseñadora Gráfica" className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Área *</label>
                <select value={form.area} onChange={e => set('area', e.target.value)} className={inputCls}>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Fecha de inicio</label>
                <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Bio & skills */}
          <div>
            <p className="text-xs font-bold text-[#8888a8] uppercase tracking-wider mb-3">Perfil</p>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Iniciales (avatar)</label>
                <input value={form.avatar} onChange={e => set('avatar', e.target.value.toUpperCase().slice(0, 2))} placeholder="ej: AA" maxLength={2} className={`${inputCls} uppercase`} />
              </div>
              <div>
                <label className={labelCls}>Bio</label>
                <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} placeholder="Descripción breve del rol..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Skills (separadas por coma)</label>
                <input value={form.skills} onChange={e => set('skills', e.target.value)} placeholder="ej: Figma, Illustrator, Canva" className={inputCls} />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-[#e8e8f0]">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-[#4a4a6a] bg-[#f7f8fc] hover:bg-[#eeeef5] rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#0C2054] text-white hover:bg-[#0a1a3e] rounded-lg transition-colors disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'create' ? 'Crear usuario' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Password reset modal ──────────────────────────────────────────────────────

function PasswordModal({ userId, userName, onClose }: { userId: number; userName: string; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setSaving(true);
    setError('');
    try {
      await usersApi.setPassword(userId, password);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cambiar contraseña');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-[#e8e8f0] bg-[#f7f8fc] rounded-lg outline-none focus:border-[#F79C31] focus:bg-white transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e8f0]">
          <h2 className="font-bold text-[#1a1a2e]">Cambiar contraseña</h2>
          <button onClick={onClose} className="p-1.5 text-[#8888a8] hover:text-[#1a1a2e]"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-[#4a4a6a]">Usuario: <span className="font-semibold">{userName}</span></p>
          <div>
            <label className="block text-xs font-semibold text-[#1a1a2e] mb-1.5">Nueva contraseña</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="Mín. 8 caracteres" className={`${inputCls} pr-10`} />
              <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8888a8]">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1a1a2e] mb-1.5">Confirmar contraseña</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repite la contraseña" className={inputCls} />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">⚠ {error}</p>}
          {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">✓ Contraseña actualizada</p>}
          <div className="flex justify-end gap-3 pt-2 border-t border-[#e8e8f0]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[#4a4a6a] bg-[#f7f8fc] rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#F79C31] text-white rounded-lg disabled:opacity-60">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Org chart ─────────────────────────────────────────────────────────────────

// Tree layout constants (px)
const NW = 152;   // node width
const NH = 86;    // node height (approximate, for SVG line origin)
const GAP_X = 20; // horizontal gap between sibling subtrees
const GAP_Y = 64; // vertical gap between levels

interface OrgNode extends ApiTeamMember {
  children: OrgNode[];
}

interface LayoutNode extends OrgNode {
  x: number;  // left edge of node
  y: number;  // top edge of node
  subtreeWidth: number;
}

function buildTree(members: ApiTeamMember[]): OrgNode[] {
  const map = new Map<number, OrgNode>();
  members.forEach(m => map.set(m.id, { ...m, children: [] }));
  const roots: OrgNode[] = [];
  map.forEach(node => {
    const parentId = node.reports_to_id;
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function computeLayout(node: OrgNode, level: number, startX: number): LayoutNode {
  if (node.children.length === 0) {
    return { ...node, x: startX, y: level * (NH + GAP_Y), subtreeWidth: NW, children: [] };
  }

  let cursor = startX;
  const laidChildren: LayoutNode[] = [];
  for (const child of node.children) {
    const lc = computeLayout(child, level + 1, cursor);
    laidChildren.push(lc);
    cursor += lc.subtreeWidth + GAP_X;
  }
  const totalChildSpan = cursor - startX - GAP_X;
  const subtreeWidth = Math.max(NW, totalChildSpan);

  // Center node over its children
  const childrenMid = startX + totalChildSpan / 2;
  const x = childrenMid - NW / 2;

  return {
    ...node,
    x,
    y: level * (NH + GAP_Y),
    subtreeWidth,
    children: laidChildren,
  };
}

function flattenLayout(node: LayoutNode): LayoutNode[] {
  return [node, ...(node.children as LayoutNode[]).flatMap(flattenLayout)];
}

function OrgNodeCard({
  node,
  editMode,
  allMembers,
  pendingReports,
  onChangeReportsTo,
}: {
  node: LayoutNode;
  editMode: boolean;
  allMembers: ApiTeamMember[];
  pendingReports: Map<number, number | null>;
  onChangeReportsTo: (profileId: number, reportsTo: number | null) => void;
}) {
  const bg = avatarColor(node.avatar);
  const isRoot = (pendingReports.has(node.id)
    ? pendingReports.get(node.id)
    : node.reports_to_id) === null;

  return (
    <div
      className={`w-full rounded-xl border shadow-sm overflow-hidden transition-all duration-150 ${
        isRoot
          ? 'bg-[#0C2054] border-[#0C2054] text-white'
          : 'bg-white border-[#e8e8f0]'
      }`}
      style={{ width: NW }}
    >
      {/* Color stripe */}
      {!isRoot && <div className="h-1.5" style={{ background: bg }} />}

      <div className="p-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
            style={{ background: isRoot ? '#F79C31' : bg, color: isRoot ? '#0C2054' : 'white' }}
          >
            {node.avatar || node.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-xs leading-tight truncate ${isRoot ? 'text-white' : 'text-[#1a1a2e]'}`}>
              {node.name.split(' ')[0]}
            </p>
            <p className={`text-[10px] leading-tight truncate mt-0.5 ${isRoot ? 'text-[#F79C31]' : 'text-[#8888a8]'}`}>
              {node.position.split(' ').slice(0, 3).join(' ')}
            </p>
          </div>
        </div>

        <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-2 ${
          isRoot ? 'bg-white/15 text-white' : (AREA_COLORS[node.area] || 'bg-gray-50 text-gray-600')
        }`}>
          {node.area}
        </span>

        {editMode && (
          <div className="mt-2 pt-2 border-t border-white/20">
            <label className={`block text-[9px] font-bold mb-1 ${isRoot ? 'text-white/60' : 'text-[#8888a8]'}`}>
              Reporta a
            </label>
            <select
              value={
                pendingReports.has(node.id)
                  ? (pendingReports.get(node.id) ?? '')
                  : (node.reports_to_id ?? '')
              }
              onChange={e => onChangeReportsTo(node.id, e.target.value === '' ? null : Number(e.target.value))}
              className="w-full text-[10px] px-1.5 py-1 rounded-md border border-[#d0d0e0] bg-white text-[#1a1a2e] outline-none focus:border-[#F79C31]"
            >
              <option value="">— Ninguno (raíz) —</option>
              {allMembers
                .filter(m => m.id !== node.id)
                .map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name.split(' ')[0]}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

function OrgChart({
  members,
  isAdmin,
  onHierarchyChange,
}: {
  members: ApiTeamMember[];
  isAdmin: boolean;
  onHierarchyChange: (updated: ApiTeamMember[]) => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [pendingReports, setPendingReports] = useState<Map<number, number | null>>(new Map());
  const [saving, setSaving] = useState(false);

  // Build layout
  const roots = buildTree(members);
  let cursor = 0;
  const laidRoots: LayoutNode[] = roots.map(root => {
    const lr = computeLayout(root, 0, cursor);
    cursor += lr.subtreeWidth + GAP_X * 2;
    return lr;
  });

  const allLayoutNodes = laidRoots.flatMap(flattenLayout);
  const totalW = Math.max(NW, cursor - GAP_X * 2);
  const totalH = allLayoutNodes.length > 0
    ? Math.max(...allLayoutNodes.map(n => n.y)) + NH
    : NH;

  function handleChangeReportsTo(profileId: number, reportsTo: number | null) {
    setPendingReports(prev => new Map(prev).set(profileId, reportsTo));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updates = Array.from(pendingReports.entries());
      await Promise.all(updates.map(([id, reportsToId]) => teamApi.updateHierarchy(id, reportsToId)));
      // Build updated members list from pending changes
      const updatedMembers = members.map(m =>
        pendingReports.has(m.id) ? { ...m, reports_to_id: pendingReports.get(m.id)! } : m
      );
      onHierarchyChange(updatedMembers);
      setPendingReports(new Map());
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setPendingReports(new Map());
    setEditMode(false);
  }

  // Effective reports_to for each node (pending overrides stored)
  function effectiveReportsTo(node: LayoutNode): number | null {
    return pendingReports.has(node.id) ? pendingReports.get(node.id)! : node.reports_to_id;
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-[#8888a8]" />
          <h3 className="text-base font-bold text-[#1a1a2e]">Organigrama</h3>
          {pendingReports.size > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#fef5e7] text-[#F79C31] rounded-full">
              {pendingReports.size} cambio{pendingReports.size > 1 ? 's' : ''} sin guardar
            </span>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-xs font-semibold text-[#4a4a6a] bg-[#f7f8fc] hover:bg-[#eeeef5] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || pendingReports.size === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0C2054] text-white rounded-lg hover:bg-[#0a1a3e] disabled:opacity-50 transition-colors"
                >
                  {saving
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Check className="w-3 h-3" />
                  }
                  Guardar jerarquía
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#4a4a6a] bg-[#f7f8fc] hover:bg-[#eeeef5] border border-[#e8e8f0] rounded-lg transition-colors"
              >
                <Edit2 className="w-3 h-3" /> Editar jerarquía
              </button>
            )}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="p-6 overflow-x-auto">
        <div
          className="relative mx-auto"
          style={{ width: totalW, height: totalH + (editMode ? 40 : 0) }}
        >
          {/* SVG connections */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={totalW}
            height={totalH + (editMode ? 40 : 0)}
            style={{ overflow: 'visible' }}
          >
            <defs>
              <marker id="dot" markerWidth="4" markerHeight="4" refX="2" refY="2">
                <circle cx="2" cy="2" r="1.5" fill="#e8e8f0" />
              </marker>
            </defs>
            {allLayoutNodes
              .filter(n => effectiveReportsTo(n) !== null)
              .map(n => {
                const parentId = effectiveReportsTo(n);
                const parent = allLayoutNodes.find(p => p.id === parentId);
                if (!parent) return null;
                const x1 = parent.x + NW / 2;
                const y1 = parent.y + NH;
                const x2 = n.x + NW / 2;
                const y2 = n.y;
                const my = (y1 + y2) / 2;
                // Cubic bezier: exit bottom of parent, enter top of child
                const d = `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
                return (
                  <path
                    key={`${parent.id}-${n.id}`}
                    d={d}
                    stroke="#d0d5e8"
                    strokeWidth={1.5}
                    fill="none"
                    strokeDasharray={editMode ? '4 3' : undefined}
                    markerEnd="url(#dot)"
                  />
                );
              })}
          </svg>

          {/* Nodes */}
          {allLayoutNodes.map(n => (
            <div
              key={n.id}
              className="absolute"
              style={{ left: n.x, top: n.y, width: NW }}
            >
              <OrgNodeCard
                node={n}
                editMode={editMode}
                allMembers={members}
                pendingReports={pendingReports}
                onChangeReportsTo={handleChangeReportsTo}
              />
            </div>
          ))}
        </div>

        {members.length === 0 && (
          <p className="text-center text-sm text-[#8888a8] py-8">No hay miembros activos.</p>
        )}
      </div>

      {editMode && (
        <div className="px-6 pb-4 text-xs text-[#8888a8]">
          Cambia el campo "Reporta a" en cada tarjeta para redefinir la jerarquía, luego guarda.
        </div>
      )}
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Modal =
  | { type: 'create' }
  | { type: 'edit'; user: ApiUserManagement }
  | { type: 'password'; userId: number; userName: string }
  | { type: 'deactivate'; userId: number; userName: string };

export default function EquipoPage() {
  const [members, setMembers] = useState<ApiTeamMember[]>([]);
  const [allUsers, setAllUsers] = useState<ApiUserManagement[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const load = useCallback(async (admin: boolean) => {
    setLoading(true);
    try {
      const [teamRes, usersRes] = await Promise.all([
        teamApi.list(),
        admin ? usersApi.list() : Promise.resolve({ results: [], count: 0 }),
      ]);
      setMembers(teamRes.results);
      if (admin) setAllUsers(usersRes.results);
    } catch {
      // empty state on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    meApi.get()
      .then(me => {
        const admin = me.role === 'admin';
        setIsAdmin(admin);
        localStorage.setItem('current_user', JSON.stringify(me));
        load(admin);
      })
      .catch(() => {
        const cached = auth.getCurrentUser();
        const admin = cached?.role === 'admin';
        setIsAdmin(admin);
        load(admin);
      });
  }, [load]);

  const filtered = members.filter(m =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.position.toLowerCase().includes(search.toLowerCase()) ||
    m.area.toLowerCase().includes(search.toLowerCase())
  );

  function getUserForMember(member: ApiTeamMember): ApiUserManagement | undefined {
    return allUsers.find(u => u.id === member.user_id);
  }

  async function handleSaveUser(form: UserFormData) {
    const skills = form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    const payload = {
      username:   form.username,
      email:      form.email,
      first_name: form.first_name,
      last_name:  form.last_name,
      ...(form.password ? { password: form.password } : {}),
      is_active: true,
      profile: {
        role:       form.role,
        position:   form.position,
        department: form.department,
        area:       form.area,
        phone:      form.phone,
        bio:        form.bio,
        avatar:     form.avatar,
        skills,
        start_date: form.start_date || null,
        status:     'active',
      },
    };

    if (modal?.type === 'create') {
      await usersApi.create(payload as Parameters<typeof usersApi.create>[0]);
    } else if (modal?.type === 'edit') {
      await usersApi.update(modal.user.id, payload);
    }
    setModal(null);
    await load(isAdmin);
  }

  async function handleDeactivate() {
    if (modal?.type !== 'deactivate') return;
    setDeactivating(true);
    try {
      await usersApi.deactivate(modal.userId);
      setModal(null);
      await load(isAdmin);
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <Header title="Equipo" subtitle="Directorio del departamento de marketing" />

      <div className="px-10 py-10 space-y-10">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-6">
          {[
            { val: members.length, label: 'Miembros', icon: '👥' },
            { val: members.filter(m => m.status === 'active').length, label: 'Activos', icon: '✅' },
            { val: [...new Set(members.map(m => m.area))].length, label: 'Áreas', icon: '🗂️' },
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
            <button onClick={() => setView('grid')} className={`p-2 rounded-md transition-all ${view === 'grid' ? 'bg-[#0C2054] text-white' : 'text-[#8888a8] hover:text-[#4a4a6a]'}`}>
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setView('list')} className={`p-2 rounded-md transition-all ${view === 'list' ? 'bg-[#0C2054] text-white' : 'text-[#8888a8] hover:text-[#4a4a6a]'}`}>
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          {isAdmin && (
            <button
              onClick={() => setModal({ type: 'create' })}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#F79C31] text-white text-sm font-semibold rounded-lg hover:bg-[#e08a20] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nuevo usuario
            </button>
          )}
        </div>

        {/* Org chart */}
        {!loading && members.length > 0 && (
          <OrgChart
            members={members}
            isAdmin={isAdmin}
            onHierarchyChange={setMembers}
          />
        )}

        {/* Team grid / list */}
        <div>
          <h3 className="text-base font-bold text-[#1a1a2e] mb-4">
            Perfiles del equipo
            <span className="ml-2 text-sm font-normal text-[#8888a8]">({filtered.length} personas)</span>
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#8888a8]" />
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(m => (
                <MemberCard
                  key={m.id}
                  member={m}
                  expanded={expandedId === m.id}
                  onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
                  isAdmin={isAdmin}
                  onEdit={() => {
                    const user = getUserForMember(m);
                    if (user) setModal({ type: 'edit', user });
                  }}
                  onResetPassword={() => setModal({ type: 'password', userId: m.user_id, userName: m.name })}
                  onDeactivate={() => setModal({ type: 'deactivate', userId: m.user_id, userName: m.name })}
                />
              ))}
            </div>
          ) : (
            <Card>
              <div className="divide-y divide-[#f0f0f0]">
                {filtered.map(m => {
                  const bg = avatarColor(m.avatar);
                  return (
                    <div key={m.id} className="flex items-center gap-4 p-4 hover:bg-[#fafafe] transition-colors">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: bg }}>
                        {m.avatar || m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#1a1a2e]">{m.name}</p>
                          {m.role === 'admin' && <Badge variant="default" size="sm">Admin</Badge>}
                        </div>
                        <p className="text-sm text-[#8888a8]">{m.position}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${AREA_COLORS[m.area] || 'bg-gray-50 text-gray-600'}`}>
                        {m.area}
                      </span>
                      <div className="flex items-center gap-1">
                        <a href={`mailto:${m.email}`} className="p-2 hover:bg-[#f7f8fc] rounded-lg text-[#8888a8] hover:text-[#F79C31] transition-colors">
                          <Mail className="w-4 h-4" />
                        </a>
                        {isAdmin && (
                          <>
                            <button onClick={() => { const u = getUserForMember(m); if (u) setModal({ type: 'edit', user: u }); }} className="p-2 hover:bg-[#f7f8fc] rounded-lg text-[#8888a8] hover:text-[#0C2054] transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setModal({ type: 'password', userId: m.user_id, userName: m.name })} className="p-2 hover:bg-[#fef5e7] rounded-lg text-[#8888a8] hover:text-[#F79C31] transition-colors">
                              <KeyRound className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === 'create' && (
        <UserModal mode="create" onSave={handleSaveUser} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <UserModal mode="edit" initial={modal.user} onSave={handleSaveUser} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'password' && (
        <PasswordModal userId={modal.userId} userName={modal.userName} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'deactivate' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-[#1a1a2e] mb-2">¿Desactivar usuario?</h2>
            <p className="text-sm text-[#4a4a6a] mb-6">
              <span className="font-semibold">{modal.userName}</span> perderá acceso al Hub. Podrás reactivarlo después desde el panel de administración.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-semibold text-[#4a4a6a] bg-[#f7f8fc] rounded-lg">
                Cancelar
              </button>
              <button onClick={handleDeactivate} disabled={deactivating} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg disabled:opacity-60">
                {deactivating && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
