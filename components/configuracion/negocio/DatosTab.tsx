'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { ImagePlus, Pencil, Printer, Search, Loader2 } from 'lucide-react';
import { Input, Toggle, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getMiEmpresa, updateEmpresa, type EmpresaDto } from '@/lib/api/empresas';
import { resizeImageToBlob, subirImagenProducto, extractCloudflareImageId, eliminarImagenProductoCloudflare } from '@/lib/uploadImagen';
import LogoCropModal from './LogoCropModal';

type PaperSize = '58mm' | '80mm';
const PAPER_SIZES: { id: PaperSize; label: string }[] = [
  { id: '58mm', label: '58 mm' }, { id: '80mm', label: '80 mm' },
];

function SectionHeader({ icon, title, description, noBorder }: { icon?: React.ReactNode; title: string; description?: string; noBorder?: boolean }) {
  return <div className={noBorder ? '' : 'pt-2 border-t border-slate-100'}><p className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">{icon}{title}</p>{description && <p className="text-[11px] text-slate-500 mt-1">{description}</p>}</div>;
}

export default function DatosTab() {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const token = session?.accessToken;
  const [empresa, setEmpresa] = useState<EmpresaDto | null>(null);
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [direccion, setDireccion] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [provincia, setProvincia] = useState('');
  const [distrito, setDistrito] = useState('');
  const [condicion, setCondicion] = useState('');
  const [logoComprobante, setLogoComprobante] = useState('');
  const [paperSize, setPaperSize] = useState<PaperSize>('80mm');
  const [autoAceptar, setAutoAceptar] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoSource, setLogoSource] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    getMiEmpresa(token).then(e => {
      setEmpresa(e); setRuc(e.ruc); setRazonSocial(e.razonSocial); setNombreComercial(e.nombreComercial);
      setDireccion(e.direccion || ''); setDepartamento(e.departamento); setProvincia(e.provincia); setDistrito(e.distrito);
      setCondicion(e.condicion || ''); setLogoComprobante(e.logoComprobante || '');
      setPaperSize((e.paperSize as PaperSize) || '80mm'); setAutoAceptar(e.autoAceptarPedidos);
    }).catch(() => triggerToast('Error al cargar datos de la empresa.', 'error'));
  }, [token]);

  const handleConsultarRuc = async () => {
    if (ruc.length !== 11) { triggerToast('Ingresa un RUC de 11 dígitos.', 'warning'); return; }
    setConsultando(true);
    try {
      const res = await fetch('/api/consultar-ruc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ruc }) });
      const data = await res.json();
      if (!data.success) { triggerToast(data.error || 'RUC no encontrado.', 'error'); return; }
      const d = data.data;
      setRazonSocial(d.nombre_o_razon_social || ''); setDireccion(d.direccion || '');
      setDepartamento(d.departamento || ''); setProvincia(d.provincia || ''); setDistrito(d.distrito || '');
      setCondicion(d.condicion || ''); triggerToast('Datos del RUC cargados.', 'success');
    } catch { triggerToast('Error al consultar RUC.', 'error'); }
    finally { setConsultando(false); }
  };

  const handleSave = async () => {
    if (!token) { triggerToast('Sesión expirada.', 'error'); return; }
    if (!empresa) { triggerToast('Cargando datos...', 'warning'); return; }
    setSaving(true);
    try {
      await updateEmpresa(token, empresa.id, {
        nombre: nombreComercial || razonSocial || empresa.nombre, ruc,
        direccion: direccion || null, logoUrl: empresa.logoUrl, activo: empresa.activo,
        razonSocial: razonSocial || null, nombreComercial: nombreComercial || null,
        departamento: departamento || null, provincia: provincia || null, distrito: distrito || null,
        direccionCompleta: null, condicion: condicion || null, estadoContribuyente: null,
        logoComprobante: logoComprobante || null,
        paperSize, autoAceptarPedidos: autoAceptar,
      });
      triggerToast('Datos guardados.', 'success');
    } catch { triggerToast('Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setLogoSource(URL.createObjectURL(file)); setCropOpen(true); e.target.value = ''; };
  const handleCropApply = async (dataUrl: string) => {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const resized = await resizeImageToBlob(new File([blob], 'logo.jpg', { type: 'image/jpeg' }), 400, 400, 0.8);
      const subida = await subirImagenProducto(resized);
      if (logoComprobante) { const id = extractCloudflareImageId(logoComprobante); if (id) eliminarImagenProductoCloudflare(id); }
      setLogoComprobante(subida.url); triggerToast('Logo actualizado.', 'success');
    } catch { triggerToast('Error al subir el logo.', 'error'); }
    setCropOpen(false);
  };

  return (
    <div className="space-y-2">
      <SectionHeader icon={<ImagePlus className="h-3.5 w-3.5 text-slate-400" />} title="Logo para comprobantes" description="PNG cuadrado, se imprimirá en boletas y facturas." noBorder />
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => logoInputRef.current?.click()} className="group/logo relative h-20 w-20 shrink-0 rounded-xl overflow-hidden border-2 border-dashed border-slate-200 hover:border-brand bg-slate-50 flex items-center justify-center transition-colors">
          {logoComprobante ? <img src={logoComprobante} alt="Logo" className="h-full w-full object-contain p-1.5 rounded-lg" referrerPolicy="no-referrer" /> : <ImagePlus className="h-5 w-5 text-slate-300" />}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center transition-opacity rounded-lg"><Pencil className="h-4 w-4 text-white" /></div>
        </button>
        <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
      </div>
      <SectionHeader icon={<Search className="h-3.5 w-3.5 text-slate-400" />} title="Datos fiscales" description="Obtenidos de SUNAT vía RUC." />
      <div className="flex gap-2 items-end">
        <div className="flex-1"><Input label="RUC" value={ruc} onChange={e => setRuc(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="20512528458" /></div>
        <Button onClick={handleConsultarRuc} disabled={consultando || ruc.length !== 11} className="shrink-0">{consultando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Consultar</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Razón social" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} placeholder="SHALOM EMPRESARIAL S.A.C." />
        <Input label="Nombre comercial" value={nombreComercial} onChange={e => setNombreComercial(e.target.value)} placeholder="RestoPro" />
        <Input label="Condición" value={condicion} onChange={e => setCondicion(e.target.value)} disabled />
        <Input label="Departamento" value={departamento} onChange={e => setDepartamento(e.target.value)} />
        <Input label="Provincia" value={provincia} onChange={e => setProvincia(e.target.value)} />
        <Input label="Distrito" value={distrito} onChange={e => setDistrito(e.target.value)} />
      </div>
      <Input label="Dirección fiscal" value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="AV. MEXICO NRO. 1187 URB. MATUTE" />
      <SectionHeader icon={<Printer className="h-3.5 w-3.5 text-slate-400" />} title="Impresión" />
      <div className="flex gap-2">{PAPER_SIZES.map(s => <button key={s.id} type="button" onClick={() => setPaperSize(s.id)} className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${paperSize === s.id ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{s.label}</button>)}</div>
      <SectionHeader title="Pedidos" />
      <div className="flex items-center justify-between py-1"><span className="text-sm text-slate-700">Auto-aceptar pedidos</span><Toggle checked={autoAceptar} onChange={setAutoAceptar} /></div>
      <div className="flex justify-end pt-4"><Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button></div>
      <LogoCropModal open={cropOpen} onClose={() => setCropOpen(false)} source={logoSource} onApply={handleCropApply} />
    </div>
  );
}
