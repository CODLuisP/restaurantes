'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Download, Printer, ImageOff, User, Phone } from 'lucide-react';
import { Modal, Input } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import type { QrPaymentMethod } from '@/lib/config/metodos';
import { resizeImageToBlob, subirImagenProducto, extractCloudflareImageId, eliminarImagenProductoCloudflare } from '@/lib/uploadImagen';

type Brand = 'yape' | 'plin';

const BRAND_META: Record<Brand, { label: string; wordmark: string }> = {
  yape: { label: 'Yape', wordmark: 'yape' },
  plin: { label: 'Plin', wordmark: 'plin' },
};

/* ── Canvas helpers ─────────────────────────────────────────── */

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawImageFit(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

function wrapCenteredText(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  const lines: string[] = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
  return lines.length;
}

/** Dibuja el cartel de cobro (Yape morado / Plin celeste) en un canvas 500×700. */
function drawPoster(
  canvas: HTMLCanvasElement,
  brand: Brand,
  data: {
    qrImg: HTMLImageElement | null;
    logoImg: HTMLImageElement | null;
    holderName: string;
    phone: string;
    businessName: string;
  }
) {
  const W = 500, H = 700;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const holder = data.holderName.trim() || 'Nombre del titular';
  const phone = data.phone.trim() || '999 999 999';
  const business = data.businessName.trim() || 'Nombre del negocio';

  if (brand === 'yape') {
    /* ── Fondo morado Yape sólido ── */
    ctx.fillStyle = '#7A1E8C';
    ctx.fillRect(0, 0, W, H);

    /* ── Logotipo de Yape ── */
    if (data.logoImg) {
      drawImageFit(ctx, data.logoImg, W / 2, 120, 140, 100);
    } else {
      // Burbuja yape fallback
      const bubbleY = 120;
      ctx.beginPath();
      ctx.ellipse(W / 2, bubbleY, 66, 34, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.fillStyle = '#7A1E8C';
      ctx.font = '700 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('yape', W / 2, bubbleY + 2);
    }

    /* ── Tarjeta blanca del QR ── */
    const qrBoxSize = 290;
    const qrBoxX = (W - qrBoxSize) / 2;
    const qrBoxY = 210;
    roundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Sombra sutil del cuadro del QR
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    roundedRect(ctx, qrBoxX - 2, qrBoxY + qrBoxSize, qrBoxSize + 4, 6, 3);
    ctx.fill();

    if (data.qrImg) {
      const pad = 20;
      ctx.drawImage(data.qrImg, qrBoxX + pad, qrBoxY + pad, qrBoxSize - pad * 2, qrBoxSize - pad * 2);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 17px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      wrapCenteredText(ctx, '"Pega aquí tu código QR"', W / 2, qrBoxY + qrBoxSize / 2, qrBoxSize - 40, 24);
    }

    /* ── Texto: Número de Celular (Primero) ── */
    ctx.font = '800 28px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const rawPhone = data.phone.trim();
    const phoneText = rawPhone ? rawPhone : 'NÚMERO DE CELULAR';
    ctx.fillText(phoneText, W / 2, 540);

    /* ── Texto: Nombre del Titular (Segundo) ── */
    ctx.font = '800 22px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const rawHolder = data.holderName.trim();
    const nameText = rawHolder ? rawHolder.toUpperCase() : 'NOMBRE DEL TITULAR';
    ctx.fillText(nameText, W / 2, 606);

  } else {
    /* ═══ PLIN ═══ */
    /* ── Fondo celeste/turquesa Plin sólido ── */
    ctx.fillStyle = '#00B4BB';
    ctx.fillRect(0, 0, W, H);

    /* ── Logotipo de Plin ── */
    if (data.logoImg) {
      drawImageFit(ctx, data.logoImg, W / 2, 120, 140, 100);
    } else {
      // Burbuja plin fallback
      const bubbleY = 120;
      ctx.beginPath();
      ctx.ellipse(W / 2, bubbleY, 66, 34, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.fillStyle = '#00B4BB';
      ctx.font = '700 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('plin', W / 2, bubbleY + 2);
    }

    /* ── Tarjeta blanca del QR ── */
    const qrBoxSize = 290;
    const qrBoxX = (W - qrBoxSize) / 2;
    const qrBoxY = 210;
    roundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Sombra sutil del cuadro del QR
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    roundedRect(ctx, qrBoxX - 2, qrBoxY + qrBoxSize, qrBoxSize + 4, 6, 3);
    ctx.fill();

    if (data.qrImg) {
      const pad = 20;
      ctx.drawImage(data.qrImg, qrBoxX + pad, qrBoxY + pad, qrBoxSize - pad * 2, qrBoxSize - pad * 2);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 17px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      wrapCenteredText(ctx, '"Pega aquí tu código QR"', W / 2, qrBoxY + qrBoxSize / 2, qrBoxSize - 40, 24);
    }

    /* ── Texto: Número de Celular (Primero) ── */
    ctx.font = '800 28px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const rawPhone = data.phone.trim();
    const phoneText = rawPhone ? rawPhone : 'NÚMERO DE CELULAR';
    ctx.fillText(phoneText, W / 2, 540);

    /* ── Texto: Nombre del Titular (Segundo) ── */
    ctx.font = '800 22px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const rawHolder = data.holderName.trim();
    const nameText = rawHolder ? rawHolder.toUpperCase() : 'NOMBRE DEL TITULAR';
    ctx.fillText(nameText, W / 2, 606);
  }
}

/* ── Componente ────────────────────────────────────────────── */

export default function QrPosterModal({ open, onClose, brand, bizName, config, onUpdateConfig }: { open: boolean; onClose: () => void; brand: Brand; bizName: string; config: QrPaymentMethod; onUpdateConfig: (changes: Partial<QrPaymentMethod>) => void }) {
  const { triggerToast } = useApp();

  const fileRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(false);
  const [form, setForm] = useState({ qrImage: '', holderName: '', phone: '' });

  useEffect(() => {
    if (open) setForm({ qrImage: config.qrImage, holderName: config.holderName, phone: config.phone });
  }, [open, config.qrImage, config.holderName, config.phone]);

  const handleSave = () => {
    onUpdateConfig(form);
    triggerToast('Cartel de cobro guardado.', 'success');
    onClose();
  };

  const meta = BRAND_META[brand];
  const brandTheme = brand === 'yape'
    ? { ring: 'ring-violet-200', badge: 'bg-violet-600', text: 'text-violet-700' }
    : { ring: 'ring-teal-200', badge: 'bg-teal-500', text: 'text-teal-700' };

  const posterData = {
    qrImg: null as HTMLImageElement | null,
    holderName: form.holderName,
    phone: form.phone,
    businessName: bizName,
  };

  /* Redibuja la vista previa cada vez que cambian los datos */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const render = async () => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      setRendering(true);

      const logoUrl = brand === 'yape' ? '/pagos/yape.png' : '/pagos/plin.png';
      const [qrImg, logoImg] = await Promise.all([
        form.qrImage ? loadImage(form.qrImage).catch(() => null) : Promise.resolve(null),
        loadImage(logoUrl).catch(() => null),
      ]);

      if (cancelled) return;
      drawPoster(canvas, brand, { ...posterData, qrImg, logoImg });
      setRendering(false);
    };
    render();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, brand, form.qrImage, form.holderName, form.phone, bizName]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const resized = await resizeImageToBlob(file, 900, 900, 0.95);
      const subida = await subirImagenProducto(resized);
      const anteriorId = form.qrImage ? extractCloudflareImageId(form.qrImage) : null;
      if (anteriorId) eliminarImagenProductoCloudflare(anteriorId);
      setForm(f => ({ ...f, qrImage: subida.url }));
    } catch {
      triggerToast('Error al subir el QR.', 'error');
    }
  };

  const buildExportCanvas = async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    const logoUrl = brand === 'yape' ? '/pagos/yape.png' : '/pagos/plin.png';
    const [qrImg, logoImg] = await Promise.all([
      form.qrImage ? loadImage(form.qrImage).catch(() => null) : Promise.resolve(null),
      loadImage(logoUrl).catch(() => null),
    ]);
    drawPoster(canvas, brand, { ...posterData, qrImg, logoImg });
    return canvas;
  };

  const handleDownload = async () => {
    const canvas = await buildExportCanvas();
    const link = document.createElement('a');
    link.download = `Cartel-${meta.label}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    triggerToast(`Cartel de ${meta.label} descargado.`, 'success');
  };

  const handlePrint = async () => {
    const canvas = await buildExportCanvas();
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank', 'width=460,height=680');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html>
        <head><title>Cartel ${meta.label}</title>
        <style>
          body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f1f5f9}
          img{width:340px;height:476px;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,.15)}
        </style></head>
        <body>
          <img src="${dataUrl}" alt="Cartel ${meta.label}" />
          <script>window.onload=function(){window.print();window.close()}<\/script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Cartel de cobro — ${meta.label}`}
      subtitle="Carga tu QR real y personaliza los datos que se muestran."
      size="lg"
      fullHeight={false}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Formulario ── */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Código QR de {meta.label}
            </label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group/qr relative w-full aspect-square max-w-[180px] rounded-xl overflow-hidden border-2 border-dashed border-slate-200 hover:border-brand bg-slate-50 flex items-center justify-center transition-colors"
            >
              {form.qrImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.qrImage} alt={`QR de ${meta.label}`} className="h-full w-full object-contain p-2" />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-slate-400">
                  <ImageOff className="h-6 w-6" />
                  <span className="text-[11px] font-medium px-2 text-center">Sube tu QR real</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-[11px] font-semibold">
                <Upload className="h-3.5 w-3.5" /> {form.qrImage ? 'Cambiar' : 'Subir'}
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <p className="text-[10px] text-slate-400 mt-1.5">Descárgalo desde tu app de {meta.label} (Mi QR → Descargar) y súbelo aquí.</p>
          </div>

          <Input
            label="Nombre del titular"
            value={form.holderName}
            onChange={e => setForm(f => ({ ...f, holderName: e.target.value }))}
            placeholder="Ej: Romelia Mendoza"
            iconLeft={<User className="h-3.5 w-3.5" />}
          />
          <Input
            label="Celular asociado"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/[^\d ]/g, '').slice(0, 11) }))}
            placeholder="950 830 342"
            inputMode="numeric"
            iconLeft={<Phone className="h-3.5 w-3.5" />}
          />
        </div>

        {/* ── Vista previa del cartel ── */}
        <div className="flex flex-col items-center gap-3">
          <label className="self-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vista previa</label>
          <div className={`w-full max-w-[300px] aspect-[5/7] rounded-2xl overflow-hidden shadow-lg ring-1 ${brandTheme.ring} bg-slate-100 relative`}>
            <canvas ref={previewCanvasRef} className="w-full h-full" />
            {rendering && (
              <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
                <span className="text-[10px] text-slate-400">Generando…</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 w-full max-w-[300px]">
            <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-brand text-white hover:bg-brand-hover transition-colors">
              Guardar
            </button>
          </div>
          <div className="flex gap-2 w-full max-w-[300px]">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-brand text-white hover:bg-brand-hover transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> PNG
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
