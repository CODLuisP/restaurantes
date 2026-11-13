'use client';

import { useCallback, useEffect, useState } from 'react';
import { Printer, Plus, Pencil, Trash2, Copy, KeyRound, Usb, Network } from 'lucide-react';
import { Button, Input, Select, Toggle, Modal, Alert, SucursalSelector, Spinner } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useSucursalSelector } from '@/hooks/useSucursalSelector';
import {
  getImpresoras, createImpresora, updateImpresora, deleteImpresora, generarTokenAgente,
  type ImpresoraDto, type AreaImpresora, type ConexionImpresora, type AnchoPapel, type AgenteTokenDto,
} from '@/lib/api/impresoras';
import { getCategorias, updateCategoria } from '@/lib/api/categorias';
import type { CategoriaDto, AreaCategoria } from '@/types/categorias';

const AREA_LABEL: Record<AreaImpresora, string> = { cocina: 'Cocina', barra: 'Barra', caja: 'Caja' };
const AREA_CATEGORIA_LABEL: Record<AreaCategoria, string> = {
  cocina: 'Cocina', barra: 'Barra', ninguna: 'No se imprime',
};

interface FormState {
  nombre: string;
  area: AreaImpresora;
  conexion: ConexionImpresora;
  ip: string;
  puerto: string;
  nombreSistema: string;
  anchoPapel: AnchoPapel;
  activo: boolean;
}

const FORM_VACIO: FormState = {
  nombre: '', area: 'cocina', conexion: 'red', ip: '', puerto: '9100',
  nombreSistema: '', anchoPapel: '80mm', activo: true,
};

const mensajeDe = (err: unknown, porDefecto: string) =>
  err instanceof Error && err.message ? err.message : porDefecto;

export default function ImpresorasPage() {
  const { triggerToast } = useApp();
  const { token, isSuperAdmin, sucursales, sId, selectSucursal } = useSucursalSelector();

  const [impresoras, setImpresoras] = useState<ImpresoraDto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario de alta/edición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [porEliminar, setPorEliminar] = useState<ImpresoraDto | null>(null);
  const [guardandoCategoria, setGuardandoCategoria] = useState<number | null>(null);

  // Token del agente: se muestra una sola vez, no se vuelve a poder ver.
  const [tokenAgente, setTokenAgente] = useState<AgenteTokenDto | null>(null);
  const [generandoToken, setGenerandoToken] = useState(false);

  const cargar = useCallback(async () => {
    if (!token || !sId) return;
    setLoading(true);
    try {
      const [imp, cats] = await Promise.all([getImpresoras(token, sId), getCategorias(token)]);
      setImpresoras(imp);
      setCategorias([...cats].sort((a, b) => a.orden - b.orden));
    } catch (err) {
      triggerToast(mensajeDe(err, 'No se pudieron cargar las impresoras'), 'error');
    } finally {
      setLoading(false);
    }
  }, [token, sId, triggerToast]);

  useEffect(() => { cargar(); }, [cargar]);

  // Al cambiar de sucursal el token mostrado ya no corresponde.
  useEffect(() => { setTokenAgente(null); }, [sId]);

  /* ── Impresoras ── */

  const abrirNueva = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setErrorForm(null);
    setModalAbierto(true);
  };

  const abrirEditar = (i: ImpresoraDto) => {
    setEditandoId(i.id);
    setForm({
      nombre: i.nombre, area: i.area, conexion: i.conexion, ip: i.ip ?? '', puerto: String(i.puerto),
      nombreSistema: i.nombreSistema ?? '', anchoPapel: i.anchoPapel, activo: i.activo,
    });
    setErrorForm(null);
    setModalAbierto(true);
  };

  const guardar = async () => {
    if (!token || !sId) return;
    setGuardando(true);
    setErrorForm(null);
    const datos = {
      nombre: form.nombre.trim(),
      area: form.area,
      conexion: form.conexion,
      ip: form.conexion === 'red' ? form.ip.trim() : null,
      puerto: Number(form.puerto) || 9100,
      nombreSistema: form.conexion === 'usb' ? form.nombreSistema.trim() : null,
      anchoPapel: form.anchoPapel,
    };
    try {
      if (editandoId === null) {
        await createImpresora(token, { ...datos, sucursalId: sId });
        triggerToast('Impresora agregada.', 'success');
      } else {
        await updateImpresora(token, editandoId, { ...datos, activo: form.activo });
        triggerToast('Impresora actualizada.', 'success');
      }
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      setErrorForm(mensajeDe(err, 'No se pudo guardar la impresora.'));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarActiva = async (i: ImpresoraDto, activo: boolean) => {
    if (!token) return;
    try {
      await updateImpresora(token, i.id, {
        nombre: i.nombre, area: i.area, conexion: i.conexion, ip: i.ip, puerto: i.puerto,
        nombreSistema: i.nombreSistema, anchoPapel: i.anchoPapel, activo,
      });
      setImpresoras(prev => prev.map(p => (p.id === i.id ? { ...p, activo } : p)));
    } catch (err) {
      triggerToast(mensajeDe(err, 'No se pudo cambiar el estado.'), 'error');
    }
  };

  const eliminar = async () => {
    if (!token || !porEliminar) return;
    const objetivo = porEliminar;
    setPorEliminar(null);
    try {
      await deleteImpresora(token, objetivo.id);
      triggerToast('Impresora eliminada.', 'success');
      await cargar();
    } catch (err) {
      // Con trabajos ya registrados el backend pide desactivarla en vez de borrarla.
      triggerToast(mensajeDe(err, 'No se pudo eliminar la impresora.'), 'error');
    }
  };

  /* ── Áreas de las categorías ── */

  const cambiarAreaCategoria = async (c: CategoriaDto, area: AreaCategoria) => {
    if (!token || area === c.area) return;
    setGuardandoCategoria(c.id);
    try {
      const actualizada = await updateCategoria(token, c.id, {
        nombre: c.nombre, descripcion: c.descripcion, orden: c.orden, activo: c.activo, area,
      });
      setCategorias(prev => prev.map(x => (x.id === c.id ? actualizada : x)));
    } catch (err) {
      triggerToast(mensajeDe(err, 'No se pudo cambiar el área.'), 'error');
    } finally {
      setGuardandoCategoria(null);
    }
  };

  /* ── Agente ── */

  const generarToken = async () => {
    if (!token || !sId) return;
    setGenerandoToken(true);
    try {
      setTokenAgente(await generarTokenAgente(token, sId));
    } catch (err) {
      triggerToast(mensajeDe(err, 'No se pudo generar el token.'), 'error');
    } finally {
      setGenerandoToken(false);
    }
  };

  const copiarToken = async () => {
    if (!tokenAgente) return;
    try {
      await navigator.clipboard.writeText(tokenAgente.token);
      triggerToast('Token copiado.', 'success');
    } catch {
      triggerToast('No se pudo copiar; selecciónalo y cópialo a mano.', 'error');
    }
  };

  const areasConImpresora = new Set(impresoras.filter(i => i.activo).map(i => i.area));
  const categoriasSinImpresora = categorias.filter(
    c => c.activo && c.area !== 'ninguna' && !areasConImpresora.has(c.area),
  );

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <SucursalSelector visible={isSuperAdmin} sucursales={sucursales} sId={sId} onChange={selectSucursal} />

      <div className="flex items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-3">
          <div className="bg-brand p-2.5 rounded-xl shrink-0"><Printer className="h-5 w-5 text-white" /></div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Impresoras</h3>
            <p className="text-xs text-slate-500">
              Cocina, barra y caja. Las comandas se imprimen con el agente instalado en el local.
            </p>
          </div>
        </div>
        <Button onClick={abrirNueva} size="md" disabled={!sId}>
          <Plus className="h-4 w-4" /> Agregar impresora
        </Button>
      </div>

      <Alert variant="info" title="Requiere &quot;Impresora en cocina&quot;">
        Las comandas solo se envían a imprimir si activas &quot;Impresora en cocina&quot; en Métodos de entrega.
        Mientras esté activo, Cocina no usa la pantalla KDS.
      </Alert>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <>
          {/* Lista de impresoras */}
          <section className="bg-white rounded-xl border border-slate-200/90 divide-y divide-slate-100">
            {impresoras.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">
                Todavía no hay impresoras en esta sucursal. Agrega la de cocina para empezar.
              </p>
            ) : impresoras.map(i => (
              <div key={i.id} className={`p-4 flex items-center justify-between gap-3 ${i.activo ? '' : 'opacity-60'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-slate-100 p-2 rounded-xl shrink-0">
                    {i.conexion === 'usb'
                      ? <Usb className="h-4 w-4 text-slate-600" />
                      : <Network className="h-4 w-4 text-slate-600" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {i.nombre} <span className="text-[11px] font-semibold text-brand">· {AREA_LABEL[i.area]}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {i.conexion === 'usb' ? `USB · ${i.nombreSistema}` : `Red · ${i.ip}:${i.puerto}`} · {i.anchoPapel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Toggle checked={i.activo} onChange={v => cambiarActiva(i, v)} />
                  <Button variant="ghost" size="sm" onClick={() => abrirEditar(i)} aria-label={`Editar ${i.nombre}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPorEliminar(i)} aria-label={`Eliminar ${i.nombre}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </section>

          {/* Áreas de las categorías */}
          <section className="bg-white rounded-xl border border-slate-200/90 p-4 space-y-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Dónde se imprime cada categoría</h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                Los platos de una categoría salen en la impresora de su área. Por ejemplo, las bebidas en Barra y el
                resto en Cocina. Un pedido con platos de varias áreas genera un ticket en cada una.
              </p>
            </div>

            {categoriasSinImpresora.length > 0 && (
              <Alert variant="warning">
                No hay impresora activa para el área de: {categoriasSinImpresora.map(c => c.nombre).join(', ')}.
                Esos platos no se imprimirán.
              </Alert>
            )}

            <div className="divide-y divide-slate-100">
              {categorias.map(c => (
                <div key={c.id} className={`py-2 flex items-center justify-between gap-3 ${c.activo ? '' : 'opacity-50'}`}>
                  <span className="text-sm text-slate-700 truncate">{c.nombre}</span>
                  <div className="w-44 shrink-0">
                    <Select
                      value={c.area}
                      disabled={guardandoCategoria === c.id}
                      onChange={e => cambiarAreaCategoria(c, e.target.value as AreaCategoria)}
                      aria-label={`Área de ${c.nombre}`}
                    >
                      {(Object.keys(AREA_CATEGORIA_LABEL) as AreaCategoria[]).map(a => (
                        <option key={a} value={a}>{AREA_CATEGORIA_LABEL[a]}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              ))}
              {categorias.length === 0 && (
                <p className="py-3 text-sm text-slate-500">Aún no hay categorías en la carta.</p>
              )}
            </div>
          </section>

          {/* Agente de impresión */}
          <section className="bg-white rounded-xl border border-slate-200/90 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Agente de impresión</h4>
                <p className="text-[11px] text-slate-500 max-w-xl leading-snug">
                  Es un programa que se instala una vez en la laptop del local. Genera aquí su token y pégalo en su
                  archivo de configuración. Un token nuevo no anula los anteriores.
                </p>
              </div>
              <Button variant="secondary" size="md" onClick={generarToken} disabled={generandoToken || !sId}>
                <KeyRound className="h-4 w-4" /> {generandoToken ? 'Generando...' : 'Generar token'}
              </Button>
            </div>

            {tokenAgente && (
              <div className="space-y-2">
                <Alert variant="warning" title="Cópialo ahora">
                  Este token no se vuelve a mostrar. Quien lo tenga puede leer las comandas de esta sucursal; guárdalo
                  solo en la laptop del local.
                </Alert>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={tokenAgente.token}
                    onFocus={e => e.currentTarget.select()}
                    className="input flex-1 min-w-0 px-3 py-2 font-mono text-[11px]"
                    aria-label="Token del agente"
                  />
                  <Button variant="secondary" size="md" onClick={copiarToken}>
                    <Copy className="h-4 w-4" /> Copiar
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Vence el {new Date(tokenAgente.expiraEn).toLocaleDateString('es-PE')}.
                </p>
              </div>
            )}
          </section>
        </>
      )}

      {/* Alta / edición */}
      <Modal
        open={modalAbierto}
        onClose={() => !guardando && setModalAbierto(false)}
        title={editandoId === null ? 'Agregar impresora' : 'Editar impresora'}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalAbierto(false)} disabled={guardando}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando || !form.nombre.trim()}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {errorForm && <Alert variant="danger">{errorForm}</Alert>}

          <Input
            label="Nombre"
            placeholder="Ej. Impresora de cocina"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Área" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value as AreaImpresora }))}>
              <option value="cocina">Cocina</option>
              <option value="barra">Barra</option>
              <option value="caja">Caja</option>
            </Select>
            <Select label="Papel" value={form.anchoPapel} onChange={e => setForm(f => ({ ...f, anchoPapel: e.target.value as AnchoPapel }))}>
              <option value="80mm">80 mm</option>
              <option value="58mm">58 mm</option>
            </Select>
          </div>

          <Select label="Conexión" value={form.conexion} onChange={e => setForm(f => ({ ...f, conexion: e.target.value as ConexionImpresora }))}>
            <option value="red">Red (cable LAN)</option>
            <option value="usb">USB (conectada a la laptop del agente)</option>
          </Select>

          {form.conexion === 'red' ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input
                  label="IP de la impresora"
                  placeholder="192.168.100.200"
                  value={form.ip}
                  onChange={e => setForm(f => ({ ...f, ip: e.target.value }))}
                  hint="Sale en el autotest impreso de la impresora."
                />
              </div>
              <Input
                label="Puerto"
                inputMode="numeric"
                value={form.puerto}
                onChange={e => setForm(f => ({ ...f, puerto: e.target.value.replace(/\D/g, '') }))}
              />
            </div>
          ) : (
            <Input
              label="Nombre en Windows"
              placeholder="XP-E200L"
              value={form.nombreSistema}
              onChange={e => setForm(f => ({ ...f, nombreSistema: e.target.value }))}
              hint="Tal como aparece en Dispositivos e impresoras."
            />
          )}

          {editandoId !== null && (
            <Toggle label="Impresora activa" checked={form.activo} onChange={v => setForm(f => ({ ...f, activo: v }))} />
          )}
        </div>
      </Modal>

      {/* Confirmar eliminación */}
      <Modal
        open={porEliminar !== null}
        onClose={() => setPorEliminar(null)}
        title="Eliminar impresora"
        subtitle={`¿Eliminar "${porEliminar?.nombre ?? ''}"? Si ya imprimió comandas no se puede borrar; en ese caso desactívala.`}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPorEliminar(null)}>Cancelar</Button>
            <Button variant="danger" onClick={eliminar}>Eliminar</Button>
          </div>
        }
      />
    </div>
  );
}
