'use client';

import { useEffect, useState } from 'react';
import {
  QrCode, Download, Printer, Globe, Copy, Check, ExternalLink, Share2, Link2,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useCarta } from '@/context/CartaContext';
import { useApp } from '@/context/AppContext';

export default function QrTab() {
  const { carta } = useCarta();
  const { triggerToast } = useApp();

  const [url, setUrl] = useState('/menu');
  const [copied, setCopied] = useState(false);
  const canvasId = 'qr-canvas-carta-tab';

  useEffect(() => { setUrl(`${window.location.origin}/menu`); }, []);

  /* Muestra la URL sin el protocolo, más limpia (como restuflu.gomenu.cl/menu) */
  const prettyUrl = url.replace(/^https?:\/\//, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      triggerToast('Enlace copiado al portapapeles.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      triggerToast('No se pudo copiar el enlace.', 'error');
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`¡Mira nuestro menú! 🍽️\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleDownload = () => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'QR-Menu-Digital.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    triggerToast('QR descargado como PNG.', 'success');
  };

  const handlePrint = () => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank', 'width=400,height=520');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html>
        <head><title>QR Menú Digital</title>
        <style>
          body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff}
          img{width:240px;height:240px}
          h2{font-size:20px;margin:14px 0 4px;color:#005e34;font-weight:800}
          p{font-size:12px;color:#888;margin:0}
          .url{font-size:9px;color:#bbb;margin-top:10px;word-break:break-all;max-width:240px;text-align:center}
        </style></head>
        <body>
          <img src="${dataUrl}" alt="QR Menú" />
          <h2>Menú Digital</h2>
          <p>Escanea para ver el menú</p>
          <div class="url">${url}</div>
          <script>window.onload=function(){window.print();window.close()}<\/script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Enlace del menú ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-brand" />
            <h4 className="text-base font-bold text-slate-800">Enlace de tu menú</h4>
          </div>
          <span className={`shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
            carta.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${carta.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {carta.active ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-5">Comparte este enlace para que tus clientes vean tu menú.</p>

        {/* Caja de la URL */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mb-3">
          <Globe className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-700 font-medium truncate flex-1">{prettyUrl}</span>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-hover transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-[#25D366] text-white hover:bg-[#1ebe5b] transition-colors"
          >
            <Share2 className="w-4 h-4" />
            WhatsApp
          </button>
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir mi menú en una nueva pestaña
          </a>
        </div>
      </div>

      {/* ── Código QR ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <QrCode className="w-5 h-5 text-brand" />
          <h4 className="text-base font-bold text-slate-800">Código QR de la Carta</h4>
        </div>
        <p className="text-xs text-slate-500 mb-5">Imprímelo y ponlo en las mesas — todos los clientes ven la misma carta.</p>

        <div className="flex flex-col items-center gap-4 flex-1">
          <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-inner">
            <QRCodeCanvas
              id={canvasId}
              value={url}
              size={180}
              bgColor="#ffffff"
              fgColor="#005e34"
              level="M"
              includeMargin={false}
            />
          </div>
          <p className="text-xs text-slate-500 text-center">Los clientes escanean este QR para ver el menú en su celular.</p>

          <div className="flex gap-2 w-full mt-auto">
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
      </div>
    </div>
  );
}
