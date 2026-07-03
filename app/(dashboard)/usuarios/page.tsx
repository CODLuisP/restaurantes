'use client';

import { useState } from 'react';
import { ShieldCheck, UserPlus, ShieldAlert, Crown, CreditCard, Utensils } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { Modal, Button, Input, Select, Badge } from '@/components/ui';
import type { Role } from '@/types';

const ROLE_META: Record<Role, { icon: React.ReactNode; badge: 'brand' | 'info' | 'warning' }> = {
  admin:  { icon: <Crown className="h-3.5 w-3.5" />,      badge: 'brand' },
  cajero: { icon: <CreditCard className="h-3.5 w-3.5" />, badge: 'info' },
  mozo:   { icon: <Utensils className="h-3.5 w-3.5" />,   badge: 'warning' },
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export default function UsuariosPage() {
  const { users, currentUser, addUser, toggleUserActive } = useAuth();
  const { triggerToast } = useApp();

  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({ name: '', email: '', pin: '', role: 'mozo' as Role, station: '' });

  /* Solo el administrador gestiona personal */
  if (currentUser?.role !== 'admin') {
    return (
      <div className="card-lg max-w-md mx-auto my-16 p-8 text-center space-y-3 animate-section">
        <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Acceso restringido</h3>
        <p className="text-xs text-slate-500">Solo el <strong>administrador</strong> puede gestionar el personal.</p>
      </div>
    );
  }

  const handleAdd = () => {
    if (!form.name.trim())            { triggerToast('Ingrese el nombre completo.', 'warning'); return; }
    if (!form.email.includes('@'))    { triggerToast('Ingrese un correo válido.', 'warning'); return; }
    if (!/^\d{4}$/.test(form.pin))    { triggerToast('El PIN debe tener 4 dígitos.', 'warning'); return; }
    if (users.some(u => u.email.toLowerCase() === form.email.trim().toLowerCase())) {
      triggerToast('Ya existe un usuario con ese correo.', 'error'); return;
    }
    if (users.some(u => u.pin === form.pin)) {
      triggerToast('Ese PIN ya está en uso por otro usuario.', 'error'); return;
    }
    addUser({
      name: form.name.trim(),
      email: form.email.trim(),
      pin: form.pin,
      role: form.role,
      station: form.station.trim() || 'Sin asignar',
      active: true,
    });
    triggerToast(`Personal "${form.name.trim()}" agregado como ${ROLE_LABELS[form.role]}.`, 'success');
    setForm({ name: '', email: '', pin: '', role: 'mozo', station: '' });
    setModal(false);
  };

  const counts = {
    admin:  users.filter(u => u.role === 'admin').length,
    cajero: users.filter(u => u.role === 'cajero').length,
    mozo:   users.filter(u => u.role === 'mozo').length,
  };

  return (
    <div className="space-y-6 animate-section">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand" /> Gestión de Personal
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Administre el equipo y sus roles: {counts.admin} admin · {counts.cajero} cajero · {counts.mozo} mozos.
          </p>
        </div>
        <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setModal(true)}>
          Agregar Personal
        </Button>
      </div>

      {/* Tabla */}
      <div className="card-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-bold">Colaborador</th>
                <th className="px-4 py-3 font-bold">Rol</th>
                <th className="px-4 py-3 font-bold hidden md:table-cell">Estación</th>
                <th className="px-4 py-3 font-bold hidden sm:table-cell">PIN</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand font-bold flex items-center justify-center text-xs shrink-0">
                        {initials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {u.name}
                          {u.id === currentUser?.id && <span className="ml-1.5 text-[9px] text-brand font-mono">(tú)</span>}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_META[u.role].badge}>
                      {ROLE_META[u.role].icon} {ROLE_LABELS[u.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-slate-600">{u.station}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs font-mono text-slate-500">••{u.pin.slice(-2)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleUserActive(u.id)}
                      disabled={u.id === currentUser?.id}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                        u.id === currentUser?.id
                          ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                          : u.active
                            ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {u.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal alta */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Agregar Personal"
        subtitle="Registre un nuevo colaborador y asigne su rol de acceso."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleAdd}>Guardar</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Nombre completo" placeholder="Ej. Ana Torres" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          <Input label="Correo institucional" type="email" placeholder="ana.torres@restopro.pe" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Select label="Rol" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}>
            <option value="mozo">Mozo / Salón</option>
            <option value="cajero">Cajero / Facturación</option>
            <option value="admin">Administrador</option>
          </Select>
          <Input label="PIN (4 dígitos)" inputMode="numeric" maxLength={4} placeholder="0000" value={form.pin}
            onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))} />
          <div className="sm:col-span-2">
            <Input label="Estación / Área" placeholder="Ej. Terraza Principal" value={form.station}
              onChange={e => setForm(f => ({ ...f, station: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
