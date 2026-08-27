"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Utensils,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  ShoppingCart,
  Search,
  X,
  CalendarOff,
} from "lucide-react";
import {
  buildSocialLinks,
  SocialLinksRow,
} from "@/components/menu/SocialLinksRow";
import { BusinessInfoSection } from "@/components/menu/BusinessInfoSection";
import {
  ProfileHeader,
  type ProfileTab,
} from "@/components/menu/ProfileHeader";
import type { OrderItem } from "@/types";
import { useCheckoutForm } from "@/hooks/menu/useCheckoutForm";
import { usePlaceOrder } from "@/hooks/menu/usePlaceOrder";
import CheckoutModal from "@/components/menu/publico/CheckoutModal";
import OrderSuccessModal from "@/components/menu/publico/OrderSuccessModal";
import PublicCategory from "@/components/menu/publico/PublicCategory";
import {
  CATEGORY_ICON_BG,
  productoToCartItem,
  type ProductoMenu,
  type CategoriaMenu,
  type BannerPublico,
} from "@/components/menu/publico/types";
import {
  getBannersPublico,
  getMenuPublico,
  getConfiguracionPublica,
  getSucursalPublica,
  getCierresPublico,
} from "@/lib/api/publico";
import {
  DEFAULT_METODOS_PAGO, DEFAULT_METODOS_ENTREGA, parseMetodosPago, parseMetodosEntrega,
  type MetodosPago, type MetodosEntrega,
} from "@/lib/config/metodos";

/** Vista pública de la carta con autoservicio para clientes. */
export default function PublicMenu({
  mesaLabel,
  mesaToken,
  sucursalId = 1,
}: {
  mesaLabel?: string;
  mesaToken?: string;
  sucursalId?: number;
}) {
  const [productos, setProductos] = useState<ProductoMenu[]>([]);
  const [categorias, setCategorias] = useState<CategoriaMenu[]>([]);
  const [banners, setBanners] = useState<BannerPublico[]>([]);
  const [bizName, setBizName] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [bizLogo, setBizLogo] = useState("");
  const [redes, setRedes] = useState({
    instagram: "",
    facebook: "",
    tiktok: "",
    sitio: "",
    reviewsLink: "",
  });
  const [horarios, setHorarios] = useState({
    zonaHoraria: "Peru (Lima)",
    tipoNegocio: "Restaurante",
    descripcionCorta: "",
    descripcionCompleta: "",
    whatsappPedidos: "",
    schedule: {} as Record<string, any>,
  });
  const [cierres, setCierres] = useState<
    { motivo: string; desde: string; hasta: string }[]
  >([]);
  const [metodosPago, setMetodosPago] = useState<MetodosPago>(DEFAULT_METODOS_PAGO);
  const [metodosEntrega, setMetodosEntrega] = useState<MetodosEntrega>(DEFAULT_METODOS_ENTREGA);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("todos");
  const [time, setTime] = useState("");

  // Estados del Buscador y del Carrito
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isOrderSuccess, setIsOrderSuccess] = useState(false);
  const [lastPlacedOrderId, setLastPlacedOrderId] = useState("");

  /* Formulario de checkout (datos del cliente, comprobante y pago) */
  const form = useCheckoutForm(mesaLabel);
  const { paymentMethod } = form;

  /* Carga desde API pública: productos, categorías, banners, config, sucursal, cierres. */
  useEffect(() => {
    getBannersPublico(sucursalId)
      .then(setBanners)
      .catch(() => {});
    getMenuPublico(sucursalId)
      .then((data) => {
        setProductos(data.productos ?? []);
        setCategorias(data.categorias ?? []);
      })
      .catch(() => {});
    getConfiguracionPublica(sucursalId)
      .then((c) => {
        setBizLogo(c.logoUrl ?? "");
        setRedes({
          instagram: c.instagram ?? "",
          facebook: c.facebook ?? "",
          tiktok: c.tiktok ?? "",
          sitio: c.sitioWeb ?? "",
          reviewsLink: c.reviewsLink ?? "",
        });
        setHorarios({
          zonaHoraria: c.zonaHoraria ?? "Peru (Lima)",
          tipoNegocio: c.tipoNegocio ?? "Restaurante",
          descripcionCorta: c.descripcionCorta ?? "",
          descripcionCompleta: c.descripcionCompleta ?? "",
          whatsappPedidos: c.whatsappPedidos ?? "",
          schedule: c.horariosJson ? JSON.parse(c.horariosJson) : {},
        });
        setMetodosPago(parseMetodosPago(c.metodosPagoJson));
        setMetodosEntrega(parseMetodosEntrega(c.metodosEntregaJson));
      })
      .catch(() => {});
    getSucursalPublica(sucursalId)
      .then((s) => {
        setBizName(s.nombre ?? "");
        setBizAddress(s.direccion ?? "");
      })
      .catch(() => {});
    getCierresPublico(sucursalId)
      .then((d) => setCierres(Array.isArray(d) ? d : []))
      .catch(() => setCierres([]));
  }, [sucursalId]);

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      );
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  const activeBanners = banners;

  const cierreActivo = cierres.find((c) => {
    const ahora = new Date();
    return new Date(c.desde) <= ahora && new Date(c.hasta) >= ahora;
  });

  const allCategories = useMemo(() => {
    return categorias.sort((a, b) => a.orden - b.orden).map((c) => c.nombre);
  }, [categorias]);

  const availableItems = useMemo(() => productos, [productos]);

  // Filtrado de productos basado en el buscador
  const searchedItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableItems;
    return availableItems.filter(
      (i) =>
        i.nombre.toLowerCase().includes(q) ||
        i.descripcion.toLowerCase().includes(q),
    );
  }, [search, availableItems]);

  const featuredItems = searchedItems.filter((i) => false); // featured no existe en API aún
  const groupedCategories = allCategories
    .map((category) => ({
      category,
      items: searchedItems.filter((i) => i.categoriaNombre === category),
    }))
    .filter((g) => g.items.length > 0);

  const toggle = (key: string) =>
    setCollapsed((s) => ({ ...s, [key]: !s[key] }));
  const bizNameDisplay = bizName?.trim() || "Carta del Día";

  /* Pestañas: Todos + Destacados + cada categoría con platos */
  const tabs: ProfileTab[] = [
    { id: "todos", label: "Carta", count: searchedItems.length },
    ...(featuredItems.length > 0
      ? [{ id: "destacados", label: "Destacados", count: featuredItems.length }]
      : []),
    ...groupedCategories.map((g) => ({
      id: g.category,
      label: g.category,
      count: g.items.length,
    })),
  ];
  const tab = tabs.some((t) => t.id === activeTab) ? activeTab : "todos";

  const showFeatured =
    featuredItems.length > 0 && (tab === "todos" || tab === "destacados");
  const visibleGroups =
    tab === "todos"
      ? groupedCategories
      : tab === "destacados"
        ? []
        : groupedCategories.filter((g) => g.category === tab);

  const addToCart = (product: ProductoMenu) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === String(product.id));
      if (existing) {
        return prev.map((i) =>
          i.product.id === String(product.id)
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [...prev, { product: productoToCartItem(product), quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId
            ? { ...i, quantity: i.quantity + delta }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };

  const cartTotal = cart.reduce(
    (acc, i) => acc + i.product.price * i.quantity,
    0,
  );
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  const { handleConfirmOrder, submitting } = usePlaceOrder({
    form,
    cart,
    setCart,
    mesaToken,
    sucursalId,
    onSuccess: (orderId) => {
      setLastPlacedOrderId(orderId);
      setShowCheckout(false);
      setIsOrderSuccess(true);
    },
  });

  /* Portada (carrusel de banners) */
  const cover = (
    <>
      {activeBanners.length > 0 ? (
        <>
          {(() => {
            const current = activeBanners[bannerIndex % activeBanners.length];
            return current.imagenUrl ? (
              <img
                src={current.imagenUrl}
                alt="Banner"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div
                className={`absolute inset-0 bg-linear-to-br ${current.gradient ?? "from-slate-900 to-slate-700"}`}
              />
            );
          })()}
          <div className="absolute inset-0 bg-linear-to-t from-black/25 via-transparent to-transparent" />
          {activeBanners.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setBannerIndex(
                    (i) =>
                      (i - 1 + activeBanners.length) % activeBanners.length,
                  )
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                aria-label="Banner anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setBannerIndex((i) => (i + 1) % activeBanners.length)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                aria-label="Siguiente banner"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {activeBanners.map((b, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === bannerIndex % activeBanners.length ? "w-5 bg-white" : "w-1.5 bg-white/40"}`}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/40">
          <Utensils className="h-8 w-8" />
        </div>
      )}

      {/* Mesa + hora */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {mesaLabel && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/90 text-slate-700 inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 text-brand" /> {mesaLabel}
          </span>
        )}
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-black/40 text-white/80 inline-flex items-center gap-1 backdrop-blur-sm">
          <Clock className="h-3 w-3" /> {time}
        </span>
      </div>
    </>
  );

  const subtitle = (
    <div className="space-y-0.5">
      {bizAddress && (
        <p className="flex items-center gap-1 truncate">
          <MapPin className="h-3 w-3 shrink-0 text-slate-400" /> {bizAddress}
        </p>
      )}
      {!bizAddress && <p>Restaurante · Carta del Día</p>}
    </div>
  );

  const socialLinks = buildSocialLinks(redes);
  const headerActions = (
    <div className="flex items-center gap-3">
      {socialLinks.length > 0 && <SocialLinksRow links={socialLinks} />}
      <BusinessInfoSection
        tipoNegocio={horarios.tipoNegocio}
        descripcionCorta={horarios.descripcionCorta}
        descripcionCompleta={horarios.descripcionCompleta}
        schedule={horarios.schedule}
        numeroPedidos={horarios.whatsappPedidos}
        direccion={bizAddress}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9fafb] selection:bg-brand selection:text-white pb-20 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-0 pb-6">
        <ProfileHeader
          cover={cover}
          logo={bizLogo}
          name={bizNameDisplay}
          subtitle={subtitle}
          headerActions={headerActions}
          tabs={tabs}
          activeTab={tab}
          onTabChange={setActiveTab}
          coverFullBleed
        />

        {cierreActivo && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <CalendarOff className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {cierreActivo.motivo}
              </p>
              <p className="text-[11px] text-amber-600">
                {new Date(cierreActivo.desde).toLocaleString("es-PE")} —{" "}
                {new Date(cierreActivo.hasta).toLocaleString("es-PE")}
              </p>
            </div>
          </div>
        )}

        {/* ── Buscador de Platos ── */}
        <div className="relative mt-6 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por plato, bebida o ingrediente..."
            className="input w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 focus:border-brand"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
              aria-label="Limpiar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Platos ── */}
        <div className="space-y-3 mt-6">
          {showFeatured && (
            <PublicCategory
              title="Destacados"
              items={featuredItems}
              cart={cart}
              onAdd={addToCart}
              onUpdateQty={updateCartQty}
              collapsed={!!collapsed.destacados}
              onToggle={() => toggle("destacados")}
              highlight
              icon={<Star className="h-4 w-4 text-white fill-white" />}
              iconBg="bg-gradient-to-br from-amber-400 to-fuchsia-500"
            />
          )}

          {visibleGroups.map(({ category, items }) => (
            <PublicCategory
              key={category}
              title={category}
              items={items}
              cart={cart}
              onAdd={addToCart}
              onUpdateQty={updateCartQty}
              collapsed={!!collapsed[category]}
              onToggle={() => toggle(category)}
              icon={<Utensils className="h-4 w-4" />}
              iconBg={CATEGORY_ICON_BG[category] ?? "bg-gray-100 text-gray-600"}
            />
          ))}

          {!showFeatured && visibleGroups.length === 0 && (
            <div className="border border-dashed border-slate-300 rounded-xl py-12 text-center bg-white">
              <Utensils className="h-6 w-6 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-450">
                No se encontraron platos que coincidan con la búsqueda.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-8 pb-4 text-center">
          <p className="text-[10px] text-gray-400 font-medium">
            Los precios incluyen IGV
            {bizName ? ` • ${bizName}` : ""}
          </p>
          <p className="text-[10px] text-gray-300 font-bold mt-1">
            Carta digital actualizada en tiempo real
          </p>
        </div>
      </div>

      {/* ── Botón Flotante del Carrito ── */}
      {cartCount > 0 && (
        <button
          onClick={() => setShowCheckout(true)}
          className="fixed bottom-6 right-6 bg-brand hover:bg-brand-hover text-white px-5 py-4 rounded-full shadow-xl flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 z-45 font-bold cursor-pointer"
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-2.5 -right-2.5 bg-red-500 text-white text-[9px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-brand font-mono leading-none">
              {cartCount}
            </span>
          </div>
          <span className="text-sm">Ver Pedido</span>
          <span className="pl-2 border-l border-white/20 text-sm font-mono font-bold">
            S/. {cartTotal.toFixed(2)}
          </span>
        </button>
      )}

      <CheckoutModal
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        form={form}
        cart={cart}
        cartTotal={cartTotal}
        onUpdateCartQty={updateCartQty}
        onPlaceOrder={handleConfirmOrder}
        submitting={submitting}
        mesaLabel={mesaLabel}
        metodosPago={metodosPago}
        metodosEntrega={metodosEntrega}
      />

      <OrderSuccessModal
        open={isOrderSuccess}
        onClose={() => setIsOrderSuccess(false)}
        orderId={lastPlacedOrderId}
        orderType={form.orderType}
        paymentMethod={paymentMethod}
      />
    </div>
  );
}
