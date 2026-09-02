'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Send } from 'lucide-react';
import { Modal } from '@/components/ui';
import { getPdfUrl } from '@/lib/api/comprobantes';
import type { Comprobante } from './types';

interface EmailModalProps {
  data: { open: boolean; comp: Comprobante | null; email: string };
  token: string | null | undefined;
  onClose: () => void;
  onSuccess: (num: string, email: string) => void;
  triggerToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Varios correos separados por coma — todos con formato válido, sin repetidos. */
function parseEmails(raw: string): { validos: string[]; error: string | null } {
  const valores = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (valores.length === 0) return { validos: [], error: null };
  const invalidos = valores.filter(v => !EMAIL_RE.test(v));
  if (invalidos.length > 0) return { validos: [], error: `Correo inválido: ${invalidos.join(', ')}` };
  return { validos: Array.from(new Set(valores)), error: null };
}

export default function EmailModal({ data, token, onClose, onSuccess, triggerToast }: EmailModalProps) {
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (data.open) setEmailInput(data.email);
  }, [data.open, data.email]);

  const { validos: destinatarios, error: formatoError } = parseEmails(emailInput);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !data.comp) return;
    if (destinatarios.length === 0) { triggerToast(formatoError ?? 'Ingresa al menos un correo válido.', 'warning'); return; }

    setSending(true);
    try {
      const resPdf = await fetch(getPdfUrl(parseInt(data.comp.id)), { headers: { Authorization: `Bearer ${token}` } });
      if (!resPdf.ok) throw new Error('No se pudo obtener el PDF del comprobante.');
      const pdfBlob = await resPdf.blob();

      const form = new FormData();
      form.append('to', destinatarios.join(','));
      form.append('subject', `${data.comp.tipo} electrónica ${data.comp.numero}`);
      form.append('bodyText', `Estimado(a) ${data.comp.clienteDoc.name}, adjuntamos su comprobante electrónico ${data.comp.numero}.`);
      form.append('numero', data.comp.numero);
      form.append('pdf', pdfBlob, `${data.comp.numero}.pdf`);

      const res = await fetch('/api/comprobantes/enviar-correo', { method: 'POST', body: form });
      const result = await res.json();
      if (!result.ok) throw new Error(result.error ?? 'No se pudo enviar el correo.');

      if (result.fallidos?.length > 0) {
        triggerToast(`Enviado, pero falló: ${result.fallidos.join(', ')}`, 'warning');
      }
      onSuccess(data.comp.numero, destinatarios.join(', '));
      onClose();
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Error al enviar el correo.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={data.open}
      onClose={onClose}
      title="Enviar Comprobante por Correo"
      subtitle={`Comprobante: ${data.comp?.numero}`}
      size="sm"
      fullHeight={false}
    >
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Correo(s) del destinatario</label>
          <input
            type="text"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            placeholder="cliente@correo.com, otro@correo.com"
            className="input w-full px-3 py-2 text-xs"
            required
            disabled={sending}
          />
          <p className="text-[10px] text-slate-400 mt-1">Puedes ingresar varios correos separados por coma.</p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={sending || destinatarios.length === 0}
            className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
          >
            {sending ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Enviando{destinatarios.length > 1 ? ` (${destinatarios.length})` : ''}...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" /> Enviar Correo{destinatarios.length > 1 ? ` (${destinatarios.length})` : ''}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
