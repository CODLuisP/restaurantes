'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { anularVenta, type VentaDto } from '@/lib/api/ventas';
import { codigoVenta } from '@/lib/ventas/codigoVenta';

interface Props {
  open: boolean;
  venta: VentaDto | null;
  token: string | null;
  onClose: () => void;
  onAnulada: () => void;
  triggerToast: (msg: string, type: 'success' | 'error') => void;
}

export function AnularNotaVentaModal({ open, venta, token, onClose, onAnulada, triggerToast }: Props) {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (loading) return;
    setMotivo('');
    onClose();
  };

  const handleAnular = async () => {
    if (!token || !venta) return;
    if (!motivo.trim()) {
      triggerToast('Ingresa un motivo de anulación.', 'error');
      return;
    }
    setLoading(true);
    try {
      await anularVenta(token, venta.id, motivo.trim());
      triggerToast(`${codigoVenta(venta)} anulada correctamente.`, 'success');
      setMotivo('');
      onAnulada();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo anular la nota de venta.';
      triggerToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!venta) return null;

  return (
    <Modal open={open} onClose={handleClose} title="Anular nota de venta">
      <div className="space-y-4">
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-3">
          <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
          <div className="text-xs text-rose-700 space-y-1">
            <p className="font-semibold">Esta acción no se puede deshacer.</p>
            <p>
              Se anulará <span className="font-bold">{codigoVenta(venta)}</span> por{' '}
              <span className="font-bold">S/. {venta.total.toFixed(2)}</span>.
              {venta.sesionMesaId && ' Si era la única venta de la cuenta, la mesa volverá a estar disponible.'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Motivo de anulación <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            className="input w-full text-sm"
            placeholder="Ej: Error en el pedido, cliente canceló..."
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            disabled={loading}
            maxLength={255}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleAnular(); }}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAnular}
            disabled={loading || !motivo.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold py-1.5 px-4 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Anular nota de venta'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
