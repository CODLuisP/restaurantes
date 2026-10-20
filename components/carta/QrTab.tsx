'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  QrCode, Download, Printer, Globe, Copy, Check, ExternalLink, Share2, Link2, Pencil, AlertTriangle,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useApp } from '@/context/AppContext';
import { useSucursalSelector } from '@/hooks/useSucursalSelector';
import { Alert, Select, Spinner } from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import { empresaParaActualizar, getMiEmpresa, updateEmpresa } from '@/lib/api/empresas';
import {
  SUBDOMINIO_MAX, sufijoDominio, sugerirSubdominio, urlMenuPublico, validarSubdominio,
} from '@/lib/menu/subdominio';

export default function QrTab() {
  const { data: session } = useSession();
  const { triggerToast, empresa, refreshNegocioConfig } = useApp();
  const token = session?.accessToken;
  const isSuperAdmin = session?.user?.role === 'superadmin';

  const { sucursales, sId, selectSucursal, sucursalesLoading: loading } = useSucursalSelector();
  const [origen, setOrigen] = useState('');
  const [copied, setCopied] = useState(false);
  const canvasId = 'qr-canvas-carta-tab';

  // Dirección propia de la carta (paikos.restofly.com.pe).
  const subdominio = empresa?.subdominio?.trim() || null;
  const [editandoSub, setEditandoSub] = useState(false);
  const [borradorSub, setBorradorSub] = useState('');
  const [guardandoSub, setGuardandoSub] = useState(false);
  const [backendSinSubdominio, setBackendSinSubdominio] = useState(false);

  useEffect(() => { setOrigen(window.location.origin); }, []);

  const dominio = origen ? sufijoDominio(origen) : null;
  const url = origen
    ? urlMenuPublico({ origen, subdominio, sucursalId: sId, variasSucursales: sucursales.length > 1 })
    : '';
  const errorSub = borradorSub ? validarSubdominio(borradorSub) : null;

  const empezarEdicionSub = () => {
    setBorradorSub(subdominio ?? sugerirSubdominio(empresa?.nombreComercial || empresa?.razonSocial || empresa?.nombre || ''));
    setEditandoSub(true);
  };

  const guardarSubdominio = async () => {
    const valor = borradorSub.trim();
    const motivo = validarSubdominio(valor);
    if (motivo) { triggerToast(motivo, 'warning'); return; }
    if (!token || !empresa) { triggerToast('Sesión expirada.', 'error'); return; }
    if (valor === subdominio) { setEditandoSub(false); return; }
    setGuardandoSub(true);
    try {
      await updateEmpresa(token, empresa.id, empresaParaActualizar(empresa, { subdominio: valor }));
      // Si el servidor aún no conoce el campo, responde bien pero no lo guarda: se comprueba releyendo.
      const guardada = await getMiEmpresa(token);
      if (guardada.subdominio !== valor) {
        setBackendSinSubdominio(true);
        triggerToast('El servidor todavía no guarda la dirección propia. Falta actualizar el backend.', 'warning');
        return;
      }
      await refreshNegocioConfig();
      setEditandoSub(false);
      triggerToast('Dirección guardada. Descarga e imprime de nuevo tu código QR.', 'success');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        triggerToast('Esa dirección ya la usa otro negocio. Elige otra.', 'warning');
      } else {
        console.error('[QR] No se pudo guardar el subdominio:', err);
        triggerToast(err instanceof Error && err.message ? err.message : 'No se pudo guardar la dirección.', 'error');
      }
    } finally {
      setGuardandoSub(false);
    }
  };

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
    if (!win) { triggerToast('El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes e inténtalo de nuevo.', 'warning'); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>QR Menú</title><style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff}img{width:240px;height:240px}h2{font-size:20px;margin:14px 0 4px;color:#005e34;font-weight:800}p{font-size:12px;color:#888;margin:0}.url{font-size:9px;color:#bbb;margin-top:10px;word-break:break-all;max-width:240px;text-align:center}</style></head><body><img src="${dataUrl}" alt="QR" /><h2>Menú Digital</h2><p>Escanea para ver el menú</p><div class="url">${url}</div><script>window.onload=function(){window.print();window.close()}<\/script></body></html>`);
    win.document.close();
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-semibold text-slate-600">Cargando código QR y enlace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isSuperAdmin && sucursales.length > 0 && (
        <div className="flex justify-end">
          <Select value={sId ?? ''} onChange={e => selectSucursal(Number(e.target.value))}>
            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Select>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-5 h-5 text-brand" />
          <h4 className="text-base font-bold text-slate-800">Dirección de tu carta</h4>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Elige cómo empieza el enlace de tu carta, con el nombre de tu negocio. Por ejemplo:{' '}
          <span className="font-semibold text-slate-700">paikos</span>{dominio?.sufijo ?? '.restofly.com.pe'}/menu
        </p>

        {!editandoSub ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
              {subdominio ? (
                <span className="text-sm text-slate-700 truncate">
                  {dominio?.protocolo ?? 'https:'}//<strong className="text-brand">{subdominio}</strong>{dominio?.sufijo ?? ''}/menu
                </span>
              ) : (
                <span className="text-sm text-slate-400">Todavía no elegiste una dirección propia</span>
              )}
            </div>
            <button
              onClick={empezarEdicionSub}
              disabled={!empresa}
              className="btn-secondary inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Pencil className="w-4 h-4" /> {subdominio ? 'Cambiar' : 'Elegir dirección'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div
              className={`flex items-center rounded-xl border bg-white overflow-hidden focus-within:ring-2 focus-within:ring-brand/15 ${
                errorSub ? 'border-rose-300' : 'border-slate-200 focus-within:border-brand'
              }`}
            >
              <span className="hidden sm:block pl-3 text-sm text-slate-400 select-none">{dominio?.protocolo ?? 'https:'}//</span>
              <input
                autoFocus
                value={borradorSub}
                onChange={e => setBorradorSub(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                onKeyDown={e => {
                  if (e.key === 'Enter') guardarSubdominio();
                  if (e.key === 'Escape') setEditandoSub(false);
                }}
                maxLength={SUBDOMINIO_MAX}
                placeholder="tunegocio"
                aria-label="Subdominio de tu carta"
                className="flex-1 min-w-0 pl-3 sm:pl-0.5 pr-1 py-2.5 text-sm font-semibold text-brand outline-none"
              />
              <span className="pr-3 text-sm text-slate-400 select-none whitespace-nowrap">{dominio?.sufijo ?? '.restofly.com.pe'}/menu</span>
            </div>
            <p className={`text-xs ${errorSub ? 'text-rose-600' : 'text-slate-500'}`}>
              {errorSub ?? 'Solo letras minúsculas, números y guiones. Debe ser única: si otro negocio ya la usa, te avisaremos.'}
            </p>
            {subdominio && borradorSub !== subdominio && (
              <p className="flex items-start gap-1.5 text-xs text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Si la cambias, los QR que ya imprimiste dejarán de funcionar y tendrás que imprimirlos de nuevo.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditandoSub(false)} disabled={guardandoSub} className="btn-secondary">Cancelar</button>
              <button
                onClick={guardarSubdominio}
                disabled={guardandoSub || !!errorSub || !borradorSub}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guardandoSub ? <Spinner size="sm" /> : <Check className="w-4 h-4" />} Guardar
              </button>
            </div>
          </div>
        )}

        {backendSinSubdominio && (
          <div className="mt-3">
            <Alert variant="warning">
              El servidor (RestaurantesAPI) todavía no guarda la dirección propia de la carta. Mientras tanto, tu QR
              sigue usando el enlace normal.
            </Alert>
          </div>
        )}
        {origen && !dominio && (
          <p className="mt-3 text-[11px] text-slate-400">
            El dominio principal del sistema aún no está configurado (NEXT_PUBLIC_DOMINIO_BASE): el QR usa el enlace normal.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="w-5 h-5 text-brand" />
            <h4 className="text-base font-bold text-slate-800">Enlace de tu menú</h4>
          </div>
          <p className="text-xs text-slate-500 mb-5">Un solo QR por sucursal. Todos los clientes ven el mismo menú.</p>

          {/localhost|127\.0\.0\.1/.test(url) && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
              Este enlace apunta a tu propio equipo (localhost) y los clientes no podrán abrirlo. El QR definitivo
              debe generarse entrando al sistema con su dirección web real.
            </p>
          )}
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

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <QrCode className="w-5 h-5 text-brand" />
            <h4 className="text-base font-bold text-slate-800">Código QR</h4>
          </div>
          <p className="text-xs text-slate-500 mb-5">Imprímelo y colócalo en las mesas o en la entrada del local.</p>

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
