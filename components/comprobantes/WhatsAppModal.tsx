'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, MessageCircle } from 'lucide-react';
import { Modal } from '@/components/ui';
import type { Comprobante } from './types';

interface WhatsAppModalProps {
  data: { open: boolean; comp: Comprobante | null; phone: string };
  onClose: () => void;
  onSuccess: (num: string, phone: string) => void;
}

export default function WhatsAppModal({ data, onClose, onSuccess }: WhatsAppModalProps) {
  const [phoneInput, setPhoneInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (data.phone) setPhoneInput(data.phone);
    else setPhoneInput('');
  }, [data.phone]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;

    setSending(true);
    setTimeout(() => {
      setSending(false);
      onSuccess(data.comp!.numero, phoneInput);
      onClose();
    }, 1000);
  };

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
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Número Celular de Envío</label>
          <div className="flex gap-2 items-center">
            <span className="text-slate-400 text-xs font-bold font-mono px-2 py-1.5 bg-slate-100 rounded border border-slate-200 select-none">
              +51 (PE)
            </span>
            <input
              type="tel"
              maxLength={9}
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value.replace(/\D/g, ''))}
              placeholder="987654321"
              className="input w-full px-3 py-2 text-xs font-mono"
              required
              disabled={sending}
            />
          </div>
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
            disabled={sending || phoneInput.length !== 9}
            className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1 disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700"
          >
            {sending ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <MessageCircle className="h-3.5 w-3.5" /> Enviar WhatsApp
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
