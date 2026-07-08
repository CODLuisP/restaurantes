'use client';

import { useRef, useState } from 'react';
import { Image as ImageIcon, ChevronUp, ChevronDown, Pencil, Trash2, Check, X, Upload, Link as LinkIcon } from 'lucide-react';
import { Modal, Button, Toggle } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useBanners, type Banner, type DayKey } from '@/context/BannersContext';

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'lun', label: 'L' },
  { key: 'mar', label: 'M' },
  { key: 'mie', label: 'X' },
  { key: 'jue', label: 'J' },
  { key: 'vie', label: 'V' },
  { key: 'sab', label: 'S' },
  { key: 'dom', label: 'D' },
];

const emptyForm = (): Omit<Banner, 'id'> => ({
  title: '', image: '', active: true, scheduleEnabled: false, days: [],
});

export default function BannersTab() {
  const { triggerToast } = useApp();
  const { banners, addBanner, updateBanner, removeBanner, moveBanner } = useBanners();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setImageMode('upload');
    setShowModal(true);
  };

  const openEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setForm({ title: banner.title, image: banner.image, active: banner.active, scheduleEnabled: banner.scheduleEnabled, days: banner.days });
    setImageMode(banner.image.startsWith('data:') ? 'upload' : 'url');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, image: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const toggleDay = (day: DayKey) => {
    setForm(f => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day],
    }));
  };

  const handleSubmit = () => {
    if (!form.image) return;
    if (editingId) {
      updateBanner(editingId, { ...form, gradient: undefined });
      triggerToast('Banner actualizado.', 'success');
    } else {
      addBanner(form);
      triggerToast('Banner creado.', 'success');
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      removeBanner(id);
      setDeleteConfirm(null);
      triggerToast('Banner eliminado.', 'info');
    } else {
      setDeleteConfirm(id);
    }
  };

  const move = (index: number, dir: -1 | 1) => moveBanner(index, dir);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Banners</h3>
          <p className="text-xs text-slate-500 mt-0.5">Imágenes destacadas en tu menú. Puedes programar cuándo se muestran.</p>
        </div>
        <Button onClick={openAdd} className="shrink-0">Agregar banner</Button>
      </div>

      {banners.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-12 text-center">
          <ImageIcon className="h-6 w-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No hay banners todavía</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 ${!banner.active ? 'opacity-50' : ''}`}
            >
              <div className={`h-12 w-20 rounded-lg shrink-0 overflow-hidden bg-gradient-to-br ${banner.gradient ?? ''}`}>
                {banner.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={banner.image} alt={banner.title || 'Banner'} className="h-full w-full object-cover" />
                )}
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-semibold text-slate-800 truncate">{banner.title || 'Banner sin título'}</span>
                {banner.scheduleEnabled && banner.days.length > 0 && banner.days.length < 7 && (
                  <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                    {banner.days.length} día{banner.days.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Subir orden"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === banners.length - 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Bajar orden"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(banner)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                  aria-label="Editar banner"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(banner.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    deleteConfirm === banner.id ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                  }`}
                  title={deleteConfirm === banner.id ? 'Clic de nuevo para confirmar' : 'Eliminar'}
                >
                  {deleteConfirm === banner.id ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <p className="text-[11px] text-blue-700">
          <strong className="text-blue-800">Tip:</strong> Los banners sin horario se muestran siempre. Con horario, solo aparecen en los días y franjas configurados.
        </p>
      </div>

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingId ? 'Editar banner' : 'Nuevo banner'}
        subtitle="Agrega un banner con imagen y horario opcional"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.image}>
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
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ej: Banner desayuno, Promo fin de semana"
              className="input w-full px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Imagen <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setImageMode('upload')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  imageMode === 'upload' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Upload className="h-3.5 w-3.5" /> Subir imagen
              </button>
              <button
                type="button"
                onClick={() => setImageMode('url')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  imageMode === 'url' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <LinkIcon className="h-3.5 w-3.5" /> URL directa
              </button>
            </div>

            {imageMode === 'upload' ? (
              form.image ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.image} alt="Vista previa" className="w-full h-28 object-cover rounded-xl border border-slate-200" />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, image: '' }))}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                    aria-label="Quitar imagen"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 rounded-xl border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                >
                  Seleccionar imagen (4:1)
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </button>
              )
            ) : (
              <input
                type="text"
                value={form.image}
                onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                placeholder="https://..."
                className="input w-full px-3 py-2"
              />
            )}
          </div>

          <Toggle
            checked={form.active}
            onChange={v => setForm(f => ({ ...f, active: v }))}
            label="Activo"
          />

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800">Disponibilidad horaria</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">PRO</span>
              </div>
              <Toggle
                checked={form.scheduleEnabled}
                onChange={v => setForm(f => ({ ...f, scheduleEnabled: v }))}
              />
            </div>
            <p className="text-[11px] text-slate-500">Restringe cuándo aparece este banner en el menú</p>

            {form.scheduleEnabled && (
              <div className="flex gap-1.5 pt-1">
                {DAYS.map(d => {
                  const active = form.days.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDay(d.key)}
                      className={`h-8 w-8 rounded-lg text-xs font-bold transition-colors ${
                        active ? 'bg-brand text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
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
