'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Plus, GripVertical, X, Eye, EyeOff, ChevronUp, ChevronDown, Copy, Trash2,
  Printer, FileText, RotateCcw, Save, Download, Bold,
  ReceiptText, User, ChefHat, Layers, SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import TicketPreview from './TicketPreview';
import {
  type Side, type PaperSize, type BlockType, type TicketBlock, type TicketConfig,
  type Align, type FontSize, type SepStyle,
  BLOCK_META, ADDABLE, SEP_LABEL, makeBlock, defaultConfig, SEP_CHAR,
  TICKETS_STORAGE_KEY,
} from './ticketData';

/* ─── Controles reutilizables ─── */
function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-colors ${
            value === o.value ? 'bg-brand text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none py-1">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-brand w-4 h-4" />
      <span className="text-xs text-slate-700">{label}</span>
    </label>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-slate-500 w-14">{label}</span>
      <input type="range" min={0} max={6} value={value} onChange={e => onChange(Number(e.target.value))}
        className="flex-1 accent-brand" />
      <span className="text-[11px] font-mono text-slate-600 w-4 text-right">{value}</span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{children}</p>;
}

/* ─── Editor ─── */
export default function TicketEditor() {
  const { triggerToast } = useApp();
  const [config, setConfig] = useState<TicketConfig>(() => defaultConfig());
  const [side, setSide] = useState<Side>('cliente');
  const [paper, setPaper] = useState<PaperSize>('80mm');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Hidratar */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TICKETS_STORAGE_KEY);
      if (raw) setConfig(JSON.parse(raw));
    } catch {}
  }, []);

  const blocks = config[side];
  const selected = blocks.find(b => b.id === selectedId) ?? null;

  const setBlocks = (updater: (prev: TicketBlock[]) => TicketBlock[]) =>
    setConfig(c => ({ ...c, [side]: updater(c[side]) }));

  const updateBlock = (id: string, patch: Partial<TicketBlock>) =>
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)));

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateBlock = (id: string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const copy = { ...prev[idx], id: `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}` };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  };

  const addBlock = (type: BlockType) => {
    const block = makeBlock(type);
    setBlocks(prev => {
      const idx = selectedId ? prev.findIndex(b => b.id === selectedId) : -1;
      if (idx < 0) return [...prev, block];
      const next = [...prev];
      next.splice(idx + 1, 0, block);
      return next;
    });
    setSelectedId(block.id);
    setShowAdd(false);
  };

  /* Reordenar con arrastre */
  const handleReorder = (dropIdx: number) => {
    if (dragIndex === null || dragIndex === dropIdx) { setDragIndex(null); setOverIndex(null); return; }
    setBlocks(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIdx, 0, moved);
      return next;
    });
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(config));
      triggerToast('Diseño del ticket guardado.', 'success');
    } catch {
      triggerToast('No se pudo guardar el diseño.', 'error');
    }
  };

  const handleRestore = () => {
    const fresh = defaultConfig();
    setConfig(c => ({ ...c, [side]: fresh[side] }));
    setSelectedId(null);
    triggerToast(`Ticket de ${side} restaurado a los valores por defecto.`, 'info');
  };

  /** Imprime el ticket EXACTAMENTE como se ve en la vista previa (captura el DOM real). */
  const handlePrint = () => {
    const prevSelected = selectedId;
    setSelectedId(null); // oculta los marcos de selección en la impresión
    setTimeout(() => {
      const paperEl = document.getElementById('ticket-paper');
      if (!paperEl) {
        setSelectedId(prevSelected);
        triggerToast('No se pudo preparar la impresión.', 'error');
        return;
      }
      const clone = paperEl.cloneNode(true) as HTMLElement;
      clone.style.boxShadow = 'none';
      clone.style.margin = '0 auto';

      /* Los <canvas> (QR) no se clonan con su contenido → los convierto a imagen */
      const origCanvas = paperEl.querySelectorAll('canvas');
      const cloneCanvas = clone.querySelectorAll('canvas');
      cloneCanvas.forEach((c, i) => {
        const src = origCanvas[i];
        if (!src) return;
        const img = document.createElement('img');
        img.src = src.toDataURL('image/png');
        img.style.width = `${src.width}px`;
        img.style.height = `${src.height}px`;
        c.replaceWith(img);
      });

      /* Copio los estilos de la app para que las clases se rendericen igual */
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML).join('');

      const win = window.open('', '_blank', 'width=420,height=680');
      if (!win) {
        setSelectedId(prevSelected);
        triggerToast('Permite las ventanas emergentes para imprimir.', 'warning');
        return;
      }
      win.document.write(`<!DOCTYPE html><html><head><title>Ticket ${side}</title>${styles}
        <style>
          body{margin:0;padding:24px;background:#fff;display:flex;justify-content:center}
          @media print{body{padding:0}}
        </style></head>
        <body>${clone.outerHTML}
        <script>window.onload=function(){setTimeout(function(){window.print()},120)}<\/script>
        </body></html>`);
      win.document.close();
      setSelectedId(prevSelected);
    }, 60);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    const reader = new FileReader();
    reader.onload = () => updateBlock(selected.id, { imgSource: 'uploaded', imgUrl: String(reader.result) });
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] min-h-[560px] animate-section -m-6 lg:-m-8">
      {/* ── Cabecera oscura tipo "estudio de diseño" ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 px-6 py-4 flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white/90">
            <span className="bg-white/10 p-1.5 rounded-lg"><ReceiptText className="h-4 w-4" /></span>
            <h3 className="text-sm font-bold">Diseñador de Tickets</h3>
          </div>

          {/* Selector Cliente / Cocina */}
          <div className="flex bg-white/5 rounded-xl p-1 gap-1">
            <button
              onClick={() => { setSide('cliente'); setSelectedId(null); }}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors ${
                side === 'cliente' ? 'bg-emerald-500 text-white shadow-sm' : 'text-white/60 hover:text-white/90'
              }`}
            >
              <User className="h-3.5 w-3.5" /> Cliente
            </button>
            <button
              onClick={() => { setSide('cocina'); setSelectedId(null); }}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors ${
                side === 'cocina' ? 'bg-orange-500 text-white shadow-sm' : 'text-white/60 hover:text-white/90'
              }`}
            >
              <ChefHat className="h-3.5 w-3.5" /> Cocina
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => triggerToast('Conecta tu impresora térmica desde GoMenu Printer.', 'info')}
            title="GoMenu Printer"
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-colors">
            <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">GoMenu Printer</span>
          </button>
          <button onClick={handlePrint} title="Imprimir prueba"
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
            <Printer className="h-4 w-4" />
          </button>
          <button onClick={handlePrint} title="Vista de impresión"
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
            <FileText className="h-4 w-4" />
          </button>
          <button onClick={handleRestore} title="Restaurar diseño por defecto"
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button onClick={handleSave}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors ml-1">
            <Save className="h-3.5 w-3.5" /> Guardar
          </button>
        </div>
      </div>

      {/* ── 3 paneles ── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-px bg-slate-200">
        {/* Panel izquierdo: bloques */}
        <div className="bg-white flex flex-col min-h-0">
          <div className="p-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-1.5 mb-3 px-1 text-slate-700">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wide">Bloques</span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5 ml-auto">{blocks.length}</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowAdd(s => !s)}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 py-2.5 rounded-xl transition-colors"
              >
                <Plus className="h-4 w-4" /> Añadir bloque
              </button>
              {showAdd && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowAdd(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white rounded-xl border border-slate-200 shadow-dropdown py-1.5 max-h-72 overflow-y-auto">
                    {ADDABLE.map(type => {
                      const meta = BLOCK_META[type];
                      const Icon = meta.icon;
                      return (
                        <button key={type} onClick={() => addBlock(type)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors">
                          <span className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                            <Icon className="h-3.5 w-3.5 text-slate-500" />
                          </span>
                          <span className="text-xs font-medium text-slate-700">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {blocks.map((block, idx) => {
              const meta = BLOCK_META[block.type];
              const Icon = meta.icon;
              const isSel = block.id === selectedId;
              const isOver = overIndex === idx && dragIndex !== null && dragIndex !== idx;
              return (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={e => { e.preventDefault(); setOverIndex(idx); }}
                  onDrop={() => handleReorder(idx)}
                  onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                  onClick={() => setSelectedId(block.id)}
                  className={`group relative flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg cursor-pointer transition-all border-l-[3px] ${
                    isSel ? 'border-l-indigo-500 bg-indigo-50/70' : 'border-l-transparent hover:bg-slate-50'
                  } ${isOver ? 'shadow-[inset_0_2px_0_0_theme(colors.indigo.400)]' : ''} ${dragIndex === idx ? 'opacity-40' : ''} ${
                    !block.visible ? 'opacity-50' : ''
                  }`}
                >
                  <GripVertical className="h-3.5 w-3.5 text-slate-300 shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isSel ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold leading-tight truncate ${isSel ? 'text-indigo-900' : 'text-slate-700'}`}>{meta.label}</p>
                    <p className="text-[10px] text-slate-400 truncate">{meta.subtitle(block)}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); updateBlock(block.id, { visible: !block.visible }); }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                    title={block.visible ? 'Ocultar' : 'Mostrar'}
                  >
                    {block.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); removeBlock(block.id); }}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel central: vista previa (canvas punteado tipo herramienta de diseño) */}
        <div
          className="overflow-y-auto p-6 flex flex-col items-center bg-slate-50"
          style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        >
          <div className="w-full flex justify-end mb-3 max-w-[360px]">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              {(['80mm', '58mm'] as PaperSize[]).map(p => (
                <button key={p} onClick={() => setPaper(p)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors ${
                    paper === p ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <TicketPreview blocks={blocks} side={side} paper={paper} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        {/* Panel derecho: inspector */}
        <div className="bg-white overflow-y-auto">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-2">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-300">
                <SlidersHorizontal className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-600">Ningún bloque seleccionado</p>
              <p className="text-xs text-slate-400">Haz clic en un bloque de la lista o del ticket para personalizarlo.</p>
            </div>
          ) : (
            <Inspector
              block={selected}
              onChange={patch => updateBlock(selected.id, patch)}
              onMove={dir => moveBlock(selected.id, dir)}
              onDuplicate={() => duplicateBlock(selected.id)}
              onRemove={() => removeBlock(selected.id)}
              onUploadClick={() => fileRef.current?.click()}
            />
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
    </div>
  );
}

/* ─── Inspector por tipo de bloque ─── */
const ALIGN_OPTS = [
  { value: 'left' as Align, label: 'Izq.' },
  { value: 'center' as Align, label: 'Centro' },
  { value: 'right' as Align, label: 'Der.' },
];
const SIZE_OPTS = [
  { value: 'small' as FontSize, label: 'S' },
  { value: 'normal' as FontSize, label: 'M' },
  { value: 'large' as FontSize, label: 'L' },
  { value: 'xlarge' as FontSize, label: 'XL' },
];

function Inspector({ block, onChange, onMove, onDuplicate, onRemove, onUploadClick }: {
  block: TicketBlock;
  onChange: (patch: Partial<TicketBlock>) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onUploadClick: () => void;
}) {
  const meta = BLOCK_META[block.type];

  const textFormat = (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <FieldLabel>Alineación</FieldLabel>
        <Segmented options={ALIGN_OPTS} value={block.align ?? 'left'} onChange={v => onChange({ align: v })} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel>Tamaño de letra</FieldLabel>
        <Segmented options={SIZE_OPTS} value={block.size ?? 'normal'} onChange={v => onChange({ size: v })} />
      </div>
      <div className="flex gap-2">
        <button onClick={() => onChange({ bold: !block.bold })}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg border transition-colors ${
            block.bold ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}>
          <Bold className="h-3.5 w-3.5" /> Negrita
        </button>
        <button onClick={() => onChange({ upper: !block.upper })}
          className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-colors ${
            block.upper ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}>
          MAYÚS
        </button>
      </div>
    </div>
  );

  const Icon = meta.icon;

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-white" />
          </span>
          <h4 className="text-sm font-bold text-slate-800">{meta.label}</h4>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => onMove(-1)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Subir">
            <ChevronUp className="h-4 w-4" />
          </button>
          <button onClick={() => onMove(1)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Bajar">
            <ChevronDown className="h-4 w-4" />
          </button>
          <button onClick={onDuplicate} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" title="Duplicar">
            <Copy className="h-4 w-4" />
          </button>
          <button onClick={onRemove} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50" title="Eliminar">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-4">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={block.visible} onChange={e => onChange({ visible: e.target.checked })} className="accent-indigo-600 w-4 h-4" />
          <span className="text-xs font-medium text-slate-700">Visible</span>
        </label>
      </div>

      <div className="border-t border-slate-100 mx-4" />
      <div className="px-4 space-y-5 pb-4">

      {/* Controles por tipo */}
      {block.type === 'imagen' && (
        <div className="space-y-4">
          <Segmented
            options={[{ value: 'logo', label: 'Logo del negocio' }, { value: 'uploaded', label: 'Imagen subida' }]}
            value={block.imgSource ?? 'logo'}
            onChange={v => v === 'uploaded' ? onUploadClick() : onChange({ imgSource: 'logo' })}
          />
          {block.imgSource === 'uploaded' && (
            <button onClick={onUploadClick} className="w-full text-xs font-semibold text-brand bg-brand/10 hover:bg-brand/20 py-2 rounded-lg">
              Cambiar imagen…
            </button>
          )}
          <div className="space-y-1.5">
            <FieldLabel>Tamaño</FieldLabel>
            <Segmented
              options={[{ value: 'chico', label: 'Chico' }, { value: 'mediano', label: 'Mediano' }, { value: 'grande', label: 'Grande' }]}
              value={block.imgSize ?? 'mediano'}
              onChange={v => onChange({ imgSize: v })}
            />
          </div>
        </div>
      )}

      {block.type === 'negocio' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <FieldLabel>Nombre del negocio</FieldLabel>
            <CheckRow checked={block.showName ?? true} onChange={v => onChange({ showName: v })} label="Mostrar nombre" />
            <Segmented options={[{ value: 'false', label: 'Normal' }, { value: 'true', label: 'Compacta' }]}
              value={String(block.compactName ?? false)} onChange={v => onChange({ compactName: v === 'true' })} />
          </div>
          <div className="border-t border-slate-100" />
          <div className="space-y-1">
            <FieldLabel>Datos del local</FieldLabel>
            <CheckRow checked={block.showAddress ?? false} onChange={v => onChange({ showAddress: v })} label="Dirección" />
            <CheckRow checked={block.showPhone ?? false} onChange={v => onChange({ showPhone: v })} label="Teléfono" />
          </div>
        </div>
      )}

      {block.type === 'texto' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <FieldLabel>Contenido</FieldLabel>
            <textarea value={block.text ?? ''} onChange={e => onChange({ text: e.target.value })} rows={2}
              className="input w-full px-3 py-2 text-sm resize-none" placeholder="Escribe el texto…" />
          </div>
          {textFormat}
        </div>
      )}

      {block.type === 'separador' && (
        <div className="space-y-1.5">
          <FieldLabel>Estilo</FieldLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(SEP_LABEL) as SepStyle[]).map(s => (
              <button key={s} onClick={() => onChange({ sepStyle: s })}
                className={`text-xs font-semibold py-2 rounded-lg border transition-colors ${
                  (block.sepStyle ?? 'guiones') === s ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}>
                <span className="font-mono mr-1">{SEP_CHAR[s]}</span> {SEP_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {block.type === 'datos-pedido' && (
        <div className="space-y-1">
          <FieldLabel>Mostrar</FieldLabel>
          <CheckRow checked={block.showFecha ?? true} onChange={v => onChange({ showFecha: v })} label="Fecha" />
          <CheckRow checked={block.showHora ?? true} onChange={v => onChange({ showHora: v })} label="Hora" />
        </div>
      )}

      {block.type === 'numero-pedido' && textFormat}

      {block.type === 'cliente' && (
        <div className="space-y-1">
          <FieldLabel>Datos a mostrar</FieldLabel>
          <CheckRow checked={block.showClientName ?? true} onChange={v => onChange({ showClientName: v })} label="Nombre" />
          <CheckRow checked={block.showClientPhone ?? true} onChange={v => onChange({ showClientPhone: v })} label="Teléfono" />
          <CheckRow checked={block.showClientAddress ?? true} onChange={v => onChange({ showClientAddress: v })} label="Dirección" />
          <CheckRow checked={block.showDeliveryTime ?? true} onChange={v => onChange({ showDeliveryTime: v })} label="Hora de entrega" />
        </div>
      )}

      {block.type === 'productos' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <FieldLabel>Detalle</FieldLabel>
            <CheckRow checked={block.showModifiers ?? true} onChange={v => onChange({ showModifiers: v })} label="Mostrar modificadores" />
            <CheckRow checked={block.showPrices ?? true} onChange={v => onChange({ showPrices: v })} label="Mostrar precios" />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Tamaño de letra</FieldLabel>
            <Segmented options={SIZE_OPTS} value={block.size ?? 'normal'} onChange={v => onChange({ size: v })} />
          </div>
        </div>
      )}

      {block.type === 'totales' && (
        <div className="space-y-1">
          <FieldLabel>Mostrar</FieldLabel>
          <CheckRow checked={block.showSubtotal ?? true} onChange={v => onChange({ showSubtotal: v })} label="Subtotal" />
          <CheckRow checked={block.showEnvio ?? true} onChange={v => onChange({ showEnvio: v })} label="Envío" />
        </div>
      )}

      {block.type === 'pago' && textFormat}

      {block.type === 'qr' && (
        <p className="text-xs text-slate-500">El QR enlaza al seguimiento del pedido. Ajusta su posición con el espaciado.</p>
      )}

      <div className="border-t border-slate-100" />

      {/* Espaciado (común a todos) */}
      <div className="space-y-2">
        <FieldLabel>Espaciado (líneas en blanco)</FieldLabel>
        <Slider label="Superior" value={block.spaceTop} onChange={v => onChange({ spaceTop: v })} />
        <Slider label="Inferior" value={block.spaceBottom} onChange={v => onChange({ spaceBottom: v })} />
      </div>
      </div>
    </div>
  );
}
