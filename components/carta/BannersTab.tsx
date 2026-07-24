'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Image as ImageIcon, ChevronUp, ChevronDown, Pencil, Trash2, X, Upload, Link as LinkIcon } from 'lucide-react';
import { Modal, Button, Toggle, Select, Spinner } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getBanners, createBanner, updateBanner, deleteBanner, reorderBanners } from '@/lib/api/banners';
import { getSucursales } from '@/lib/api/sucursales';
import { resizeImageToBlob, subirImagenProducto, extractCloudflareImageId, eliminarImagenProductoCloudflare, getCloudflareVariant } from '@/lib/uploadImagen';
import type { BannerDto, CreateBannerDto, UpdateBannerDto } from '@/types/banners';

type DayKey = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'lun', label: 'L' },
  { key: 'mar', label: 'M' },
  { key: 'mie', label: 'X' },
  { key: 'jue', label: 'J' },
  { key: 'vie', label: 'V' },
  { key: 'sab', label: 'S' },
  { key: 'dom', label: 'D' },
];

interface BannerForm {
  titulo: string;
  imagenUrl: string;
  gradient: string;
  activo: boolean;
  programacionHoraria: boolean;
  dias: DayKey[];
}

const emptyForm = (): BannerForm => ({
  titulo: '', imagenUrl: '', gradient: '', activo: true, programacionHoraria: false, dias: ['lun','mar','mie','jue','vie','sab','dom'],
});

export default function BannersTab() {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const token = session?.accessToken;
  const isSuperAdmin = session?.user?.role === "superadmin";

  const [banners, setBanners] = useState<BannerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([]);
  const [selectedSucursalId, setSelectedSucursalId] = useState<number | null>(null);

  const fetchBanners = useCallback(async (sId: number) => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getBanners(token, sId);
      setBanners(data);
    } catch {
      triggerToast('Error al cargar banners', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, triggerToast]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getSucursales(token)
      .then((lista) => {
        const activas = lista.filter((s) => s.activo);
        setSucursales(activas.map((s) => ({ id: s.id, nombre: s.nombre })));
        const sId = session?.user?.sucursalId ?? activas[0]?.id;
        if (!sId) {
          setLoading(false);
          return;
        }
        setSelectedSucursalId(sId);
        fetchBanners(sId);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [token, session?.user?.sucursalId, fetchBanners]);

  const handleSucursalChange = (nuevoId: number) => {
    setSelectedSucursalId(nuevoId);
    fetchBanners(nuevoId);
  };

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BannerForm>(emptyForm());
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [pendingBannerBlob, setPendingBannerBlob] = useState<Blob | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<BannerDto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setImageMode('upload');
    setPendingBannerBlob(null);
    if (bannerPreviewUrl) { URL.revokeObjectURL(bannerPreviewUrl); setBannerPreviewUrl(''); }
    setShowModal(true);
  };

  const openEdit = (banner: BannerDto) => {
    setEditingId(banner.id);
    setForm({
      titulo: banner.titulo,
      imagenUrl: banner.imagenUrl,
      gradient: banner.gradient ?? '',
      activo: banner.activo,
      programacionHoraria: banner.programacionHoraria,
      dias: banner.dias as DayKey[],
    });
    setImageMode('url');
    setPendingBannerBlob(null);
    if (bannerPreviewUrl) { URL.revokeObjectURL(bannerPreviewUrl); setBannerPreviewUrl(''); }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    if (bannerPreviewUrl) { URL.revokeObjectURL(bannerPreviewUrl); setBannerPreviewUrl(''); }
    setPendingBannerBlob(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const blob = await resizeImageToBlob(file, 1200, 400, 0.8);
      if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
      const previewUrl = URL.createObjectURL(blob);
      setBannerPreviewUrl(previewUrl);
      setPendingBannerBlob(blob);
      setForm(f => ({ ...f, imagenUrl: previewUrl }));
    } catch {
      triggerToast('No se pudo procesar la imagen.', 'error');
    }
    e.target.value = '';
  };

  const toggleDay = (day: DayKey) => {
    setForm(f => ({
      ...f,
      dias: f.dias.includes(day) ? f.dias.filter(d => d !== day) : [...f.dias, day],
    }));
  };

  const handleSubmit = async () => {
    if (!token || !selectedSucursalId) return;

    let imagenUrl = form.imagenUrl;
    let imagenSubidaId: string | null = null;

    if (pendingBannerBlob) {
      try {
        const subida = await subirImagenProducto(pendingBannerBlob);
        imagenUrl = subida.url;
        imagenSubidaId = subida.imageId;
      } catch {
        triggerToast('Error al subir la imagen.', 'error');
        return;
      }
    } else if (!imagenUrl) {
      triggerToast('Agrega una imagen para el banner.', 'warning');
      return;
    }

    const dto: CreateBannerDto | UpdateBannerDto = {
      titulo: form.titulo,
      imagenUrl,
      gradient: form.gradient || null,
      activo: form.activo,
      programacionHoraria: form.programacionHoraria,
      dias: form.dias,
    };

    try {
      if (editingId) {
        const originalBanner = banners.find(b => b.id === editingId);
        if (originalBanner) {
          const idAnterior = extractCloudflareImageId(originalBanner.imagenUrl);
          if (idAnterior && imagenUrl !== originalBanner.imagenUrl) {
            eliminarImagenProductoCloudflare(idAnterior);
          }
        }
        const updated = await updateBanner(token, editingId, dto);
        setBanners(prev => prev.map(b => b.id === editingId ? updated : b));
        triggerToast('Banner actualizado.', 'success');
      } else {
        const created = await createBanner(token, selectedSucursalId, dto);
        setBanners(prev => [...prev, created]);
        triggerToast('Banner creado.', 'success');
      }
      closeModal();
    } catch {
      if (imagenSubidaId) eliminarImagenProductoCloudflare(imagenSubidaId);
      triggerToast('Error al guardar el banner.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;
    try {
      const idAnterior = extractCloudflareImageId(deleteTarget.imagenUrl);
      if (idAnterior) eliminarImagenProductoCloudflare(idAnterior);
      await deleteBanner(token, deleteTarget.id);
      setBanners(prev => prev.filter(b => b.id !== deleteTarget.id));
      setDeleteTarget(null);
      triggerToast('Banner eliminado.', 'info');
    } catch {
      triggerToast('Error al eliminar el banner.', 'error');
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!token || !selectedSucursalId) return;
    const target = index + dir;
    if (target < 0 || target >= banners.length) return;
    const next = [...banners];
    [next[index], next[target]] = [next[target], next[index]];
    setBanners(next);
    try {
      await reorderBanners(token, selectedSucursalId, { orderedIds: next.map(b => b.id) });
    } catch {
      fetchBanners(selectedSucursalId);
    }
  };

  return (
    <div className="space-y-5">
      {isSuperAdmin && sucursales.length > 0 && (
        <div className="flex justify-end">
          <Select
            value={selectedSucursalId ?? ""}
            onChange={(e) => handleSucursalChange(Number(e.target.value))}
          >
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </Select>
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Banners</h3>
          <p className="text-xs text-slate-500 mt-0.5">Imágenes destacadas en tu menú. Puedes programar cuándo se muestran.</p>
        </div>
        <Button onClick={openAdd} className="shrink-0">Agregar banner</Button>
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs font-semibold text-slate-600">Cargando banners...</p>
        </div>
      ) : banners.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-12 text-center">
          <ImageIcon className="h-6 w-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No hay banners todavía</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 ${!banner.activo ? 'opacity-50' : ''}`}
            >
              <div className={`h-12 w-20 rounded-lg shrink-0 overflow-hidden bg-gradient-to-br ${banner.gradient ?? 'from-slate-200 to-slate-300'}`}>
                {banner.imagenUrl && (
                  <img
                    src={getCloudflareVariant(banner.imagenUrl, 'thumbnail')}
                    alt={banner.titulo || 'Banner'}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      if (e.currentTarget.src !== banner.imagenUrl) {
                        e.currentTarget.src = banner.imagenUrl;
                      }
                    }}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-semibold text-slate-800 truncate">{banner.titulo || 'Banner sin título'}</span>
                {banner.programacionHoraria && banner.dias.length > 0 && banner.dias.length < 7 && (
                  <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                    {banner.dias.length} día{banner.dias.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Subir orden">
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === banners.length - 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Bajar orden">
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => openEdit(banner)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50" aria-label="Editar banner">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setDeleteTarget(banner)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <p className="text-[11px] text-blue-700">
          <strong className="text-blue-800">Tip:</strong> Los banners sin horario se muestran siempre. Con horario, solo aparecen en los días configurados.
        </p>
      </div>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar banner"
        subtitle={`¿Estás seguro de eliminar "${deleteTarget?.titulo || 'este banner'}"?`}
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
          </>
        }
      />

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingId ? 'Editar banner' : 'Nuevo banner'}
        subtitle="Agrega un banner con imagen y horario opcional"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.imagenUrl && !pendingBannerBlob}>
              {editingId ? 'Guardar banner' : 'Crear banner'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Título interno (opcional)
            </label>
            <input type="text" value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Ej: Banner desayuno, Promo fin de semana"
              className="input w-full px-3 py-2" />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Imagen <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setImageMode('upload'); if (imageMode === 'upload') fileInputRef.current?.click(); }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${imageMode === 'upload' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <Upload className="h-3.5 w-3.5" /> Subir imagen
              </button>
              <button type="button" onClick={() => setImageMode('url')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${imageMode === 'url' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <LinkIcon className="h-3.5 w-3.5" /> URL directa
              </button>
            </div>

            {imageMode === 'upload' ? (
              form.imagenUrl ? (
                <div className="relative">
                  <img src={form.imagenUrl} alt="Vista previa" className="w-full h-28 object-cover rounded-xl border border-slate-200" />
                  <button type="button" onClick={() => { setForm(f => ({ ...f, imagenUrl: '' })); setPendingBannerBlob(null); if (bannerPreviewUrl) { URL.revokeObjectURL(bannerPreviewUrl); setBannerPreviewUrl(''); } }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80" aria-label="Quitar imagen">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 rounded-xl border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-colors">
                  Seleccionar imagen (4:1)
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </button>
              )
            ) : (
              <input type="text" value={form.imagenUrl}
                onChange={e => setForm(f => ({ ...f, imagenUrl: e.target.value }))}
                placeholder="https://..."
                className="input w-full px-3 py-2" />
            )}
          </div>

          <Toggle checked={form.activo} onChange={v => setForm(f => ({ ...f, activo: v }))} label="Activo" />

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800">Disponibilidad horaria</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">PRO</span>
              </div>
              <Toggle checked={form.programacionHoraria} onChange={v => setForm(f => ({ ...f, programacionHoraria: v }))} />
            </div>
            <p className="text-[11px] text-slate-500">Restringe cuándo aparece este banner en el menú</p>

            {form.programacionHoraria && (
              <div className="flex gap-1.5 pt-1">
                {DAYS.map(d => {
                  const active = form.dias.includes(d.key);
                  return (
                    <button key={d.key} type="button" onClick={() => toggleDay(d.key)}
                      className={`h-8 w-8 rounded-lg text-xs font-bold transition-colors ${active ? 'bg-brand text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
