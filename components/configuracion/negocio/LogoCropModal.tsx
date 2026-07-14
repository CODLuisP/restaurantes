'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Grid2x2, RectangleHorizontal, Smartphone, X } from 'lucide-react';
import { Modal, Button } from '@/components/ui';

const FORMATS = {
  cuadrado:    { label: 'Cuadrado',    icon: Grid2x2,             ratio: 1,   outW: 400, outH: 400 },
  rectangular: { label: 'Rectangular', icon: RectangleHorizontal, ratio: 2,   outW: 480, outH: 240 },
  vertical:    { label: 'Vertical',    icon: Smartphone,          ratio: 0.5, outW: 240, outH: 480 },
} as const;
type FormatId = keyof typeof FORMATS;

const BOX_W = 600;
const BOX_H = 340;
const BOX_PAD = 24;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** Calcula el tamaño del marco de recorte que mejor cabe en el lienzo, para una relación de aspecto dada. */
function fitFrame(ratio: number) {
  const maxW = BOX_W - BOX_PAD * 2;
  const maxH = BOX_H - BOX_PAD * 2;
  let w = maxW, h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  return { w, h };
}

interface LogoCropModalProps {
  open: boolean;
  /** Object URL / data URL de la imagen recién seleccionada por el usuario. */
  source: string | null;
  onClose: () => void;
  onApply: (dataUrl: string) => void;
}

export default function LogoCropModal({ open, source, onClose, onApply }: LogoCropModalProps) {
  const [format, setFormat] = useState<FormatId>('cuadrado');
  const [zoom, setZoom] = useState(100);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origin: { x: number; y: number } } | null>(null);

  /* Reinicia el estado del recorte cada vez que se abre con una imagen nueva */
  useEffect(() => {
    if (!open) return;
    setFormat('cuadrado');
    setZoom(100);
    setOffset({ x: 0, y: 0 });
    setNatural(null);
  }, [open, source]);

  const frame = fitFrame(FORMATS[format].ratio);
  const baseScale = natural ? Math.max(frame.w / natural.w, frame.h / natural.h) : 1;
  const scale = baseScale * (zoom / 100);
  const displayW = natural ? natural.w * scale : 0;
  const displayH = natural ? natural.h * scale : 0;

  const maxOffsetX = Math.max(0, (displayW - frame.w) / 2);
  const maxOffsetY = Math.max(0, (displayH - frame.h) / 2);

  /* Si cambia el zoom o el formato, re-acota el desplazamiento para que no queden huecos */
  useEffect(() => {
    setOffset(o => ({ x: clamp(o.x, -maxOffsetX, maxOffsetX), y: clamp(o.y, -maxOffsetY, maxOffsetY) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, format, natural]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!natural) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: offset };
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({
      x: clamp(dragRef.current.origin.x + dx, -maxOffsetX, maxOffsetX),
      y: clamp(dragRef.current.origin.y + dy, -maxOffsetY, maxOffsetY),
    });
  };
  const handlePointerUp = () => { dragRef.current = null; };

  const frameLeft = (BOX_W - frame.w) / 2;
  const frameTop = (BOX_H - frame.h) / 2;

  const handleApply = () => {
    if (!natural || !imgRef.current) return;
    const { outW, outH } = FORMATS[format];
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgLeft = BOX_W / 2 + offset.x - displayW / 2;
    const imgTop = BOX_H / 2 + offset.y - displayH / 2;
    const invScale = 1 / scale;
    const cropW = frame.w * invScale;
    const cropH = frame.h * invScale;
    const sx = clamp((frameLeft - imgLeft) * invScale, 0, Math.max(0, natural.w - cropW));
    const sy = clamp((frameTop - imgTop) * invScale, 0, Math.max(0, natural.h - cropH));

    ctx.drawImage(imgRef.current, sx, sy, cropW, cropH, 0, 0, outW, outH);
    onApply(canvas.toDataURL('image/png'));
  };

  const activeFormat = FORMATS[format];

  return (
    <Modal open={open} onClose={onClose} title="Ajustar Logo" size="lg" fullHeight={false}>
      <div className="space-y-5">
        {/* Lienzo de recorte */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative mx-auto overflow-hidden rounded-xl bg-slate-950 select-none"
          style={{ width: BOX_W, height: BOX_H, maxWidth: '100%', touchAction: 'none', cursor: natural ? 'grab' : 'default' }}
        >
          {source && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={source}
              alt="Logo a recortar"
              draggable={false}
              onLoad={e => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: displayW || undefined,
                height: displayH || undefined,
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Máscara oscura fuera del marco */}
          <div className="absolute inset-x-0 top-0 bg-black/60 pointer-events-none" style={{ height: frameTop }} />
          <div className="absolute inset-x-0 bottom-0 bg-black/60 pointer-events-none" style={{ height: BOX_H - frameTop - frame.h }} />
          <div className="absolute left-0 bg-black/60 pointer-events-none" style={{ top: frameTop, height: frame.h, width: frameLeft }} />
          <div className="absolute right-0 bg-black/60 pointer-events-none" style={{ top: frameTop, height: frame.h, width: BOX_W - frameLeft - frame.w }} />

          {/* Marco + grilla 3×3 */}
          <div
            className="absolute border-2 border-white/90 pointer-events-none"
            style={{ left: frameLeft, top: frameTop, width: frame.w, height: frame.h }}
          >
            <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/40" />
            <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/40" />
            <div className="absolute left-0 right-0 top-1/3 h-px bg-white/40" />
            <div className="absolute left-0 right-0 top-2/3 h-px bg-white/40" />
          </div>
        </div>

        {/* Tipo de formato */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de formato</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(FORMATS) as [FormatId, typeof FORMATS[FormatId]][]).map(([id, f]) => {
              const Icon = f.icon;
              const active = format === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFormat(id)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-colors ${
                    active ? 'border-brand bg-brand/5 text-brand' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Zoom */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Zoom</label>
            <span className="text-[11px] font-mono font-semibold text-slate-600">{zoom}%</span>
          </div>
          <input
            type="range"
            min={100}
            max={250}
            step={5}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            disabled={!natural}
            className="w-full accent-brand"
          />
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" icon={<X className="h-3.5 w-3.5" />} onClick={onClose} className="flex-1 justify-center">
            Cancelar
          </Button>
          <Button icon={<Check className="h-3.5 w-3.5" />} onClick={handleApply} disabled={!natural} className="flex-1 justify-center">
            Aplicar Recorte
          </Button>
        </div>

        <p className="text-[11px] text-slate-400 text-center">
          El logo se redimensionará automáticamente a {activeFormat.outW}×{activeFormat.outH}px para mantener la consistencia.
        </p>
      </div>
    </Modal>
  );
}
