'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, MessageCircle, Plus, X } from 'lucide-react';
import { Modal } from '@/components/ui';
import { getPdfUrl } from '@/lib/api/comprobantes';
import type { Comprobante } from './types';

interface WhatsAppModalProps {
  data: { open: boolean; comp: Comprobante | null; phone: string };
  token: string | null | undefined;
  onClose: () => void;
  onSuccess: (num: string, phone: string) => void;
  triggerToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const normalizeDigits = (s: string) => s.replace(/\D/g, '').replace(/^51/, '');

export default function WhatsAppModal({ data, token, onClose, onSuccess, triggerToast }: WhatsAppModalProps) {
  const [numbers, setNumbers] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (data.open) {
      const inicial = data.phone.split(',').map(normalizeDigits).filter(n => n.length === 9);
      setNumbers(Array.from(new Set(inicial)));
      setCurrent('');
    }
  }, [data.open, data.phone]);

  const addCurrent = () => {
    const digits = normalizeDigits(current);
    if (digits.length !== 9) { triggerToast('El número debe tener 9 dígitos.', 'warning'); return; }
    if (numbers.includes(digits)) { setCurrent(''); return; }
    setNumbers(prev => [...prev, digits]);
    setCurrent('');
  };

  const removeNumber = (n: string) => setNumbers(prev => prev.filter(x => x !== n));

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !data.comp) return;
    const pendiente = normalizeDigits(current);
    const destinatarios = pendiente.length === 9 && !numbers.includes(pendiente) ? [...numbers, pendiente] : numbers;
    if (destinatarios.length === 0) { triggerToast('Ingresa al menos un número válido.', 'warning'); return; }

    setSending(true);
    try {
      const resPdf = await fetch(getPdfUrl(parseInt(data.comp.id)), { headers: { Authorization: `Bearer ${token}` } });
      if (!resPdf.ok) throw new Error('No se pudo obtener el PDF del comprobante.');
      const pdfBlob = await resPdf.blob();

      const form = new FormData();
      form.append('to', destinatarios.join(','));
      form.append('mensaje', `Estimado(a) ${data.comp.clienteDoc.name}, adjuntamos su ${data.comp.tipo.toLowerCase()} electrónica ${data.comp.numero}.`);
      form.append('numero', data.comp.numero);
      form.append('pdf', pdfBlob, `${data.comp.numero}.pdf`);

      const res = await fetch('/api/comprobantes/enviar-whatsapp', { method: 'POST', body: form });
      const result = await res.json();
      if (!result.ok) throw new Error(result.error ?? 'No se pudo enviar por WhatsApp.');

      if (result.fallidos?.length > 0) {
        triggerToast(`Enviado, pero falló: ${result.fallidos.join(', ')}`, 'warning');
      }
      onSuccess(data.comp.numero, destinatarios.join(', '));
      onClose();
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Error al enviar por WhatsApp.', 'error');
    } finally {
      setSending(false);
    }
  };

  const totalDestinatarios = numbers.length + (normalizeDigits(current).length === 9 && !numbers.includes(normalizeDigits(current)) ? 1 : 0);

  return (
    <Modal
      open={data.open}
      onClose={onClose}
      title="Enviar Comprobante por WhatsApp"
      subtitle={`Comprobante: ${data.comp?.numero}`}
      size="sm"
      fullHeight={false}
    >
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Número(s) celular de envío</label>

          {numbers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {numbers.map(n => (
                <span key={n} className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono px-2 py-1 rounded-full">
                  +51 {n}
                  <button type="button" onClick={() => removeNumber(n)} disabled={sending} className="hover:text-emerald-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-center">
            <span className="text-slate-400 text-xs font-bold font-mono px-2 py-1.5 bg-slate-100 rounded border border-slate-200 select-none">
              +51 (PE)
            </span>
            <input
              type="tel"
              maxLength={9}
              value={current}
              onChange={e => setCurrent(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCurrent(); } }}
              placeholder="987654321"
              className="input flex-1 min-w-0 px-3 py-2 text-xs font-mono"
              disabled={sending}
            />
            <button
              type="button"
              onClick={addCurrent}
              disabled={sending || current.length !== 9}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Agregar número"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Agrega varios números — cada uno recibirá el comprobante.</p>
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
            disabled={sending || totalDestinatarios === 0}
            className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1 disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700"
          >
            {sending ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Enviando{totalDestinatarios > 1 ? ` (${totalDestinatarios})` : ''}...
              </>
            ) : (
              <>
                <MessageCircle className="h-3.5 w-3.5" /> Enviar WhatsApp{totalDestinatarios > 1 ? ` (${totalDestinatarios})` : ''}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
