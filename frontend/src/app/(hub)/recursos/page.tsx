'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  FileText, FileType, Image, Search, Upload, Filter,
  Download, Eye, Clock, FolderOpen, BookOpen,
  Palette, Type, Layers, X, AlertCircle, Trash2,
  CheckCircle, Loader2, CloudUpload,
} from 'lucide-react';
import { documentsApi, ApiDocument } from '@/lib/api';

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'all', label: 'Todos', icon: FolderOpen },
  { key: 'sop', label: 'SOPs', icon: FileText },
  { key: 'jd', label: 'Job Descriptions', icon: FileType },
  { key: 'policy', label: 'Políticas', icon: BookOpen },
  { key: 'brand', label: 'Marca', icon: Palette },
  { key: 'manual', label: 'Manuales', icon: Layers },
  { key: 'template', label: 'Templates', icon: Type },
];

const CATEGORY_LABELS: Record<string, string> = {
  sop: 'SOP', jd: 'Job Description', policy: 'Política',
  brand: 'Marca', manual: 'Manual', template: 'Template', other: 'Otro',
};

const fileTypeColors: Record<string, string> = {
  pdf: 'bg-red-50 text-red-700',
  docx: 'bg-blue-50 text-blue-700',
  html: 'bg-purple-50 text-purple-700',
  pptx: 'bg-orange-50 text-orange-700',
  xlsx: 'bg-green-50 text-green-700',
  png: 'bg-pink-50 text-pink-700',
  jpg: 'bg-pink-50 text-pink-700',
  mp4: 'bg-indigo-50 text-indigo-700',
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'bg-green-50 text-green-700' },
  draft: { label: 'Borrador', color: 'bg-amber-50 text-amber-700' },
  archived: { label: 'Archivado', color: 'bg-gray-100 text-gray-500' },
};

const BRAND_COLORS = [
  { name: 'Naranja Mangone', hex: '#F79C31', rgb: '247, 156, 49', cmyk: '0, 53, 86, 0' },
  { name: 'Azul Mangone', hex: '#0C2054', rgb: '12, 32, 84', cmyk: '99, 100, 44, 17' },
  { name: 'Marrón Oscuro', hex: '#3B3537', rgb: '59, 53, 53', cmyk: '78, 80, 67, 41' },
  { name: 'Negro Texto', hex: '#000000', rgb: '0, 0, 0', cmyk: '84, 83, 73, 80' },
  { name: 'Blanco', hex: '#FFFFFF', rgb: '255, 255, 255', cmyk: '0, 0, 0, 0' },
];

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString('es-US', { month: 'short', day: 'numeric' });
}

// ── Color Swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({ color }: { color: typeof BRAND_COLORS[0] }) {
  const [copied, setCopied] = useState(false);
  const copyHex = () => {
    navigator.clipboard.writeText(color.hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div
      className="rounded-xl overflow-hidden border border-[#e8e8f0] hover:shadow-md transition-all cursor-pointer"
      onClick={copyHex}
    >
      <div className="h-24 w-full" style={{ background: color.hex }} />
      <div className="p-3 bg-white">
        <p className="font-bold text-sm text-[#1a1a2e]">{color.name}</p>
        <p className="text-xs text-[#8888a8] mt-1 font-mono">
          {copied ? '¡Copiado!' : color.hex}
        </p>
        <p className="text-[10px] text-[#8888a8] mt-0.5">RGB: {color.rgb}</p>
      </div>
    </div>
  );
}

// ── Document Card ─────────────────────────────────────────────────────────────

function DocumentCard({
  doc,
  onView,
  onDownload,
  onDelete,
}: {
  doc: ApiDocument;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const ext = (doc.file_type || 'other').toUpperCase();
  const sc = statusConfig[doc.status] ?? statusConfig.active;

  return (
    <Card hover className="p-4">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
            fileTypeColors[doc.file_type] || 'bg-gray-50 text-gray-600'
          }`}
        >
          {ext}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1a1a2e] leading-tight mb-1 line-clamp-2">
            {doc.title}
          </p>
          {doc.description && (
            <p className="text-xs text-[#8888a8] line-clamp-2 mb-2">{doc.description}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.color}`}>
              {sc.label}
            </span>
            <span className="text-[10px] text-[#8888a8]">
              v{doc.version} · {doc.size_display}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#f0f0f0]">
        <span className="text-[10px] text-[#8888a8] flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatRelative(doc.updated_at)}
          {doc.uploaded_by_name && (
            <span className="ml-1">· {doc.uploaded_by_name}</span>
          )}
        </span>
        <div className="flex gap-1">
          <button
            onClick={onView}
            title="Ver documento"
            className="p-1.5 rounded-lg hover:bg-[#f7f8fc] text-[#8888a8] hover:text-[#4a4a6a] transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDownload}
            title="Descargar"
            className="p-1.5 rounded-lg hover:bg-[#fef5e7] text-[#8888a8] hover:text-[#F79C31] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Eliminar"
            className="p-1.5 rounded-lg hover:bg-red-50 text-[#8888a8] hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}

// ── Upload Modal ──────────────────────────────────────────────────────────────

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('sop');
  const [description, setDescription] = useState('');
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
    setError('');
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [title]);

  const submit = async () => {
    if (!file || !title.trim()) {
      setError('Selecciona un archivo y escribe un título.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      await documentsApi.upload(
        file,
        { title: title.trim(), description: description.trim(), category },
        (pct) => setProgress(pct),
      );
      setDone(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message ?? 'Error al subir el archivo.');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F79C31]/10 flex items-center justify-center">
              <CloudUpload className="w-5 h-5 text-[#F79C31]" />
            </div>
            <div>
              <h3 className="font-bold text-[#1a1a2e]">Subir documento</h3>
              <p className="text-xs text-[#8888a8]">PDF, DOCX, PPTX, XLSX, imágenes · máx. 50 MB</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#f7f8fc] text-[#8888a8] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragging
                ? 'border-[#F79C31] bg-[#fef5e7]'
                : file
                ? 'border-green-300 bg-green-50'
                : 'border-[#e8e8f0] hover:border-[#F79C31]/50 hover:bg-[#fef5e7]/30'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-[#1a1a2e]">{file.name}</p>
                  <p className="text-xs text-[#8888a8]">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setTitle(''); }}
                  className="ml-auto p-1 rounded-full hover:bg-red-100 text-[#8888a8] hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-[#d0d0e0] mx-auto mb-2" />
                <p className="text-sm text-[#4a4a6a] font-medium">
                  Arrastra el archivo aquí o <span className="text-[#F79C31]">selecciona</span>
                </p>
              </>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre del documento"
              className="w-full px-3 py-2.5 text-sm border border-[#e8e8f0] rounded-lg outline-none focus:border-[#F79C31] transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[#e8e8f0] rounded-lg outline-none focus:border-[#F79C31] bg-white transition-colors"
            >
              {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">
              Descripción <span className="text-[#8888a8] font-normal">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción del documento..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-[#e8e8f0] rounded-lg outline-none focus:border-[#F79C31] transition-colors resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs">{error}</p>
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div>
              <div className="flex justify-between text-xs text-[#8888a8] mb-1.5">
                <span>{done ? 'Completado' : 'Subiendo...'}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    done ? 'bg-green-500' : 'bg-[#F79C31]'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-sm font-semibold text-[#4a4a6a] border border-[#e8e8f0] rounded-lg hover:bg-[#f7f8fc] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={uploading || !file}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#F79C31] rounded-lg hover:bg-[#e08a20] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {done ? 'Listo' : uploading ? 'Subiendo...' : 'Subir documento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteModal({
  doc,
  onClose,
  onConfirm,
}: {
  doc: ApiDocument;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="font-bold text-[#1a1a2e]">Eliminar documento</h3>
        </div>
        <p className="text-sm text-[#4a4a6a] mb-1">
          ¿Estás seguro de que quieres eliminar <strong>"{doc.title}"</strong>?
        </p>
        <p className="text-xs text-[#8888a8] mb-6">Esta acción no se puede deshacer.</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[#4a4a6a] border border-[#e8e8f0] rounded-lg hover:bg-[#f7f8fc] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RecursosPage() {
  const [activeTab, setActiveTab] = useState<'docs' | 'brand'>('docs');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiDocument | null>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const res = await documentsApi.list({ category: category !== 'all' ? category : undefined, search: search || undefined });
      setDocs(res.results);
    } catch (err: any) {
      setApiError(err.message ?? 'Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    if (activeTab === 'docs') loadDocs();
  }, [activeTab, loadDocs]);

  const handleView = async (doc: ApiDocument) => {
    try {
      const { url } = await documentsApi.getDownloadUrl(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      alert(`No se pudo obtener la URL: ${err.message}`);
    }
  };

  const handleDownload = async (doc: ApiDocument) => {
    try {
      const { url, file_name } = await documentsApi.getDownloadUrl(doc.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = file_name;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`No se pudo descargar: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await documentsApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      loadDocs();
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const totalActive = docs.filter(d => d.status === 'active').length;
  const totalJD = docs.filter(d => d.category === 'jd').length;
  const totalSOP = docs.filter(d => d.category === 'sop').length;

  return (
    <div className="animate-fade-in">
      {uploadOpen && (
        <UploadModal onClose={() => setUploadOpen(false)} onSuccess={loadDocs} />
      )}
      {deleteTarget && (
        <DeleteModal
          doc={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      <Header
        title="Recursos"
        subtitle="Documentos, brand assets y manual de marca"
        actions={
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 bg-[#F79C31] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#e08a20] transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            Subir archivo
          </button>
        }
      />

      <div className="px-10 py-10 space-y-10">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-[#e8e8f0] rounded-xl p-1 w-fit">
          {[
            { key: 'docs', label: 'Biblioteca de Documentos', icon: FolderOpen },
            { key: 'brand', label: 'Brand Center', icon: Palette },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as 'docs' | 'brand')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === key ? 'bg-[#0C2054] text-white shadow-sm' : 'text-[#4a4a6a] hover:bg-[#f7f8fc]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Documents Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888a8]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar documentos..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#e8e8f0] bg-white rounded-lg outline-none focus:border-[#F79C31] transition-colors"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setCategory(key)}
                    className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-all ${
                      category === key
                        ? 'bg-[#0C2054] text-white border-[#0C2054]'
                        : 'bg-white text-[#4a4a6a] border-[#e8e8f0] hover:border-[#d0d0e0]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { val: docs.length, label: 'Documentos totales' },
                { val: totalActive, label: 'Activos' },
                { val: totalJD, label: 'Job Descriptions' },
                { val: totalSOP, label: 'SOPs' },
              ].map(({ val, label }) => (
                <Card key={label} className="p-5 text-center">
                  <p className="text-2xl font-bold text-[#0C2054]">{loading ? '—' : val}</p>
                  <p className="text-xs text-[#8888a8] mt-1">{label}</p>
                </Card>
              ))}
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#F79C31] animate-spin" />
              </div>
            ) : apiError ? (
              <Card className="p-10 text-center">
                <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
                <p className="text-[#4a4a6a] font-medium">Error al cargar documentos</p>
                <p className="text-sm text-[#8888a8] mt-1 mb-4">{apiError}</p>
                <button
                  onClick={loadDocs}
                  className="text-sm font-semibold text-[#F79C31] hover:underline"
                >
                  Reintentar
                </button>
              </Card>
            ) : docs.length === 0 ? (
              <Card className="p-12 text-center">
                <FolderOpen className="w-12 h-12 text-[#d0d0e0] mx-auto mb-3" />
                <p className="text-[#4a4a6a] font-medium">No se encontraron documentos</p>
                <p className="text-sm text-[#8888a8] mt-1 mb-4">
                  {search || category !== 'all'
                    ? 'Intenta con otros filtros de búsqueda'
                    : 'Sube tu primer documento para comenzar'}
                </p>
                {!search && category === 'all' && (
                  <button
                    onClick={() => setUploadOpen(true)}
                    className="flex items-center gap-2 mx-auto bg-[#F79C31] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#e08a20] transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Subir documento
                  </button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {docs.map(doc => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onView={() => handleView(doc)}
                    onDownload={() => handleDownload(doc)}
                    onDelete={() => setDeleteTarget(doc)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Brand Tab ───────────────────────────────────────────────────────── */}
        {activeTab === 'brand' && (
          <div className="space-y-8">
            {/* Hero */}
            <div className="bg-gradient-to-r from-[#0C2054] to-[#1a3a7a] rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-[-60px] right-[-60px] w-48 h-48 rounded-full bg-[#F79C31]/10" />
              <p className="text-[#F79C31] text-xs font-semibold uppercase tracking-widest mb-2">Brand Center</p>
              <h2 className="text-white text-2xl font-bold mb-2">Manual de Marca</h2>
              <p className="text-white/60 text-sm max-w-md">
                Guía oficial de identidad visual de Mangone Law Firm, LLC.
                Todo lo que necesitas para representar la marca correctamente.
              </p>
              <div className="flex gap-3 mt-4">
                <button className="flex items-center gap-2 bg-[#F79C31] text-[#0C2054] font-semibold text-sm px-4 py-2 rounded-lg hover:bg-[#e08a20] transition-colors">
                  <Eye className="w-4 h-4" /> Ver manual completo
                </button>
                <button className="flex items-center gap-2 bg-white/10 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-white/20 transition-colors">
                  <Download className="w-4 h-4" /> Descargar PDF
                </button>
              </div>
            </div>

            {/* Colors */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-base font-bold text-[#1a1a2e]">Paleta de Colores</h3>
                <Badge variant="outline">Clic para copiar HEX</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {BRAND_COLORS.map(color => <ColorSwatch key={color.hex} color={color} />)}
              </div>
              <Card className="p-4 mt-4">
                <p className="text-sm font-semibold text-[#1a1a2e] mb-3">Proporción de uso recomendada</p>
                <div className="flex h-10 rounded-lg overflow-hidden shadow-sm">
                  <div className="flex items-center justify-center text-white text-xs font-bold" style={{ width: '40%', background: '#0C2054' }}>40% Azul</div>
                  <div className="flex items-center justify-center text-[#3B3537] text-xs font-bold" style={{ width: '30%', background: '#f0eeec' }}>30% Blanco</div>
                  <div className="flex items-center justify-center text-white text-xs font-bold" style={{ width: '15%', background: '#F79C31' }}>15%</div>
                  <div className="flex items-center justify-center text-white text-xs font-bold" style={{ width: '10%', background: '#3B3537' }}>10%</div>
                  <div className="flex items-center justify-center text-gray-400 text-[10px]" style={{ width: '5%', background: '#e0e0e0' }}>5%</div>
                </div>
              </Card>
            </div>

            {/* Typography */}
            <div>
              <h3 className="text-base font-bold text-[#1a1a2e] mb-4">Tipografías</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Bebas Neue', role: 'Títulos principales', sample: 'MANGONE LAW FIRM', style: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', letterSpacing: '2px', color: '#0C2054' } },
                  { name: 'Montserrat Bold', role: 'Subtítulos', sample: 'Tu aliado en el camino legal', style: { fontFamily: 'Montserrat', fontWeight: 700, fontSize: '20px', color: '#0C2054' } },
                  { name: 'Montserrat Regular', role: 'Cuerpo de texto', sample: 'Apoyamos a los nuevos americanos en su camino hacia la estabilidad legal.', style: { fontFamily: 'Montserrat', fontWeight: 400, fontSize: '15px', color: '#3B3537' } },
                ].map(t => (
                  <Card key={t.name} className="p-5">
                    <p className="text-[#F79C31] text-[10px] font-bold uppercase tracking-widest mb-3">{t.name}</p>
                    <p className="text-xs text-[#8888a8] mb-3">{t.role}</p>
                    <p style={t.style as React.CSSProperties} className="leading-tight">{t.sample}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Logos */}
            <div>
              <h3 className="text-base font-bold text-[#1a1a2e] mb-4">Logos Disponibles</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-6 flex flex-col items-center justify-center bg-white min-h-[160px]">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center gap-3 bg-[#0C2054] text-white px-6 py-4 rounded-xl">
                      <span className="font-display text-3xl text-[#F79C31]">M</span>
                      <div className="text-left">
                        <p className="font-bold text-sm">MANGONE</p>
                        <p className="text-white/60 text-[10px] uppercase tracking-widest">Law Firm LLC</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-[#8888a8] font-medium">Versión oscura (uso en fondos claros)</p>
                  <button className="mt-3 flex items-center gap-1 text-xs text-[#F79C31] font-semibold hover:underline">
                    <Download className="w-3 h-3" /> Descargar PNG
                  </button>
                </Card>
                <Card className="p-6 flex flex-col items-center justify-center bg-[#0C2054] min-h-[160px]">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center gap-3 px-6 py-4">
                      <span className="font-display text-3xl text-[#F79C31]">M</span>
                      <div className="text-left">
                        <p className="font-bold text-sm text-white">MANGONE</p>
                        <p className="text-white/60 text-[10px] uppercase tracking-widest">Law Firm LLC</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-white/40 font-medium">Versión clara (uso en fondos oscuros)</p>
                  <button className="mt-3 flex items-center gap-1 text-xs text-[#F79C31] font-semibold hover:underline">
                    <Download className="w-3 h-3" /> Descargar PNG
                  </button>
                </Card>
              </div>
            </div>

            {/* Awards */}
            <div>
              <h3 className="text-base font-bold text-[#1a1a2e] mb-4">Reconocimientos y Credenciales</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { icon: '🏆', title: 'Top 10 Best Law Firm', sub: 'Client Satisfaction — AILC 2026' },
                  { icon: '⭐', title: 'Best Places to Work 2026', sub: 'Medium Size Business' },
                  { icon: '🚀', title: 'Inc. 5000 — N°538', sub: "America's Fastest-Growing Companies" },
                  { icon: '⚖️', title: 'Inc. 5000 — N°10', sub: 'Industria Legal' },
                  { icon: '📍', title: 'Inc. 5000 — N°13', sub: 'New Jersey' },
                  { icon: '✅', title: 'BBB Acreditado', sub: 'Better Business Bureau' },
                ].map(({ icon, title, sub }) => (
                  <div
                    key={title}
                    className="flex items-start gap-3 p-4 bg-white border border-[#e8e8f0] rounded-xl hover:border-[#F79C31]/40 hover:shadow-sm transition-all"
                  >
                    <span className="text-2xl flex-shrink-0">{icon}</span>
                    <div>
                      <p className="text-sm font-bold text-[#1a1a2e]">{title}</p>
                      <p className="text-xs text-[#8888a8] mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
