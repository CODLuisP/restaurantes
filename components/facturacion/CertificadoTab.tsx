'use client';

import { useRef, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ShieldCheck, Upload, CheckCircle2, AlertTriangle, CalendarClock } from 'lucide-react';
import { Button, Input, Modal, Spinner, Alert } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import {
  getEmpresaFacturacion, updateEmpresaFacturacion,
  convertirCertificadoBase64, convertirCertificadoPem,
  type EmpresaFacturacion,
} from '@/lib/api/facturacion';
import { ApiError } from '@/lib/api/client';

function diasRestantes(fechaHasta?: string | null): number | null {
  if (!fechaHasta) return null;
  const hasta = new Date(fechaHasta).getTime();
  if (Number.isNaN(hasta)) return null;
  return Math.ceil((hasta - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(fecha));
}

/** % transcurrido del periodo de vigencia (0-100), para la barra de progreso. */
function porcentajeVigencia(desde?: string | null, hasta?: string | null): number | null {
  if (!desde || !hasta) return null;
  const t0 = new Date(desde).getTime();
  const t1 = new Date(hasta).getTime();
  if (Number.isNaN(t0) || Number.isNaN(t1) || t1 <= t0) return null;
  const pct = ((Date.now() - t0) / (t1 - t0)) * 100;
  return Math.min(100, Math.max(0, pct));
}

export default function CertificadoTab() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const { triggerToast } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const [empresa, setEmpresa] = useState<EmpresaFacturacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'idle' | 'base64' | 'pem' | 'guardando'>('idle');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError('');
    getEmpresaFacturacion(token)
      .then(setEmpresa)
      .catch(() => setError('No se pudo cargar la información del certificado.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const openModal = () => {
    setFile(null);
    setPassword('');
    setModalError('');
    setStep('idle');
    setModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    e.target.value = '';
  };

  const handleGuardar = async () => {
    if (!token || !file || !password.trim()) return;
    setSaving(true);
    setModalError('');
    try {
      setStep('base64');
      const base64 = await convertirCertificadoBase64(token, file);

      setStep('pem');
      const { pem } = await convertirCertificadoPem(token, base64, password);

      setStep('guardando');
      await updateEmpresaFacturacion(token, { certificadoPem: pem, certificadoPassword: password });

      triggerToast('Certificado digital actualizado.', 'success');
      setModalOpen(false);
      load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo procesar el certificado. Verifica el archivo y la contraseña.';
      setModalError(msg);
    } finally {
      setSaving(false);
      setStep('idle');
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-semibold text-slate-600">Cargando certificado digital...</p>
      </div>
    );
  }

  if (error) {
    return <div className="py-10"><Alert variant="danger" title="No se pudo cargar">{error}</Alert></div>;
  }

  const dias = diasRestantes(empresa?.certificadoVigenciaHasta);
  const vigenciaCritica = dias !== null && dias <= 30;
  const pctVigencia = porcentajeVigencia(empresa?.certificadoVigenciaDesde, empresa?.certificadoVigenciaHasta);
  const vencido = dias !== null && dias < 0;
  const barraColor = vencido ? 'bg-rose-500' : vigenciaCritica ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${empresa?.tieneCertificado ? 'bg-brand/10 text-brand' : 'bg-slate-100 text-slate-400'}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Certificado Digital (.pfx / .p12)</p>
              <p className="text-[11px] text-slate-500">Firma electrónica de tus comprobantes ante SUNAT</p>
            </div>
          </div>
          <Button onClick={openModal} icon={<Upload className="h-3.5 w-3.5" />} size="sm">
            {empresa?.tieneCertificado ? 'Actualizar certificado' : 'Cargar certificado'}
          </Button>
        </div>

        {empresa?.tieneCertificado ? (
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">Certificado cargado y activo</span>
            </div>

            {empresa.certificadoVigenciaDesde && empresa.certificadoVigenciaHasta && (
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" /> Vigencia
                  </span>
                  <span className={`text-[11px] font-bold ${vencido ? 'text-rose-600' : vigenciaCritica ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {vencido ? 'Vencido' : `Vence en ${dias} día${dias === 1 ? '' : 's'}`}
                  </span>
                </div>
                {pctVigencia !== null && (
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full ${barraColor} rounded-full transition-all`} style={{ width: `${pctVigencia}%` }} />
                  </div>
                )}
                <p className="text-[11px] text-slate-500">
                  {formatFecha(empresa.certificadoVigenciaDesde)} &rarr; {formatFecha(empresa.certificadoVigenciaHasta)}
                </p>
              </div>
            )}

            {vigenciaCritica && (
              <Alert variant={vencido ? 'danger' : 'warning'} icon={<AlertTriangle className="h-4 w-4 shrink-0" />}>
                {vencido
                  ? 'El certificado ha vencido. Los comprobantes no podrán firmarse hasta que lo actualices.'
                  : `El certificado vence pronto (${dias} días). Actualízalo antes de que expire.`}
              </Alert>
            )}

            <div className="grid grid-cols-3 gap-3 text-[11px] pt-1">
              <div>
                <p className="text-slate-400 font-semibold uppercase tracking-wide text-[9.5px]">RUC</p>
                <p className="text-slate-700 font-medium mt-0.5">{empresa.ruc}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase tracking-wide text-[9.5px]">Tipo</p>
                <p className="text-slate-700 font-medium mt-0.5">PFX / P12</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase tracking-wide text-[9.5px]">Archivo</p>
                <p className="text-slate-700 font-medium mt-0.5">Cargado</p>
              </div>
            </div>
          </div>
        ) : (
          <Alert variant="warning" icon={<AlertTriangle className="h-4 w-4 shrink-0" />}>
            No hay un certificado digital configurado. No podrás emitir comprobantes electrónicos hasta cargar uno.
          </Alert>
        )}
      </div>

      <Alert variant="info" title="¿No tienes un certificado?">
        Puedes generar uno gratuito de pruebas en{' '}
        <a href="https://llama.pe/certificado-digital-de-prueba-sunat" target="_blank" rel="noreferrer" className="font-semibold underline">
          llama.pe/certificado-digital-de-prueba-sunat
        </a>. Guarda la contraseña que uses al generarlo — la necesitarás para cargarlo aquí.
      </Alert>

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title="Cargar certificado digital"
        subtitle="Selecciona el archivo .pfx o .p12 y su contraseña de exportación."
        size="sm"
        fullHeight={false}
        closeOnOverlayClick={!saving}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleGuardar} disabled={!file || !password.trim()} loading={saving}>
              {step === 'base64' ? 'Leyendo archivo...' : step === 'pem' ? 'Verificando contraseña...' : step === 'guardando' ? 'Guardando...' : 'Cargar certificado'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <input ref={fileRef} type="file" accept=".pfx,.p12" onChange={handleFileSelect} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={saving}
            className="w-full py-6 rounded-xl border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            <Upload className="h-5 w-5 mx-auto mb-1.5" />
            {file ? file.name : 'Seleccionar archivo (.pfx, .p12)'}
          </button>

          <Input
            label="Contraseña del certificado"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Contraseña usada al generar el certificado"
            disabled={saving}
            hint="Es la clave que descifra el certificado para poder firmar tus comprobantes."
          />

          {modalError && <Alert variant="danger">{modalError}</Alert>}
        </div>
      </Modal>
    </div>
  );
}
