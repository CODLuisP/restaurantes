'use client';

import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';

interface NuevoClienteModalProps {
  open: boolean;
  onClose: () => void;
}

export default function NuevoClienteModal({ open, onClose }: NuevoClienteModalProps) {
  const { addCustomer } = useApp();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  const reset = () => { setNombre(''); setTelefono(''); setEmail(''); };
  const close = () => { onClose(); reset(); };

  const handleSubmit = () => {
    if (!nombre.trim()) return;
    addCustomer({ nombre: nombre.trim(), telefono: telefono.trim(), email: email.trim() });
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Nuevo cliente"
      subtitle="Registra un cliente en tu CRM"
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!nombre.trim()}>Guardar cliente</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Nombre completo *
          </label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Juan Pérez"
            className="input w-full px-3 py-2"
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Teléfono
          </label>
          <input
            type="tel"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            placeholder="912 903 330"
            className="input w-full px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="cliente@correo.com"
            className="input w-full px-3 py-2"
          />
        </div>
      </div>
    </Modal>
  );
}
