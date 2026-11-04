'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Printer, FileText, RotateCcw, Save,
  ReceiptText, Receipt, ScrollText, ChefHat, SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { updateTicketsConfig } from '@/lib/api/ticketsConfig';
import { resizeImageToBlob, subirImagenProducto } from '@/lib/uploadImagen';
import TicketPreview from './TicketPreview';
import BlockListPanel from './BlockListPanel';
import Inspector from './Inspector';
import {
  type Side, type PaperSize, type BlockType, type TicketBlock, type TicketConfig,
  makeBlock, defaultConfig, parseComprobanteTemplates, serializeComprobanteTemplates, DOC_META,
} from './ticketData';

/* Pestañas del editor: los tres comprobantes que se imprimen al cobrar + la comanda de cocina. */
const TABS: { side: Side; label: string; icon: typeof Receipt; active: string }[] = [
  { side: 'boleta',    label: 'Boleta',        icon: Receipt,    active: 'bg-emerald-500' },
  { side: 'factura',   label: 'Factura',       icon: FileText,   active: 'bg-sky-500' },
  { side: 'notaVenta', label: 'Nota de venta', icon: ScrollText, active: 'bg-violet-500' },
  { side: 'cocina',    label: 'Cocina',        icon: ChefHat,    active: 'bg-orange-500' },
];

/* ─── Editor ─── */
export default function TicketEditor() {
  const { data: session } = useSession();
  const { triggerToast, ticketsConfig, negocioConfigErrores, refreshNegocioConfig, negocioTicket } = useApp();
  const token = session?.accessToken;
  const [config, setConfig] = useState<TicketConfig>(() => defaultConfig());
  const [side, setSide] = useState<Side>('boleta');
  const [paper, setPaper] = useState<PaperSize>('80mm');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Hidratar una sola vez desde el diseño ya cargado en AppContext (los refrescos posteriores
     no pisan lo que se está editando). */
  const hidratado = useRef(false);
  useEffect(() => {
    if (!ticketsConfig || hidratado.current) return;
    hidratado.current = true;
    const data = ticketsConfig;
    /* Plantillas guardadas antes del cambio de marca traían "Generado con GoMenu". */
    const migrar = (blocks: TicketBlock[]) =>
      blocks.map(b => (b.type === 'texto' && /gomenu/i.test(b.text ?? '') ? { ...b, text: 'Generado con RestoFly' } : b));
    const comprobantes = parseComprobanteTemplates(data.clienteJson);
    setConfig(prev => ({
      boleta: migrar(comprobantes.boleta),
      factura: migrar(comprobantes.factura),
      notaVenta: migrar(comprobantes.notaVenta),
      cocina: data.cocinaJson ? migrar(JSON.parse(data.cocinaJson)) : prev.cocina,
    }));
    if (data.paperSize === '58mm' || data.paperSize === '80mm') setPaper(data.paperSize);
  }, [ticketsConfig]);

  useEffect(() => {
    if (negocioConfigErrores.ticketsConfig) triggerToast('Error al cargar el diseño de tickets.', 'error');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocioConfigErrores.ticketsConfig]);

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

  const handleSave = async () => {
    if (!token) { triggerToast('Sesión expirada.', 'error'); return; }
    setSaving(true);
    try {
      await updateTicketsConfig(token, {
        clienteJson: serializeComprobanteTemplates(config),
        cocinaJson: JSON.stringify(config.cocina),
        paperSize: paper,
      });
      triggerToast('Diseño de los tickets guardado.', 'success');
      refreshNegocioConfig(); // comandas y comprobantes se imprimen con las plantillas del contexto
    } catch {
      triggerToast('No se pudo guardar el diseño.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = () => {
    const fresh = defaultConfig();
    setConfig(c => ({ ...c, [side]: fresh[side] }));
    setSelectedId(null);
    const nombre = side === 'cocina' ? 'Ticket de cocina' : DOC_META[side].label;
    triggerToast(`${nombre} restaurado a los valores por defecto.`, 'info');
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

      /* Sin tamaño de página fijo: se usa el papel de la impresora térmica y el ticket arranca
         arriba (un alto fijo más corto que ese papel hacía que Chrome lo centrara, con blanco arriba
         y abajo). Las cajas de margen vacías evitan el encabezado/pie de Chrome (lib/print/thermal.ts). */

      const win = window.open('', '_blank', 'width=420,height=680');
      if (!win) {
        setSelectedId(prevSelected);
        triggerToast('Permite las ventanas emergentes para imprimir.', 'warning');
        return;
      }
      win.document.write(`<!DOCTYPE html><html><head><title>Ticket ${side}</title>${styles}
        <style>
          @page{margin:4mm 0}
          @page{@top-left{content:""}@top-center{content:""}@top-right{content:""}@bottom-left{content:""}@bottom-center{content:""}@bottom-right{content:""}}
          body{margin:0;padding:24px;background:#fff;display:flex;justify-content:center}
          @media print{body{padding:0;display:block}}
        </style></head>
        <body>${clone.outerHTML}
        <script>window.onload=function(){setTimeout(function(){
          window.print()
        },120)}<\/script>
        </body></html>`);
      win.document.close();
      setSelectedId(prevSelected);
    }, 60);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file || !selected) return;
    try {
      const resized = await resizeImageToBlob(file, 600, 600, 0.9);
      const subida = await subirImagenProducto(resized);
      updateBlock(selected.id, { imgSource: 'uploaded', imgUrl: subida.url });
    } catch {
      triggerToast('Error al subir la imagen.', 'error');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] min-h-[560px] animate-section ">
      {/* ── Cabecera oscura tipo "estudio de diseño" ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 px-6 min-h-16 py-2 flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white/90">
            <span className="bg-white/10 p-1.5 rounded-lg flex items-center justify-center">
              <ReceiptText className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold leading-none">Diseñador de Tickets</h3>
          </div>

          {/* Selector Boleta / Factura / Nota de venta / Cocina */}
          <div className="flex bg-white/5 rounded-xl p-1 gap-1 flex-wrap">
            {TABS.map(({ side: s, label, icon: Icon, active }) => (
              <button
                key={s}
                onClick={() => { setSide(s); setSelectedId(null); }}
                className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg leading-none transition-colors ${
                  side === s ? `${active} text-white shadow-sm` : 'text-white/60 hover:text-white/90'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={handlePrint} title="Imprimir prueba"
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center">
            <Printer className="h-4 w-4" />
          </button>
          <button onClick={handlePrint} title="Vista de impresión"
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center">
            <FileText className="h-4 w-4" />
          </button>
          <button onClick={handleRestore} title="Restaurar diseño por defecto"
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 px-4 py-2 rounded-lg leading-none transition-colors ml-1 disabled:opacity-60">
            <Save className="h-3.5 w-3.5" /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* ── 3 paneles ── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-px bg-slate-200">
        <BlockListPanel
          blocks={blocks}
          selectedId={selectedId}
          onSelect={setSelectedId}
          showAdd={showAdd}
          onToggleAdd={setShowAdd}
          onAddBlock={addBlock}
          onToggleVisible={id => updateBlock(id, { visible: !blocks.find(b => b.id === id)?.visible })}
          onRemove={removeBlock}
          dragIndex={dragIndex}
          overIndex={overIndex}
          onDragStart={setDragIndex}
          onDragOver={setOverIndex}
          onDrop={handleReorder}
          onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
        />

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
          <TicketPreview
            blocks={blocks} side={side} paper={paper} selectedId={selectedId} onSelect={setSelectedId}
            negocio={{ name: negocioTicket.businessName, address: negocioTicket.direccion, ruc: negocioTicket.ruc, logoUrl: negocioTicket.logoUrl }}
          />
        </div>

        {/* Panel derecho: inspector */}
        <div className="bg-white overflow-y-auto">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-2">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-300">
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
