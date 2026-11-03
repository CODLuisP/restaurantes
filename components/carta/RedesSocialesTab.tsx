'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SquarePen, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Select, Spinner } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getConfiguracion, guardarConfiguracion } from '@/lib/api/configuracion';
import { urlMenuPublico } from '@/lib/menu/subdominio';
import {
  usuarioSocial,
  enlaceWeb,
  formatWhatsappNumber,
  parseEnlacesConfig,
  getEnlaceVisuals,
  type EnlaceItem,
  type EnlaceTipo,
} from '@/components/menu/SocialLinksRow';
import { useSucursalSelector } from '@/hooks/useSucursalSelector';

interface SuggestedDef {
  tipo: EnlaceTipo;
  label: string;
  defaultTitle: string;
  inputLabel: string;
  placeholder: string;
  helper?: string;
}

const SUGGESTED_LINKS: SuggestedDef[] = [
  {
    tipo: 'whatsapp',
    label: 'WhatsApp',
    defaultTitle: 'WhatsApp',
    inputLabel: 'Número de WhatsApp',
    placeholder: '+51912903330',
    helper: 'Ingresa el número con código de país (ej. +51912903330).',
  },
  {
    tipo: 'menu',
    label: 'Menú',
    defaultTitle: 'Menú',
    inputLabel: 'Enlace del menú (opcional)',
    placeholder: '/menu',
    helper: 'Puedes dejarlo por defecto para dirigir a tu carta digital.',
  },
  {
    tipo: 'instagram',
    label: 'Instagram',
    defaultTitle: 'Instagram',
    inputLabel: 'Usuario o URL de Instagram',
    placeholder: '@tu_usuario',
    helper: 'Ingresa tu usuario (ej. @mi_restaurante) o el enlace completo.',
  },
  {
    tipo: 'facebook',
    label: 'Facebook',
    defaultTitle: 'Facebook',
    inputLabel: 'URL de Facebook',
    placeholder: 'https://www.facebook.com/tu-negocio',
    helper: 'Pega el enlace completo de tu página de Facebook.',
  },
  {
    tipo: 'tiktok',
    label: 'TikTok',
    defaultTitle: 'TikTok',
    inputLabel: 'Usuario o URL de TikTok',
    placeholder: '@tu_usuario',
    helper: 'Ingresa tu usuario (ej. @mi_restaurante) o el enlace completo.',
  },
  {
    tipo: 'externo',
    label: 'Enlace externo',
    defaultTitle: 'Sitio web',
    inputLabel: 'URL del enlace',
    placeholder: 'https://tu-sitio.com',
    helper: 'Pega la dirección web completa a donde quieres dirigir al cliente.',
  },
  {
    tipo: 'delivery',
    label: 'App de delivery',
    defaultTitle: 'App de delivery',
    inputLabel: 'URL de tu tienda en la app de delivery',
    placeholder: 'https://www.pedidosya.com.pe/...',
    helper: 'Pega el enlace de Rappi, PedidosYa, Didi Food u otra plataforma.',
  },
];

function normalizeEnlaceValue(tipo: EnlaceTipo, raw: string): string {
  const v = raw.trim();
  if (!v) return tipo === 'menu' ? '/menu' : '';
  switch (tipo) {
    case 'whatsapp':
      return formatWhatsappNumber(v);
    case 'instagram':
    case 'tiktok': {
      const u = usuarioSocial(v);
      return u ? `@${u}` : '';
    }
    case 'facebook':
    case 'externo':
    case 'delivery':
      return enlaceWeb(v);
    case 'menu':
      return v.startsWith('#') || v.startsWith('/') ? v : enlaceWeb(v);
  }
}

export default function RedesSocialesTab({ sucursalId: propSucursalId }: { sucursalId?: number | null }) {
  const { data: session } = useSession();
  const { triggerToast, sucursales: todasSucursales, empresa } = useApp();
  const token = session?.accessToken;

  const { sId: fallbackSId, sucursalesLoading } = useSucursalSelector();
  const sId = propSucursalId !== undefined ? propSucursalId : fallbackSId;
  const [enlaces, setEnlaces] = useState<EnlaceItem[]>([]);
  const [horariosRaw, setHorariosRaw] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Modal de agregar / editar enlace
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalTipo, setModalTipo] = useState<EnlaceTipo>('whatsapp');
  const [modalTitulo, setModalTitulo] = useState('');
  const [modalValor, setModalValor] = useState('');

  useEffect(() => {
    if (sId) load(sId);
    else if (!sucursalesLoading) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, sId, sucursalesLoading]);

  const load = (id: number) => {
    if (!token) return;
    setLoading(true);
    setLoadError(false);
    const sucursalTel = todasSucursales.find(s => s.id === id)?.telefono ?? '';
    getConfiguracion(token, id)
      .then(c => {
        setHorariosRaw(c.horariosJson ?? null);
        const parsed = parseEnlacesConfig(c, sucursalTel);
        setEnlaces(parsed);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  const persistEnlaces = async (nextEnlaces: EnlaceItem[], successMsg?: string) => {
    if (!token || !sId) return;
    setSaving(true);
    try {
      let baseHorarios: Record<string, unknown> = {};
      if (horariosRaw) {
        try {
          const parsed = JSON.parse(horariosRaw);
          if (parsed && typeof parsed === 'object') baseHorarios = parsed;
        } catch {}
      }
      const nextHorariosJson = JSON.stringify({
        ...baseHorarios,
        _enlaces: nextEnlaces,
      });

      // Sincroniza también las columnas individuales para compatibilidad total con el backend.
      const findActiveVal = (t: EnlaceTipo) =>
        nextEnlaces.find(e => e.tipo === t && e.activo)?.valor ?? '';

      const waVal = findActiveVal('whatsapp');
      const igVal = usuarioSocial(findActiveVal('instagram'));
      const fbVal = enlaceWeb(findActiveVal('facebook'));
      const tkVal = usuarioSocial(findActiveVal('tiktok'));
      const webVal = enlaceWeb(findActiveVal('externo') || findActiveVal('delivery'));

      await guardarConfiguracion(token, sId, {
        whatsappPedidos: waVal,
        instagram: igVal,
        facebook: fbVal,
        tiktok: tkVal,
        sitioWeb: webVal,
        horariosJson: nextHorariosJson,
      });
      setHorariosRaw(nextHorariosJson);
      setEnlaces(nextEnlaces);
      if (successMsg) triggerToast(successMsg, 'success');
    } catch {
      triggerToast('Error al guardar los enlaces.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (id: string) => {
    const next = enlaces.map(e => (e.id === id ? { ...e, activo: !e.activo } : e));
    setEnlaces(next);
    persistEnlaces(next, 'Estado del botón actualizado.');
  };

  const handleDelete = (id: string) => {
    const next = enlaces.filter(e => e.id !== id);
    setEnlaces(next);
    persistEnlaces(next, 'Botón eliminado.');
  };

  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      return;
    }
    const next = [...enlaces];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    setDragIdx(null);
    setEnlaces(next);
    persistEnlaces(next);
  };

  const openAddModal = (def: SuggestedDef) => {
    const sucursalTel = todasSucursales.find(s => s.id === sId)?.telefono ?? '';
    setEditingId(null);
    setModalTipo(def.tipo);
    setModalTitulo(def.defaultTitle);
    const defaultMenuUrl = typeof window !== 'undefined'
      ? urlMenuPublico({
          origen: window.location.origin,
          subdominio: empresa?.subdominio?.trim() || null,
          sucursalId: sId,
          variasSucursales: todasSucursales.filter(s => s.activo).length > 1,
        })
      : '/menu';
    setModalValor(
      def.tipo === 'whatsapp' && sucursalTel
        ? formatWhatsappNumber(sucursalTel)
        : def.tipo === 'menu'
          ? defaultMenuUrl
          : '',
    );
    setModalOpen(true);
  };

  const openEditModal = (item: EnlaceItem) => {
    setEditingId(item.id);
    setModalTipo(item.tipo);
    setModalTitulo(item.titulo);
    setModalValor(item.valor);
    setModalOpen(true);
  };

  const handleSaveModal = async () => {
    const normalized = normalizeEnlaceValue(modalTipo, modalValor);
    if (!normalized && modalTipo !== 'menu') {
      triggerToast('Completa el dato del enlace antes de guardar.', 'warning');
      return;
    }
    const def = SUGGESTED_LINKS.find(d => d.tipo === modalTipo);
    const tituloFinal = modalTitulo.trim() || def?.defaultTitle || 'Enlace';

    let next: EnlaceItem[];
    if (editingId) {
      next = enlaces.map(e =>
        e.id === editingId
          ? { ...e, titulo: tituloFinal, valor: normalized }
          : e,
      );
    } else {
      const nuevo: EnlaceItem = {
        id: `${modalTipo}-${Date.now()}`,
        tipo: modalTipo,
        titulo: tituloFinal,
        valor: normalized,
        activo: true,
      };
      next = [...enlaces, nuevo];
    }
    setModalOpen(false);
    await persistEnlaces(next, editingId ? 'Botón actualizado.' : 'Botón agregado.');
  };

  const currentSuggestedDef = SUGGESTED_LINKS.find(d => d.tipo === modalTipo) ?? SUGGESTED_LINKS[0];
  const hasWhatsappInList = enlaces.some(e => e.tipo === 'whatsapp');
  const visibleSuggested = SUGGESTED_LINKS.filter(
    s => s.tipo !== 'whatsapp' || !hasWhatsappInList,
  );

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-semibold text-slate-600">Cargando enlaces y redes sociales...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-semibold text-slate-700">No se pudieron cargar tus redes sociales.</p>
        <p className="text-xs text-slate-500">Para no pisar lo que ya tenías guardado, no se muestra el formulario vacío.</p>
        <Button onClick={() => sId && load(sId)}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Banner informativo */}
      <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 px-5 py-4 text-sm text-blue-700 leading-relaxed">
        Configura los botones que aparecerán en tu página de bienvenida. Los clientes podrán acceder a tu menú, WhatsApp, redes sociales y más desde un solo lugar.
      </div>

      {/* Lista de botones configurados */}
      {enlaces.length > 0 && (
        <div className="space-y-3">
          {enlaces.map((item, idx) => {
            const vis = getEnlaceVisuals(item.tipo);
            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-2xs flex items-center gap-3.5 transition-all"
              >
                {/* Icono de reordenar (=) */}
                <span
                  className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0 flex flex-col gap-1 px-1"
                  title="Arrastra para reordenar"
                >
                  <span className="block w-3.5 h-0.5 rounded-full bg-current" />
                  <span className="block w-3.5 h-0.5 rounded-full bg-current" />
                </span>

                {/* Icono del enlace */}
                <span
                  className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${vis.iconBoxBg}`}
                >
                  {vis.icon}
                </span>

                {/* Título + etiqueta + valor */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-semibold text-slate-900 truncate">
                      {item.titulo || vis.typeName}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${vis.badgeBg}`}
                    >
                      {vis.typeName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {item.valor || (item.tipo === 'menu' ? 'Carta digital' : '')}
                  </p>
                </div>

                {/* Acciones: switch + editar + eliminar */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.activo}
                    onClick={() => handleToggle(item.id)}
                    disabled={saving}
                    title={item.activo ? 'Visible en el menú público' : 'Oculto en el menú público'}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none ${
                      item.activo ? 'bg-indigo-500' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${
                        item.activo ? 'translate-x-5.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    disabled={saving}
                    title="Editar botón"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <SquarePen className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={saving}
                    title="Eliminar botón"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enlaces sugeridos */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <h4 className="text-sm font-bold text-slate-800 mb-4">Enlaces sugeridos</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {visibleSuggested.map(sug => {
            const vis = getEnlaceVisuals(sug.tipo);
            return (
              <button
                key={sug.tipo}
                type="button"
                onClick={() => openAddModal(sug)}
                disabled={saving}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 px-3.5 py-3 text-left transition-all cursor-pointer"
              >
                <span
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${vis.iconBoxBg}`}
                >
                  {vis.icon}
                </span>
                <span className="text-sm font-medium text-slate-700 leading-snug">
                  {sug.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal para agregar / editar botón */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? `Editar ${currentSuggestedDef.label}` : `Agregar ${currentSuggestedDef.label}`}
        subtitle="Configura los datos del botón que verán tus clientes en el menú público."
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveModal} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pt-1">
          <Input
            label="Título del botón"
            value={modalTitulo}
            onChange={e => setModalTitulo(e.target.value)}
            placeholder={currentSuggestedDef.defaultTitle}
          />
          <div className="space-y-1.5">
            <Input
              label={currentSuggestedDef.inputLabel}
              value={modalValor}
              onChange={e => setModalValor(e.target.value)}
              placeholder={currentSuggestedDef.placeholder}
              autoFocus
            />
            {currentSuggestedDef.helper && (
              <p className="text-[11px] text-slate-500">{currentSuggestedDef.helper}</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
