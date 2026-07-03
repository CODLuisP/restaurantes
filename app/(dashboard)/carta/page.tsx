'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, BookOpen, Power, X, Check, Download, Printer, QrCode, Utensils } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useCarta, CARTA_CATEGORIES } from '@/context/CartaContext';
import { useSidebar } from '@/context/SidebarContext';
import type { MenuEntry } from '@/types';

const CATEGORIES = [...CARTA_CATEGORIES];

const CATEGORY_COLORS: Record<string, string> = {
  'Entradas':        'bg-amber-100 text-amber-700',
  'Platos de fondo': 'bg-green-100 text-green-700',
  'Bebidas':         'bg-blue-100 text-blue-700',
  'Postres':         'bg-pink-100 text-pink-700',
  'Promociones':     'bg-purple-100 text-purple-700',
};

const emptyForm = (): Omit<MenuEntry, 'id'> => ({
  name: '', price: 0, category: 'Platos de fondo', description: '', available: true, image: '',
});

/* ─── Single QR section ─── */
function QrSection() {
  const [url, setUrl] = useState('/menu');
  useEffect(() => { setUrl(`${window.location.origin}/menu`); }, []);
  const canvasId = 'qr-canvas-carta';

  const handleDownload = () => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'QR-Carta-del-Dia.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank', 'width=400,height=520');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html>
        <head><title>QR Carta del Día</title>
        <style>
          body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff}
          img{width:240px;height:240px}
          h2{font-size:20px;margin:14px 0 4px;color:#005e34;font-weight:800}
          p{font-size:12px;color:#888;margin:0}
          .url{font-size:9px;color:#bbb;margin-top:10px;word-break:break-all;max-width:240px;text-align:center}
        </style></head>
        <body>
          <img src="${dataUrl}" alt="QR Carta" />
          <h2>Carta del Día</h2>
          <p>Escanea para ver el menú de hoy</p>
          <div class="url">${url}</div>
          <script>window.onload=function(){window.print();window.close()}<\/script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="flex flex-col items-center gap-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-sm mx-auto">
      <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-inner">
        <QRCodeCanvas
          id={canvasId}
          value={url}
          size={200}
          bgColor="#ffffff"
          fgColor="#005e34"
          level="M"
          includeMargin={false}
        />
      </div>
      <div className="text-center">
        <p className="text-base font-bold text-slate-800">Carta del Día</p>
        <p className="text-xs text-slate-500 mt-1">Los clientes escanean este QR para ver el menú en su celular.</p>
        <p className="text-[10px] text-slate-400 font-mono mt-2">{url}</p>
      </div>
      <div className="flex gap-3 w-full">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-hover transition-colors"
        >
          <Download className="w-4 h-4" />
          Descargar PNG
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function CartaPage() {
  const { carta, addItem, updateItem, removeItem, toggleItem, toggleCartaActive } = useCarta();
  const { isCollapsed } = useSidebar();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const openAdd = () => { setEditingId(null); setForm(emptyForm()); setShowForm(true); };

  const openEdit = (item: MenuEntry) => {
    setEditingId(item.id);
    setForm({ name: item.name, price: item.price, category: item.category, description: item.description, available: item.available, image: item.image ?? '' });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) updateItem(editingId, form);
    else addItem(form);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) { removeItem(id); setDeleteConfirm(null); }
    else setDeleteConfirm(id);
  };

  const availableCount = carta.items.filter(i => i.available).length;

  /* Agrupar por categoría en el orden oficial; categorías desconocidas al final */
  const groupedCategories = (() => {
    const order = [...CARTA_CATEGORIES] as string[];
    const present = Array.from(new Set(carta.items.map(i => i.category)));
    const ordered = [
      ...order.filter(c => present.includes(c)),
      ...present.filter(c => !order.includes(c)),
    ];
    return ordered.map(category => ({
      category,
      items: carta.items.filter(i => i.category === category),
    }));
  })();

  return (
    <div className="space-y-8 animate-section">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Carta del Día</h3>
          <p className="text-xs text-slate-500">Gestiona los platos y descarga los QRs para imprimir y poner en cada mesa.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCartaActive}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              carta.active ? 'bg-brand text-white hover:bg-brand-hover' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
          >
            <Power className="w-4 h-4" />
            {carta.active ? 'Carta Activa' : 'Carta Inactiva'}
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-hover transition-all"
          >
            <Plus className="w-4 h-4" />
            Agregar Plato
          </button>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
        carta.active ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
      }`}>
        <BookOpen className="w-4 h-4 shrink-0" />
        <span>
          {carta.active
            ? `Carta visible para clientes — ${availableCount} de ${carta.items.length} platos disponibles.`
            : 'Carta oculta — los clientes verán "Carta no disponible" al escanear el QR.'}
        </span>
      </div>

      {/* ── Platos agrupados por categoría ── */}
      {carta.items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400 shadow-sm">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay platos en la carta. Agrega el primero.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedCategories.map(({ category, items }) => (
            <section key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[category] ?? 'bg-gray-100 text-gray-600'}`}>
                  {category}
                </span>
                <span className="text-[11px] text-slate-400">{items.length} platos</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`card-lg overflow-hidden flex flex-col group transition-all hover:shadow-md ${!item.available ? 'opacity-60' : ''}`}
                  >
                    {/* Foto */}
                    <div className="relative h-32 w-full bg-slate-100 overflow-hidden">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.name} referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-300">
                          <Utensils className="h-8 w-8" />
                        </div>
                      )}
                      {!item.available && (
                        <span className="absolute top-2 left-2 text-[9px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold uppercase">
                          No disponible
                        </span>
                      )}
                      <span className="absolute top-2 right-2 text-[10px] bg-white/90 text-brand px-2 py-0.5 rounded-full font-mono font-bold shadow-sm">
                        S/. {item.price.toFixed(2)}
                      </span>
                    </div>

                    {/* Cuerpo */}
                    <div className="p-3 flex-1 flex flex-col">
                      <h5 className="text-sm font-bold text-slate-800 leading-tight">{item.name}</h5>
                      {item.description && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 flex-1">{item.description}</p>}
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                        <button
                          onClick={() => toggleItem(item.id)}
                          title={item.available ? 'Marcar no disponible' : 'Marcar disponible'}
                          className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-brand transition-colors"
                        >
                          {item.available ? <ToggleRight className="w-5 h-5 text-brand" /> : <ToggleLeft className="w-5 h-5" />}
                          {item.available ? 'Activo' : 'Inactivo'}
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              deleteConfirm === item.id ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={deleteConfirm === item.id ? 'Clic de nuevo para confirmar' : 'Eliminar'}
                          >
                            {deleteConfirm === item.id ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── QR único ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="w-5 h-5 text-brand" />
          <h4 className="text-base font-bold text-slate-800">Código QR de la Carta</h4>
          <span className="text-xs text-slate-400 ml-1">Imprímelo y ponlo en las mesas — todos los clientes ven la misma carta.</span>
        </div>
        <QrSection />
      </div>

      {/* ── Modal form ── */}
      {showForm && createPortal(
        <div className={`fixed inset-y-0 right-0 left-0 ${isCollapsed ? 'md:left-16' : 'md:left-64'} z-40 flex items-stretch justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm`}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-bold text-slate-800">{editingId ? 'Editar Plato' : 'Nuevo Plato'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 flex flex-col overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Nombre del plato *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Ceviche Mixto"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-slate-50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Precio (S/.)</label>
                  <input
                    type="number" min={0} step={0.5}
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-brand bg-slate-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Categoría</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-slate-50"
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Ingredientes y preparación..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-slate-50 resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">URL de imagen (opcional)</label>
                <input
                  value={form.image}
                  onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-slate-50"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={e => setForm(f => ({ ...f, available: e.target.checked }))}
                  className="accent-brand w-4 h-4"
                />
                <span className="text-sm text-slate-700">Disponible desde el inicio</span>
              </label>
              <div className="flex gap-2 pt-2 mt-auto">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-hover transition-all">
                  {editingId ? 'Guardar Cambios' : 'Agregar Plato'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
