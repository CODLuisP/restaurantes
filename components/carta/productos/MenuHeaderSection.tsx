"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronLeft, ChevronRight, Image as ImageIcon, MapPin, Phone, Store,
} from "lucide-react";
import { Modal, Button, Input, SucursalSelector } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { useBusiness } from "@/context/BusinessContext";
import { ProfileHeader, type ProfileTab } from "@/components/menu/ProfileHeader";
import { buildSocialLinks, SocialLinksRow } from "@/components/menu/SocialLinksRow";
import { BusinessInfoSection } from "@/components/menu/BusinessInfoSection";
import type { SucursalOption } from "@/hooks/useSucursalSelector";
import { getSucursalById, updateSucursal } from "@/lib/api/sucursales";
import { getConfiguracion, updateConfiguracion } from "@/lib/api/configuracion";
import { getBanners } from "@/lib/api/banners";
import type { BannerDto } from "@/types/banners";
import {
  resizeImageToBlob, extractCloudflareImageId, subirImagenProducto, eliminarImagenProductoCloudflare,
} from "@/lib/uploadImagen";

interface MenuHeaderSectionProps {
  sucursalId: number | null;
  isSuperAdmin: boolean;
  sucursales: SucursalOption[];
  onSucursalChange: (id: number) => void;
  onGoToBanners?: () => void;
  catTabs: ProfileTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

/** Cabecera del menú digital: banners/cover, datos del negocio, redes sociales y horarios. */
export default function MenuHeaderSection({
  sucursalId, isSuperAdmin, sucursales, onSucursalChange, onGoToBanners,
  catTabs, activeTab, onTabChange,
}: MenuHeaderSectionProps) {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const { business } = useBusiness();
  const token = session?.accessToken;

  const [sucursalNombre, setSucursalNombre] = useState("");
  const [sucursalDireccion, setSucursalDireccion] = useState("");
  const [sucursalTelefono, setSucursalTelefono] = useState("");
  const [sucursalLogo, setSucursalLogo] = useState("");
  const [redesState, setRedesState] = useState({ instagram: "", facebook: "", tiktok: "", sitio: "", reviewsLink: "" });
  const [horariosState, setHorariosState] = useState({
    zonaHoraria: "Peru (Lima)", tipoNegocio: "Restaurante", descripcionCompleta: "", numeroPedidos: "",
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
  const activeBanners = banners.filter((b) => b.activo);
  const socialLinks = buildSocialLinks(redesState);

  useEffect(() => {
    if (!token || !sucursalId) return;
    getSucursalById(token, sucursalId).then((s) => {
      setSucursalNombre(s.nombre);
      setSucursalDireccion(s.direccion ?? "");
      setSucursalTelefono(s.telefono ?? "");
    }).catch(() => {});
    getConfiguracion(token, sucursalId).then((c) => {
      setSucursalLogo(c.logoUrl ?? "");
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
        descripcionCompleta: c.descripcionCompleta ?? "",
        numeroPedidos: c.whatsappPedidos ?? "",
        schedule: c.horariosJson ? JSON.parse(c.horariosJson) : {},
      });
    }).catch(() => {});
    getBanners(token, sucursalId).then(setBanners).catch(() => {});
  }, [token, sucursalId]);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [bizForm, setBizForm] = useState({ name: "", address: "", telefono: "" });

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!token || !sucursalId) return;

    try {
      triggerToast("Subiendo logo...", "info");
      const blob = await resizeImageToBlob(file, 400, 400, 0.8);
      const subida = await subirImagenProducto(blob);

      let igv = 18;
      let moneda = "S/.";
      try {
        const c = await getConfiguracion(token, sucursalId);
        igv = c.igvPorcentaje;
        moneda = c.monedaSimbolo;
        if (c.logoUrl) {
          const idAnterior = extractCloudflareImageId(c.logoUrl);
          if (idAnterior) eliminarImagenProductoCloudflare(idAnterior);
        }
      } catch { /* primera vez */ }

      await updateConfiguracion(token, sucursalId, {
        igvPorcentaje: igv,
        monedaSimbolo: moneda,
        logoUrl: subida.url,
      });
      setSucursalLogo(subida.url);
      triggerToast("Logo actualizado.", "success");
    } catch {
      triggerToast("No se pudo subir el logo.", "error");
    }
    e.target.value = "";
  };

  const openBusinessForm = () => {
    setBizForm({ name: sucursalNombre, address: sucursalDireccion, telefono: sucursalTelefono });
    setShowBusinessForm(true);
  };

  const submitBusinessForm = async () => {
    if (!token || !sucursalId) return;
    try {
      await updateSucursal(token, sucursalId, {
        nombre: bizForm.name.trim(),
        direccion: bizForm.address.trim() || null,
        telefono: bizForm.telefono.trim() || null,
        activo: true,
      });
      setSucursalNombre(bizForm.name.trim());
      setSucursalDireccion(bizForm.address.trim());
      setSucursalTelefono(bizForm.telefono.trim());
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
      <div
        onClick={openBusinessForm}
        className="flex items-center gap-1.5 flex-wrap truncate group/sub cursor-pointer"
        title="Haz clic para editar la dirección y teléfono del negocio"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover/sub:text-brand transition-colors" />
        {sucursalDireccion ? (
          <span className="group-hover/sub:text-slate-900 transition-colors">{sucursalDireccion}</span>
        ) : (
          <span className="text-amber-600 font-medium hover:underline text-xs">
            + Agrega la dirección del negocio
          </span>
        )}
        {(sucursalDireccion || sucursalTelefono) && (
          <span className="text-slate-300 mx-0.5">—</span>
        )}
        {sucursalTelefono ? (
          <span className="text-slate-500 text-xs flex items-center gap-1 group-hover/sub:text-slate-900 transition-colors">
            <Phone className="h-3 w-3 text-slate-400 group-hover/sub:text-brand transition-colors" />
            {sucursalTelefono}
          </span>
        ) : (
          <span className="text-amber-600 font-medium hover:underline text-xs">
            + Agrega teléfono
          </span>
        )}
      </div>
    </div>
  );

  const headerActions = (
    <div className="flex items-center gap-3">
      {socialLinks.length > 0 && <SocialLinksRow links={socialLinks} />}
      <BusinessInfoSection
        tipoNegocio={horariosState.tipoNegocio}
        descripcionCompleta={horariosState.descripcionCompleta}
        schedule={horariosState.schedule}
        numeroPedidos={horariosState.numeroPedidos}
        direccion={business.mostrarDireccionEnMenu ? business.ubicacionDireccion : ""}
      />
    </div>
  );

  return (
    <div className="mb-6">
      <SucursalSelector visible={isSuperAdmin} sucursales={sucursales} sId={sucursalId} onChange={onSucursalChange} />
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
        subtitle="Edita el nombre, dirección y teléfono que verán tus clientes en la carta digital."
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
            placeholder="Ej: Paykos Chicken"
            autoFocus
            iconLeft={<Store className="h-4 w-4 text-slate-400" />}
          />
          <Input
            label="Dirección"
            value={bizForm.address}
            onChange={(e) => setBizForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Ej: Vía de Evitamiento Nte. 1850, Cajamarca"
            iconLeft={<MapPin className="h-4 w-4 text-slate-400" />}
          />
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
