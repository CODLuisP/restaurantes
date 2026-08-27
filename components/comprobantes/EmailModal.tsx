'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Send } from 'lucide-react';
import { Modal } from '@/components/ui';
import type { Comprobante } from './types';

interface EmailModalProps {
  data: { open: boolean; comp: Comprobante | null; email: string };
  onClose: () => void;
  onSuccess: (num: string, email: string) => void;
}

export default function EmailModal({ data, onClose, onSuccess }: EmailModalProps) {
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (data.email) setEmailInput(data.email);
    else setEmailInput('');
  }, [data.email]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setSending(true);
    setTimeout(() => {
      setSending(false);
      onSuccess(data.comp!.numero, emailInput);
      onClose();
    }, 1000);
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
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Correo Electrónico del Destinatario</label>
          <input
            type="email"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            placeholder="ejemplo@correo.com"
            className="input w-full px-3 py-2 text-xs"
            required
            disabled={sending}
          />
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
            disabled={sending || !emailInput.trim()}
            className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
          >
            {sending ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" /> Enviar Correo
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
