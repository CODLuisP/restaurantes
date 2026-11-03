"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ChevronLeft, ChevronRight, ExternalLink, Image as ImageIcon, MapPin, Phone, Store,
} from "lucide-react";
import { Modal, Button, Input } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { getTodayDayKey } from "@/context/HorariosContext";
import { ProfileHeader, type ProfileTab } from "@/components/menu/ProfileHeader";
import { buildSocialLinks, SocialLinksRow } from "@/components/menu/SocialLinksRow";
import { BusinessInfoSection } from "@/components/menu/BusinessInfoSection";
import { updateSucursal } from "@/lib/api/sucursales";
import { getConfiguracion, guardarConfiguracion } from "@/lib/api/configuracion";
import { getBanners } from "@/lib/api/banners";
import type { BannerDto } from "@/types/banners";
import {
  resizeImageToBlob, extractCloudflareImageId, subirImagenProducto, eliminarImagenProductoCloudflare,
} from "@/lib/uploadImagen";

interface MenuHeaderSectionProps {
  sucursalId: number | null;
  onGoToBanners?: () => void;
  catTabs: ProfileTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

/** Un horariosJson corrupto no debe impedir que cargue el resto de la cabecera. */
function parseHorarios(json?: string | null) {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

/** Cabecera del menú digital: banners/cover, datos del negocio, redes sociales y horarios. */
export default function MenuHeaderSection({
  sucursalId, onGoToBanners,
  catTabs, activeTab, onTabChange,
}: MenuHeaderSectionProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { triggerToast, sucursales, setSucursales } = useApp();
  const token = session?.accessToken;

  const [sucursalNombre, setSucursalNombre] = useState("");
  const [ubicacionDireccion, setUbicacionDireccion] = useState("");
  const [mostrarDireccionMenu, setMostrarDireccionMenu] = useState(false);
  const [sucursalTelefono, setSucursalTelefono] = useState("");
  const [sucursalLogo, setSucursalLogo] = useState("");
  const [horariosJsonRaw, setHorariosJsonRaw] = useState("");
  const [redesState, setRedesState] = useState({ instagram: "", facebook: "", tiktok: "", sitio: "", reviewsLink: "" });
  const [horariosState, setHorariosState] = useState({
    zonaHoraria: "Peru (Lima)", tipoNegocio: "Restaurante", descripcionCorta: "", descripcionCompleta: "", numeroPedidos: "",
    schedule: {
      lun: { enabled: true, ranges: [{ from: "09:00", to: "22:00" }] },
      mar: { enabled: true, ranges: [{ from: "09:00", to: "22:00" }] },
      mie: { enabled: true, ranges: [{ from: "09:00", to: "22:00" }] },
      jue: { enabled: true, ranges: [{ from: "09:00", to: "22:00" }] },
      vie: { enabled: true, ranges: [{ from: "09:00", to: "22:00" }] },
      sab: { enabled: true, ranges: [{ from: "09:00", to: "22:00" }] },
      dom: { enabled: false, ranges: [{ from: "09:00", to: "22:00" }] },
    } as Record<string, { enabled: boolean; ranges: { from: string; to: string }[] }>,
  });
  const [banners, setBanners] = useState<BannerDto[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const todayKey = getTodayDayKey();
  const activeBanners = banners.filter(
    (b) => b.activo && (!b.programacionHoraria || b.dias.length === 0 || b.dias.includes(todayKey)),
  );
  const socialLinks = buildSocialLinks(
    {
      ...redesState,
      whatsappPedidos: horariosState.numeroPedidos,
      horariosJson: horariosJsonRaw,
    },
    sucursalTelefono,
  );

  const direccionActiva = mostrarDireccionMenu && ubicacionDireccion.trim().length > 0;
  const sucursalDireccion = direccionActiva ? ubicacionDireccion.trim() : "";

  /* Nombre y teléfono salen de las sucursales ya cargadas en AppContext;
     la dirección se obtiene de Configuración → Ubicación (ubicacionDireccion + mostrarDireccionMenu). */
  useEffect(() => {
    const s = sucursales.find((x) => x.id === sucursalId);
    if (!s) return;
    setSucursalNombre(s.nombre);
    setSucursalTelefono(s.telefono ?? "");
  }, [sucursales, sucursalId]);

  useEffect(() => {
    if (!token || !sucursalId) return;
    getConfiguracion(token, sucursalId).then((c) => {
      setSucursalLogo(c.logoUrl ?? "");
      setUbicacionDireccion((c.ubicacionDireccion ?? "").trim());
      setMostrarDireccionMenu(!!c.mostrarDireccionMenu);
      setHorariosJsonRaw(c.horariosJson ?? "");
      setRedesState({
        instagram: c.instagram ?? "",
        facebook: c.facebook ?? "",
        tiktok: c.tiktok ?? "",
        sitio: c.sitioWeb ?? "",
        reviewsLink: c.reviewsLink ?? "",
      });
      setHorariosState({
        zonaHoraria: c.zonaHoraria ?? "Peru (Lima)",
        tipoNegocio: c.tipoNegocio ?? "Restaurante",
        descripcionCorta: c.descripcionCorta ?? "",
        descripcionCompleta: c.descripcionCompleta ?? "",
        numeroPedidos: c.whatsappPedidos ?? "",
        schedule: parseHorarios(c.horariosJson),
      });
    }).catch(() => {});
    getBanners(token, sucursalId).then(setBanners).catch(() => {});
  }, [token, sucursalId]);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [bizForm, setBizForm] = useState({ name: "", telefono: "" });

  const goToUbicacion = () => {
    setShowBusinessForm(false);
    router.push("/configuracion/negocio?tab=ubicacion");
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!token || !sucursalId) return;

    try {
      triggerToast("Subiendo logo...", "info");
      const blob = await resizeImageToBlob(file, 400, 400, 0.8);
      const subida = await subirImagenProducto(blob);

      // El logo anterior solo se borra de Cloudflare cuando el nuevo ya quedó guardado:
      // si guardar falla, la configuración sigue apuntando a una imagen que existe.
      let idAnterior: string | null = null;
      try {
        const c = await getConfiguracion(token, sucursalId);
        if (c.logoUrl) idAnterior = extractCloudflareImageId(c.logoUrl);
      } catch { /* primera vez */ }

      try {
        await guardarConfiguracion(token, sucursalId, { logoUrl: subida.url });
      } catch (err) {
        eliminarImagenProductoCloudflare(subida.imageId);
        throw err;
      }
      if (idAnterior) eliminarImagenProductoCloudflare(idAnterior);
      setSucursalLogo(subida.url);
      triggerToast("Logo actualizado.", "success");
    } catch {
      triggerToast("No se pudo subir el logo.", "error");
    }
    e.target.value = "";
  };

  const openBusinessForm = () => {
    setBizForm({ name: sucursalNombre, telefono: sucursalTelefono });
    setShowBusinessForm(true);
  };

  const submitBusinessForm = async () => {
    if (!token || !sucursalId) return;
    try {
      const actual = sucursales.find((x) => x.id === sucursalId);
      const actualizada = await updateSucursal(token, sucursalId, {
        nombre: bizForm.name.trim(),
        codEstablecimiento: actual?.codEstablecimiento ?? null,
        direccion: actual?.direccion ?? null,
        telefono: bizForm.telefono.trim() || null,
        // Conserva el estado actual: editar el nombre/teléfono no debe reactivar una sucursal inactiva.
        activo: actual?.activo ?? true,
      });
      // Se refleja en AppContext para que el resto de vistas vea el cambio (y este header, vía el efecto).
      setSucursales((prev) => prev.map((x) => (x.id === sucursalId ? actualizada : x)));
      setShowBusinessForm(false);
      triggerToast("Información del negocio actualizada.", "success");
    } catch {
      triggerToast("Error al guardar la información.", "error");
    }
  };

  const cover = (
    <>
      {activeBanners.length > 0 ? (
        <>
          {(() => {
            const current = activeBanners[bannerIndex % activeBanners.length];
            return current.imagenUrl ? (
              <img
                src={current.imagenUrl}
                alt={current.titulo || "Banner"}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div
                className={`absolute inset-0 bg-linear-to-br ${current.gradient ?? "from-slate-900 to-slate-700"}`}
              />
            );
          })()}
          <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />
          <span className="absolute top-3 left-3 text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/40 text-white/80 backdrop-blur-sm">
            {(bannerIndex % activeBanners.length) + 1} / {activeBanners.length}
          </span>
          {activeBanners.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setBannerIndex(
                    (i) => (i - 1 + activeBanners.length) % activeBanners.length,
                  )
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                aria-label="Banner anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setBannerIndex((i) => (i + 1) % activeBanners.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                aria-label="Siguiente banner"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {activeBanners.map((b, i) => (
                  <span
                    key={b.id}
                    className={`h-1.5 rounded-full transition-all ${i === bannerIndex % activeBanners.length ? "w-5 bg-white" : "w-1.5 bg-white/40"}`}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={onGoToBanners}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/50 hover:text-white/70 transition-colors"
        >
          <ImageIcon className="h-6 w-6" />
          <span className="text-xs font-medium">
            Aún no tienes banners activos — agrega uno
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={onGoToBanners}
        className="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/90 text-slate-700 hover:bg-white transition-colors shadow-sm cursor-pointer"
      >
        <ImageIcon className="h-3.5 w-3.5" /> Banners
      </button>
    </>
  );

  const headerSubtitle = (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 flex-wrap truncate">
        {sucursalDireccion ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openBusinessForm();
            }}
            className="flex items-center gap-1.5 truncate group/sub cursor-pointer"
            title="Ver información del negocio"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover/sub:text-brand transition-colors" />
            <span className="group-hover/sub:text-slate-900 transition-colors truncate">
              {sucursalDireccion}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToUbicacion();
            }}
            className="flex items-center gap-1.5 text-amber-600 font-medium hover:underline text-xs cursor-pointer"
            title="Ir a Configuración → Ubicación para definir y activar la dirección"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>+ Establecer dirección del negocio</span>
          </button>
        )}
        <span className="text-slate-300 mx-0.5">—</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openBusinessForm();
          }}
          className="cursor-pointer group/tel flex items-center gap-1"
          title="Haz clic para editar el teléfono del negocio"
        >
          {sucursalTelefono ? (
            <span className="text-slate-500 text-xs flex items-center gap-1 group-hover/tel:text-slate-900 transition-colors">
              <Phone className="h-3 w-3 text-slate-400 group-hover/tel:text-brand transition-colors" />
              {sucursalTelefono}
            </span>
          ) : (
            <span className="text-amber-600 font-medium hover:underline text-xs">
              + Agrega teléfono
            </span>
          )}
        </button>
      </div>
    </div>
  );

  const headerActions = (
    <div className="flex items-center gap-3">
      {socialLinks.length > 0 && <SocialLinksRow links={socialLinks} />}
      <BusinessInfoSection
        tipoNegocio={horariosState.tipoNegocio}
        descripcionCorta={horariosState.descripcionCorta}
        descripcionCompleta={horariosState.descripcionCompleta}
        schedule={horariosState.schedule}
        numeroPedidos={horariosState.numeroPedidos || sucursalTelefono}
        direccion={sucursalDireccion}
        telefono={sucursalTelefono}
        socialLinks={socialLinks}
      />
    </div>
  );

  return (
    <div className="mb-6">
      <ProfileHeader
        cover={cover}
        logo={sucursalLogo}
        avatarEditable
        onAvatarClick={() => logoInputRef.current?.click()}
        name={sucursalNombre || "Configura el nombre de tu negocio"}
        nameMuted={!sucursalNombre}
        nameEditable
        onNameClick={openBusinessForm}
        subtitle={headerSubtitle}
        headerActions={headerActions}
        tabs={catTabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        onChange={handleLogoChange}
        className="hidden"
      />

      <Modal
        open={showBusinessForm}
        onClose={() => setShowBusinessForm(false)}
        title="Información del negocio"
        subtitle="Edita el nombre y teléfono que verán tus clientes en la carta digital."
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBusinessForm(false)}>
              Cancelar
            </Button>
            <Button onClick={submitBusinessForm} disabled={!bizForm.name.trim()}>
              Guardar cambios
            </Button>
          </>
        }
      >
        <div className="space-y-4 pt-1">
          <Input
            label="Nombre del negocio"
            value={bizForm.name}
            onChange={(e) => setBizForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Mi Restaurante"
            autoFocus
            iconLeft={<Store className="h-4 w-4 text-slate-400" />}
          />
          <div className="space-y-1.5">
            <div
              onClick={!direccionActiva ? goToUbicacion : undefined}
              className={!direccionActiva ? "cursor-pointer" : undefined}
            >
              <Input
                label="Dirección"
                value={sucursalDireccion}
                disabled
                readOnly
                placeholder={
                  ubicacionDireccion
                    ? "Dirección desactivada en el menú"
                    : "Sin dirección configurada en Ubicación"
                }
                iconLeft={<MapPin className="h-4 w-4 text-slate-400" />}
                className="bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
            {!direccionActiva ? (
              <button
                type="button"
                onClick={goToUbicacion}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-800 text-xs font-semibold transition-colors cursor-pointer text-left"
              >
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  {ubicacionDireccion
                    ? "No está activa en el menú — ir a Ubicación para activarla"
                    : "Ir a Ubicación para establecer la dirección"}
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              </button>
            ) : (
              <button
                type="button"
                onClick={goToUbicacion}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline cursor-pointer"
              >
                Editar o desactivar dirección en Configuración → Ubicación
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
          <Input
            label="Teléfono de contacto"
            value={bizForm.telefono}
            onChange={(e) => setBizForm((f) => ({ ...f, telefono: e.target.value }))}
            placeholder="Ej: 912903330"
            iconLeft={<Phone className="h-4 w-4 text-slate-400" />}
          />
        </div>
      </Modal>
    </div>
  );
}
