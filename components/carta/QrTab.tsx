'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  QrCode, Download, Printer, Globe, Copy, Check, ExternalLink, Share2, Link2,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useApp } from '@/context/AppContext';
import { getSucursales } from '@/lib/api/sucursales';
import { Select } from '@/components/ui';

export default function QrTab() {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const token = session?.accessToken;
  const isSuperAdmin = session?.user?.role === 'superadmin';

  const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([]);
  const [sId, setSId] = useState<number | null>(null);
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const canvasId = 'qr-canvas-carta-tab';

  useEffect(() => {
    if (!token) return;
    getSucursales(token).then(lista => {
      const activas = lista.filter(s => s.activo);
      setSucursales(activas.map(s => ({ id: s.id, nombre: s.nombre })));
      const id = session?.user?.sucursalId ?? activas[0]?.id;
      if (id) setSId(id);
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    const base = `${window.location.origin}/menu`;
    setUrl(sId ? `${base}?sucursalId=${sId}` : base);
  }, [sId]);

  const prettyUrl = url.replace(/^https?:\/\//, '');

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); triggerToast('Enlace copiado.', 'success'); setTimeout(() => setCopied(false), 2000); }
    catch { triggerToast('No se pudo copiar.', 'error'); }
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent('¡Mira nuestro menú! 🍽️\n' + url)}`, '_blank');
  };

  const handleDownload = () => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'QR-Menu-Digital.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    triggerToast('QR descargado.', 'success');
  };

  const handlePrint = () => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank', 'width=400,height=520');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>QR Menú</title><style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff}img{width:240px;height:240px}h2{font-size:20px;margin:14px 0 4px;color:#005e34;font-weight:800}p{font-size:12px;color:#888;margin:0}.url{font-size:9px;color:#bbb;margin-top:10px;word-break:break-all;max-width:240px;text-align:center}</style></head><body><img src="${dataUrl}" alt="QR" /><h2>Menú Digital</h2><p>Escanea para ver el menú</p><div class="url">${url}</div><script>window.onload=function(){window.print();window.close()}<\/script></body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-5">
      {isSuperAdmin && sucursales.length > 0 && (
        <div className="flex justify-end">
          <Select value={sId ?? ''} onChange={e => setSId(Number(e.target.value))}>
            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="w-5 h-5 text-brand" />
            <h4 className="text-base font-bold text-slate-800">Enlace de tu menú</h4>
          </div>
          <p className="text-xs text-slate-500 mb-5">Un solo QR por sucursal. Todos los clientes ven el mismo menú.</p>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mb-3">
            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm text-slate-700 font-medium truncate flex-1">{prettyUrl}</span>
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-hover transition-colors">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? 'Copiado' : 'Copiar'}
            </button>
            <button onClick={handleWhatsApp} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-[#25D366] text-white hover:bg-[#1ebe5b] transition-colors">
              <Share2 className="w-4 h-4" /> WhatsApp
            </button>
          </div>

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline">
              <ExternalLink className="w-3.5 h-3.5" /> Abrir menú
            </a>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <QrCode className="w-5 h-5 text-brand" />
            <h4 className="text-base font-bold text-slate-800">Código QR</h4>
          </div>
          <p className="text-xs text-slate-500 mb-5">Imprimilo y ponelo en las mesas o en la entrada del local.</p>

          <div className="flex flex-col items-center gap-4 flex-1">
            <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-inner">
              <QRCodeCanvas id={canvasId} value={url || ' '} size={180} bgColor="#ffffff" fgColor="#005e34" level="M" includeMargin={false} />
            </div>

            <div className="flex gap-2 w-full mt-auto">
              <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-hover transition-colors">
                <Download className="w-4 h-4" /> Descargar PNG
              </button>
              <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
