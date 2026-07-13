'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ShieldCheck, UserPlus, ShieldAlert, Crown, CreditCard, Utensils, Bike, Pencil } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { Modal, Button, Input, Select, Badge, LoadingRow } from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import { getUsuarios, createUsuario, updateUsuario, type Usuario } from '@/lib/api/usuarios';
import { getRoles, type Rol } from '@/lib/api/roles';
import { getSucursales, type Sucursal } from '@/lib/api/sucursales';

const ROL_ICONOS: Record<string, React.ReactNode> = {
  superadmin: <Crown className="h-3.5 w-3.5" />,
  admin:      <Crown className="h-3.5 w-3.5" />,
  cajero:     <CreditCard className="h-3.5 w-3.5" />,
  mozo:       <Utensils className="h-3.5 w-3.5" />,
  cocinero:   <Utensils className="h-3.5 w-3.5" />,
  repartidor: <Bike className="h-3.5 w-3.5" />,
};

const ROL_BADGE: Record<string, 'brand' | 'info' | 'warning'> = {
  superadmin: 'brand',
  admin:      'brand',
  cajero:     'info',
  mozo:       'warning',
  cocinero:   'warning',
  repartidor: 'info',
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

// Mapeo de nombres de rol del backend (minúsculas) a etiqueta legible.
// "superadmin" nunca se muestra a quien no tenga ese mismo rol (ver filtros más abajo).
function labelRol(nombre: string): string {
  const key = nombre.trim().toLowerCase();
  if (key === 'admin') return 'Administrador';
  if (key === 'superadmin') return 'Super Administrador';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

interface FormState {
  nombre: string;
  username: string;
  email: string;
  rolId: string;
  sucursalId: string;
  password: string;
  pin: string;
}

const FORM_VACIO: FormState = { nombre: '', username: '', email: '', rolId: '', sucursalId: '', password: '', pin: '' };

export default function UsuariosPage() {
  const { data: session } = useSession();
  const { currentUser } = useAuth();
  const { triggerToast } = useApp();
  const token = session?.accessToken;
  const esSuperAdmin = session?.user.role === 'superadmin';

  const [usuarios, setUsuarios]     = useState<Usuario[]>([]);
  const [roles, setRoles]           = useState<Rol[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

  const [modal, setModal]     = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [form, setForm]       = useState<FormState>(FORM_VACIO);

  const cargarDatos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [usuariosData, rolesData, sucursalesData] = await Promise.all([
        getUsuarios(token),
        getRoles(token),
        esSuperAdmin ? getSucursales(token) : Promise.resolve([]),
      ]);
      setUsuarios(usuariosData);
      setRoles(rolesData);
      setSucursales(sucursalesData);
    } catch (err) {
      triggerToast(err instanceof ApiError ? err.message : 'No se pudo cargar el personal.', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, esSuperAdmin, triggerToast]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

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

  const abrirCrear = () => {
    setEditando(null);
    setForm({ ...FORM_VACIO, rolId: rolesVisibles[0] ? String(rolesVisibles[0].id) : '' });
    setModal(true);
  };

  const abrirEditar = (u: Usuario) => {
    setEditando(u);
    setForm({
      nombre: u.nombre,
      username: u.username,
      email: u.email,
      rolId: String(u.rolId),
      sucursalId: u.sucursalId ? String(u.sucursalId) : '',
      password: '',
      pin: '',
    });
    setModal(true);
  };

  const handleGuardar = async () => {
    if (!token) return;
    if (!form.nombre.trim())  { triggerToast('Ingrese el nombre completo.', 'warning'); return; }
    if (!editando && !form.username.trim()) { triggerToast('Ingrese el usuario.', 'warning'); return; }
    if (!form.rolId)          { triggerToast('Seleccione un rol.', 'warning'); return; }
    if (!editando && !form.password.trim() && !form.pin.trim()) {
      triggerToast('Defina una contraseña o un PIN para el nuevo usuario.', 'warning'); return;
    }

    setSaving(true);
    try {
      if (editando) {
        const actualizado = await updateUsuario(token, editando.id, {
          sucursalId: form.sucursalId ? Number(form.sucursalId) : null,
          rolId: Number(form.rolId),
          nombre: form.nombre.trim(),
          email: form.email.trim(),
          password: form.password.trim() || undefined,
          pin: form.pin.trim() || undefined,
          activo: editando.activo,
        });
        setUsuarios(prev => prev.map(u => (u.id === actualizado.id ? actualizado : u)));
        triggerToast(`Personal "${actualizado.nombre}" actualizado.`, 'success');
      } else {
        const creado = await createUsuario(token, {
          sucursalId: form.sucursalId ? Number(form.sucursalId) : null,
          rolId: Number(form.rolId),
          nombre: form.nombre.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password.trim() || undefined,
          pin: form.pin.trim() || undefined,
        });
        setUsuarios(prev => [...prev, creado]);
        triggerToast(`Personal "${creado.nombre}" agregado.`, 'success');
      }
      setModal(false);
    } catch (err) {
      triggerToast(err instanceof ApiError ? err.message : 'No se pudo guardar el registro.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (u: Usuario) => {
    if (!token) return;
    try {
      const actualizado = await updateUsuario(token, u.id, {
        sucursalId: u.sucursalId,
        rolId: u.rolId,
        nombre: u.nombre,
        email: u.email,
        activo: !u.activo,
      });
      setUsuarios(prev => prev.map(x => (x.id === actualizado.id ? actualizado : x)));
      triggerToast(actualizado.activo ? 'Usuario activado.' : 'Usuario desactivado.', 'success');
    } catch (err) {
      triggerToast(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado.', 'error');
    }
  };

  const nombreSucursal = (id: number | null) => sucursales.find(s => s.id === id)?.nombre ?? '—';
  const rolMeta = (nombre: string) => {
    const key = nombre.toLowerCase();
    return { icon: ROL_ICONOS[key] ?? <Utensils className="h-3.5 w-3.5" />, badge: ROL_BADGE[key] ?? 'info' as const };
  };

  // "superadmin" solo es visible (en la lista y en el selector de rol) para quien tiene ese rol.
  const rolesVisibles = roles.filter(r => esSuperAdmin || r.nombre.toLowerCase() !== 'superadmin');
  const usuariosVisibles = usuarios.filter(u => esSuperAdmin || u.rolNombre.toLowerCase() !== 'superadmin');

  return (
    <div className="space-y-6 animate-section">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand" /> Gestión de Personal
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {usuariosVisibles.length} colaborador{usuariosVisibles.length === 1 ? '' : 'es'} registrado{usuariosVisibles.length === 1 ? '' : 's'}.
          </p>
        </div>
        <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={abrirCrear} disabled={loading}>
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
                {esSuperAdmin && <th className="px-4 py-3 font-bold hidden md:table-cell">Sucursal</th>}
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <LoadingRow cols={esSuperAdmin ? 5 : 4} />}

              {!loading && usuariosVisibles.length === 0 && (
                <tr>
                  <td colSpan={esSuperAdmin ? 5 : 4} className="px-4 py-10 text-center text-xs text-slate-400">
                    Aún no hay personal registrado.
                  </td>
                </tr>
              )}

              {!loading && usuariosVisibles.map(u => {
                const meta = rolMeta(u.rolNombre);
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand font-bold flex items-center justify-center text-xs shrink-0">
                          {initials(u.nombre)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {u.nombre}
                            {String(u.id) === currentUser?.id && <span className="ml-1.5 text-[9px] text-brand font-mono">(tú)</span>}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate font-mono">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={meta.badge}>{meta.icon} {labelRol(u.rolNombre)}</Badge>
                    </td>
                    {esSuperAdmin && (
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-slate-600">{nombreSucursal(u.sucursalId)}</span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => abrirEditar(u)}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors inline-flex items-center gap-1"
                        >
                          <Pencil className="h-3 w-3" /> Editar
                        </button>
                        <button
                          onClick={() => handleToggleActivo(u)}
                          disabled={String(u.id) === currentUser?.id}
                          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                            String(u.id) === currentUser?.id
                              ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                              : u.activo
                                ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal alta / edición */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        closeOnOverlayClick={false}
        title={editando ? 'Editar Personal' : 'Agregar Personal'}
        subtitle={editando ? 'Actualice los datos y el rol de acceso.' : 'Registre un nuevo colaborador y asigne su rol de acceso.'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</Button>
            <Button variant="primary" onClick={handleGuardar} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Nombre completo" placeholder="Ej. Ana Torres" value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} autoFocus />
          <Input label="Usuario" placeholder="ana.torres" value={form.username} disabled={!!editando}
            hint={editando ? 'El usuario no se puede modificar.' : undefined}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          <Input label="Correo (opcional)" type="email" placeholder="ana.torres@restopro.pe" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Select label="Rol" value={form.rolId} onChange={e => setForm(f => ({ ...f, rolId: e.target.value }))}>
            <option value="" disabled>Seleccione un rol</option>
            {rolesVisibles.map(r => <option key={r.id} value={r.id}>{labelRol(r.nombre)}</option>)}
          </Select>
          {esSuperAdmin && (
            <Select label="Sucursal" value={form.sucursalId} onChange={e => setForm(f => ({ ...f, sucursalId: e.target.value }))}>
              <option value="">Sin asignar</option>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </Select>
          )}
          <Input label={editando ? 'Nueva contraseña (opcional)' : 'Contraseña'} type="password"
            placeholder={editando ? 'Dejar vacío para no cambiar' : '••••••••'} value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          <Input label={editando ? 'Nuevo PIN (opcional)' : 'PIN'} inputMode="numeric" maxLength={6}
            placeholder={editando ? 'Dejar vacío para no cambiar' : '0000'} value={form.pin}
            onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} />
        </div>
        {!editando && (
          <p className="text-[10px] text-slate-400 mt-3">Debe definir al menos una contraseña o un PIN.</p>
        )}
      </Modal>
    </div>
  );
}
