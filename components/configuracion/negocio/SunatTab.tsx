'use client';

import { useRef, useState, useEffect } from 'react';
import { Eye, EyeOff, FileCheck2, KeyRound, Percent, Receipt, ShieldCheck, Upload, X, CheckCircle2, Trash2 } from 'lucide-react';
import { Input, Button, Modal, Spinner, SucursalSelector } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useSucursalSelector } from '@/hooks/useSucursalSelector';
import { getMiEmpresa, updateEmpresa, type EmpresaDto } from '@/lib/api/empresas';
import { getConfiguracion, updateConfiguracion } from '@/lib/api/configuracion';

const IGV_TYPES = [
  { id: 'Gravado', label: 'Gravado', hint: 'Operación afecta al IGV — el caso más común.' },
  { id: 'Exonerado', label: 'Exonerado', hint: 'Operación exonerada del IGV.' },
  { id: 'Inafecto', label: 'Inafecto', hint: 'Operación no gravada por naturaleza.' },
];
const IGV_PERCENTS = [{ id: 18, label: '18%' }, { id: 10.5, label: '10.5%' }];

function SectionHeader({ icon, title, description, noBorder }: { icon?: React.ReactNode; title: string; description?: string; noBorder?: boolean }) {
  return <div className={noBorder ? '' : 'pt-2 border-t border-slate-100'}><p className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">{icon}{title}</p>{description && <p className="text-[11px] text-slate-500 mt-1">{description}</p>}</div>;
}

export default function SunatTab() {
  const { triggerToast, refreshNegocioConfig } = useApp();
  const { token, isSuperAdmin, sucursales, sId, selectSucursal } = useSucursalSelector();
  const certFileRef = useRef<HTMLInputElement>(null);

  const [empresa, setEmpresa] = useState<EmpresaDto | null>(null);
  const [solUser, setSolUser] = useState('');
  const [solPassword, setSolPassword] = useState('');
  const [showSolPass, setShowSolPass] = useState(false);
  const [igvTipo, setIgvTipo] = useState('Gravado');
  const [igvPorcentaje, setIgvPorcentaje] = useState(18);
  const [certPfx, setCertPfx] = useState('');
  const [certPassword, setCertPassword] = useState('');
  const [certFilename, setCertFilename] = useState('');
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certTempPassword, setCertTempPassword] = useState('');
  const [certTempFile, setCertTempFile] = useState<File | null>(null);
  const [certTempName, setCertTempName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getMiEmpresa(token).then(e => {
      setEmpresa(e); setSolUser(e.solUser); setSolPassword(e.solPassword);
      setIgvTipo(e.igvTipo || 'Gravado');
      setCertPfx(e.certificadoPfx || ''); setCertPassword(e.certificadoPassword);
      setCertFilename(e.certificadoFilename);
    }).catch(() => triggerToast('Error al cargar SUNAT.', 'error'))
    .finally(() => setLoading(false));
  }, [token]);

  /* El % de IGV real que usa el motor de ventas vive en Configuracion (por sucursal), no en
     Empresa — se carga/guarda aparte, según la sucursal seleccionada arriba. */
  useEffect(() => {
    if (!token || !sId) return;
    getConfiguracion(token, sId).then(c => setIgvPorcentaje(c.igvPorcentaje || 18)).catch(() => {});
  }, [token, sId]);

  const handleSave = async () => {
    if (!token || !empresa) return;
    setSaving(true);
    try {
      await updateEmpresa(token, empresa.id, {
        nombre: empresa.nombre, ruc: empresa.ruc, direccion: empresa.direccion,
        logoUrl: empresa.logoUrl, activo: empresa.activo,
        solUser: solUser || null, solPassword: solPassword || null,
        igvTipo: igvTipo || null,
        certificadoPfx: certPfx || null, certificadoPassword: certPassword || null,
        certificadoFilename: certFilename || null,
      });
      if (sId) {
        const actual = await getConfiguracion(token, sId);
        await updateConfiguracion(token, sId, {
          igvPorcentaje, monedaSimbolo: actual.monedaSimbolo, logoUrl: actual.logoUrl,
          instagram: actual.instagram, facebook: actual.facebook, tiktok: actual.tiktok,
          sitioWeb: actual.sitioWeb, reviewsLink: actual.reviewsLink,
          metodosPagoJson: actual.metodosPagoJson, metodosEntregaJson: actual.metodosEntregaJson,
        });
      }
      triggerToast('SUNAT guardado.', 'success');
      refreshNegocioConfig();
    } catch { triggerToast('Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  const openCertModal = () => {
    setCertTempFile(null); setCertTempName(''); setCertTempPassword('');
    setCertModalOpen(true);
  };

  const handleCertFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertTempFile(file);
    setCertTempName(file.name);
    e.target.value = '';
  };

  const handleCertModalSave = () => {
    if (!certTempFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCertPfx(reader.result as string);
      setCertFilename(certTempName);
      setCertPassword(certTempPassword);
      setCertModalOpen(false);
      triggerToast('Certificado cargado.', 'success');
    };
    reader.readAsDataURL(certTempFile);
  };

  const handleRemoveCert = () => {
    setCertPfx(''); setCertPassword(''); setCertFilename('');
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-semibold text-slate-600">Cargando configuración de SUNAT...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <SucursalSelector visible={isSuperAdmin} sucursales={sucursales} sId={sId} onChange={selectSucursal} />
      <SectionHeader icon={<KeyRound className="h-3.5 w-3.5 text-slate-400" />} title="Credenciales SOL" description="Usuario y clave de SUNAT Operaciones en Línea." noBorder />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Usuario SOL" value={solUser} onChange={e => setSolUser(e.target.value)} placeholder="USUARIO" />
        <div className="relative">
          <Input label="Clave SOL" type={showSolPass ? 'text' : 'password'} value={solPassword} onChange={e => setSolPassword(e.target.value)} placeholder="••••••••" />
          <button type="button" onClick={() => setShowSolPass(!showSolPass)} className="absolute right-3 top-7.5 text-slate-400 hover:text-slate-600">{showSolPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </div>
      </div>

      <SectionHeader icon={<Percent className="h-3.5 w-3.5 text-slate-400" />} title="Afectación del IGV" description="Define cómo se calcula el IGV en tus comprobantes. El porcentaje aplica a la sucursal seleccionada arriba y es el que usa Cobrar al registrar cada venta." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {IGV_TYPES.map(t => (
          <button key={t.id} type="button" onClick={() => setIgvTipo(t.id)} className={`p-3 rounded-xl border text-left transition-colors ${igvTipo === t.id ? 'border-brand bg-brand/5' : 'border-slate-200 hover:bg-slate-50'}`}>
            <Receipt className="h-4 w-4 text-brand mb-1" /><p className="text-sm font-semibold text-slate-800">{t.label}</p><p className="text-[10px] text-slate-500 mt-0.5">{t.hint}</p>
          </button>
        ))}
      </div>
      <div className="flex gap-3">{IGV_PERCENTS.map(p => <button key={p.id} type="button" onClick={() => setIgvPorcentaje(p.id)} className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${igvPorcentaje === p.id ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{p.label}</button>)}</div>

      <SectionHeader icon={<ShieldCheck className="h-3.5 w-3.5 text-slate-400" />} title="Certificado digital" description="Archivo .pfx, .p12 o .pem para firma electrónica de comprobantes." />
      {certFilename ? (
        <div className="flex items-center justify-between p-4 rounded-xl border border-brand/30 bg-brand/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-brand" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{certFilename}</p>
              <p className="text-[11px] text-slate-500">{certPassword ? 'Contraseña configurada' : 'Sin contraseña'}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={openCertModal} className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-brand/10"><Upload className="h-4 w-4" /></button>
            <button type="button" onClick={handleRemoveCert} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={openCertModal} className="w-full py-4 rounded-xl border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-colors">
          <Upload className="h-4 w-4 inline mr-1.5" /> Cargar certificado digital
        </button>
      )}

      <div className="flex justify-end pt-4"><Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button></div>

      <Modal open={certModalOpen} onClose={() => setCertModalOpen(false)} title="Cargar certificado digital" subtitle="Selecciona el archivo .pfx, .p12 o .pem y su contraseña." size="sm" fullHeight={false}
        footer={<><Button variant="secondary" onClick={() => setCertModalOpen(false)}>Cancelar</Button><Button onClick={handleCertModalSave} disabled={!certTempFile}>Cargar certificado</Button></>}>
        <div className="space-y-4">
          <input ref={certFileRef} type="file" accept=".pfx,.p12,.pem,.cer,.crt" onChange={handleCertFileSelect} className="hidden" />
          <button type="button" onClick={() => certFileRef.current?.click()} className="w-full py-6 rounded-xl border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors">
            <Upload className="h-5 w-5 mx-auto mb-1.5" />
            {certTempName || 'Seleccionar archivo (.pfx, .p12, .pem)'}
          </button>
          {certTempFile && (
            <div className="relative">
              <Input label="Contraseña del certificado" type="password" value={certTempPassword} onChange={e => setCertTempPassword(e.target.value)} placeholder="Contraseña del archivo" autoFocus />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
