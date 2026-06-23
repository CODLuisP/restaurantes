'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Search, PlusCircle, Trash2, Download, ChevronRight, Star } from 'lucide-react';
import { Button }        from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge }         from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { Modal }         from '@/components/ui/Modal';
import { Spinner, LoadingOverlay } from '@/components/ui/Spinner';
import {
  Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard, SkeletonKPI,
} from '@/components/ui/Skeleton';
import { Alert }         from '@/components/ui/Alert';

/* ── Section wrapper ──────────────────────────────────────────── */
function Section({ id, title, subtitle, children }: {
  id: string; title: string; subtitle: string; children: ReactNode;
}) {
  return (
    <section id={id} className="space-y-4 scroll-mt-20">
      <div className="pb-2 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

/* ── Code snippet ─────────────────────────────────────────────── */
function Code({ children }: { children: string }) {
  return (
    <pre className="bg-slate-900 text-emerald-300 text-[10px] font-mono px-4 py-3 rounded-xl overflow-x-auto leading-relaxed">
      {children}
    </pre>
  );
}

/* ── Row of examples ─────────────────────────────────────────── */
function Row({ children, wrap = false }: { children: ReactNode; wrap?: boolean }) {
  return (
    <div className={`flex ${wrap ? 'flex-wrap' : ''} items-center gap-3`}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */

export default function UIComponentsPage() {
  const [modalOpen,    setModalOpen]    = useState(false);
  const [modalConfirm, setModalConfirm] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [overlay,      setOverlay]      = useState(false);
  const [inputVal,     setInputVal]     = useState('');
  const [inputErr,     setInputErr]     = useState('');
  const [copiedToken,  setCopiedToken]  = useState('');

  const copyToken = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedToken(key);
      setTimeout(() => setCopiedToken(''), 1800);
    });
  };

  const simulateLoad = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1800);
  };

  const simulateOverlay = () => {
    setOverlay(true);
    setTimeout(() => setOverlay(false), 2000);
  };

  /* ── Table of contents ──────────────────────────────────────── */
  const TOC = [
    { id: 'buttons',   label: 'Button' },
    { id: 'cards',     label: 'Card' },
    { id: 'badges',    label: 'Badge' },
    { id: 'inputs',    label: 'Input / Select' },
    { id: 'modals',    label: 'Modal' },
    { id: 'spinners',  label: 'Spinner / Loading' },
    { id: 'skeletons', label: 'Skeleton' },
    { id: 'alerts',    label: 'Alert' },
    { id: 'tokens',    label: 'Design Tokens' },
  ];

  return (
    <div className="animate-section">
      {overlay && <LoadingOverlay label="Procesando operación..." />}

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Design System — RestoPro Perú</h2>
            <p className="text-xs text-slate-500 mt-1">
              Librería de componentes reutilizables. Importa desde{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-brand font-mono">@/components/ui</code>
            </p>
          </div>
          <Badge variant="brand" size="md" dot>v1.0</Badge>
        </div>

        {/* TOC pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {TOC.map(t => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="text-[11px] font-medium text-brand bg-brand/10 hover:bg-brand/20 px-3 py-1 rounded-full transition-colors"
            >
              {t.label}
            </a>
          ))}
        </div>
      </div>

      <div className="space-y-12">

        {/* ══ 1. BUTTON ══════════════════════════════════════════ */}
        <Section id="buttons" title="1. Button" subtitle="Importa: import { Button } from '@/components/ui'">
          <Card padding="lg" className="space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Variantes</p>
              <Row wrap>
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="accent">Accent</Button>
                <Button variant="danger">Danger</Button>
              </Row>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tamaños</p>
              <Row wrap>
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </Row>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Con icono / loading / disabled</p>
              <Row wrap>
                <Button icon={<PlusCircle className="h-4 w-4" />}>Con Icono</Button>
                <Button icon={<Download className="h-4 w-4" />} iconRight={<ChevronRight className="h-3.5 w-3.5" />}>
                  Exportar
                </Button>
                <Button loading={loading} onClick={simulateLoad}>
                  {loading ? 'Cargando…' : 'Simular carga'}
                </Button>
                <Button disabled>Deshabilitado</Button>
                <Button variant="danger" icon={<Trash2 className="h-4 w-4" />}>Eliminar</Button>
              </Row>
            </div>

            <Code>{`import { Button } from '@/components/ui';

<Button variant="primary" size="md" icon={<PlusCircle />}>
  Registrar Ítem
</Button>

<Button loading={isLoading} onClick={handleSubmit}>
  Guardar cambios
</Button>

// variants: 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger'
// sizes:    'sm' | 'md' | 'lg'`}</Code>
          </Card>
        </Section>

        {/* ══ 2. CARD ════════════════════════════════════════════ */}
        <Section id="cards" title="2. Card" subtitle="Importa: import { Card, CardHeader } from '@/components/ui'">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card padding="md">
              <CardHeader title="Card Base" subtitle="size='md' (rounded-xl)" />
              <p className="text-xs text-slate-500">Contenido de la card.</p>
            </Card>

            <Card size="lg" padding="md">
              <CardHeader title="Card LG" subtitle="size='lg' (rounded-2xl)" />
              <p className="text-xs text-slate-500">Bordes más suavizados.</p>
            </Card>

            <Card interactive padding="md" onClick={() => alert('Card clickeada')}>
              <CardHeader title="Card Interactiva" subtitle="interactive=true" />
              <p className="text-xs text-slate-500">Hover + cursor pointer. Haz clic.</p>
            </Card>
          </div>

          <Card padding="lg" className="space-y-2">
            <CardHeader
              title="Card con acción en header"
              subtitle="Usa la prop action para añadir controles"
              action={<Button size="sm" variant="ghost">Ver todo</Button>}
            />
            <p className="text-xs text-slate-500">El CardHeader acepta un nodo en action.</p>
          </Card>

          <Code>{`import { Card, CardHeader } from '@/components/ui';

<Card size="md" padding="lg" interactive onClick={handleClick}>
  <CardHeader
    title="Título"
    subtitle="Subtítulo opcional"
    action={<Button size="sm">Acción</Button>}
  />
  Contenido aquí
</Card>

// size:        'md' | 'lg'
// padding:     'none' | 'sm' | 'md' | 'lg'
// interactive: boolean  → agrega hover shadow + cursor pointer`}</Code>
        </Section>

        {/* ══ 3. BADGE ═══════════════════════════════════════════ */}
        <Section id="badges" title="3. Badge" subtitle="Importa: import { Badge } from '@/components/ui'">
          <Card padding="lg" className="space-y-4">
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Variantes</p>
              <Row wrap>
                <Badge variant="success">Disponible</Badge>
                <Badge variant="warning">Reservada</Badge>
                <Badge variant="danger">Agotado</Badge>
                <Badge variant="brand">RestoPro</Badge>
                <Badge variant="info">Sincronizado</Badge>
                <Badge variant="neutral">Inactivo</Badge>
              </Row>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Con punto de status</p>
              <Row wrap>
                <Badge variant="success" dot>Online</Badge>
                <Badge variant="danger"  dot>Offline</Badge>
                <Badge variant="warning" dot>En espera</Badge>
                <Badge variant="brand"   dot>Sincronizando</Badge>
              </Row>
            </div>
          </Card>

          <Code>{`import { Badge } from '@/components/ui';

<Badge variant="success">Disponible</Badge>
<Badge variant="warning" dot>Reservada</Badge>
<Badge variant="danger" size="sm">AGOTADO</Badge>

// variant: 'success' | 'warning' | 'danger' | 'brand' | 'info' | 'neutral'
// size:    'sm' | 'md'
// dot:     boolean  → punto de color a la izquierda`}</Code>
        </Section>

        {/* ══ 4. INPUT / SELECT ══════════════════════════════════ */}
        <Section id="inputs" title="4. Input / Select" subtitle="Importa: import { Input, Select } from '@/components/ui'">
          <Card padding="lg" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Buscar producto"
                placeholder="Ej: Ceviche Clásico…"
                iconLeft={<Search className="h-4 w-4" />}
                value={inputVal}
                onChange={e => { setInputVal(e.target.value); setInputErr(''); }}
              />
              <Input
                label="Con error"
                placeholder="Nombre de cliente"
                error={inputErr || undefined}
                onBlur={e => { if (!e.target.value) setInputErr('Este campo es obligatorio.'); }}
              />
              <Input
                label="Con hint"
                placeholder="usuario@email.com"
                hint="Se usará para facturas electrónicas."
                type="email"
              />
              <Select label="Categoría">
                <option>Entradas</option>
                <option>Platos de fondo</option>
                <option>Bebidas</option>
                <option>Postres</option>
              </Select>
            </div>
          </Card>

          <Code>{`import { Input, Select } from '@/components/ui';

<Input
  label="Buscar producto"
  placeholder="Ceviche…"
  iconLeft={<Search className="h-4 w-4" />}
  value={val}
  onChange={e => setVal(e.target.value)}
/>

<Input label="Email" error="Formato inválido." type="email" />
<Input label="SKU"   hint="Código interno de bodega." />

<Select label="Estado">
  <option>Disponible</option>
  <option>Ocupada</option>
</Select>`}</Code>
        </Section>

        {/* ══ 5. MODAL ═══════════════════════════════════════════ */}
        <Section id="modals" title="5. Modal" subtitle="Importa: import { Modal } from '@/components/ui'">
          <Card padding="lg" className="space-y-4">
            <p className="text-xs text-slate-500">
              Cierra con <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono">Esc</kbd>,
              clic fuera del contenedor, o el botón ×.
            </p>
            <Row>
              <Button onClick={() => setModalOpen(true)}>Abrir Modal</Button>
              <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setModalConfirm(true)}>
                Modal Confirmación
              </Button>
            </Row>
          </Card>

          {/* Demo modals */}
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Editar Producto"
            subtitle="Actualiza los datos del ítem seleccionado."
            footer={
              <>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button onClick={() => setModalOpen(false)}>Guardar cambios</Button>
              </>
            }
          >
            <div className="space-y-4 mt-1">
              <Input label="Nombre del producto" defaultValue="Ceviche Clásico" />
              <Input label="Precio (S/.)" defaultValue="28.50" type="number" />
              <Select label="Categoría">
                <option>Entradas</option>
                <option>Platos de fondo</option>
              </Select>
            </div>
          </Modal>

          <Modal
            open={modalConfirm}
            onClose={() => setModalConfirm(false)}
            title="¿Eliminar producto?"
            size="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModalConfirm(false)}>No, cancelar</Button>
                <Button variant="danger" onClick={() => setModalConfirm(false)}>Sí, eliminar</Button>
              </>
            }
          >
            Esta acción no se puede deshacer. El producto será eliminado permanentemente del inventario.
          </Modal>

          <Code>{`import { Modal } from '@/components/ui';
import { Button } from '@/components/ui';

const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Abrir</Button>

<Modal
  open={open}
  onClose={() => setOpen(false)}
  title="Editar Producto"
  subtitle="Subtítulo opcional"
  size="md"
  footer={
    <>
      <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
      <Button onClick={handleSave}>Guardar</Button>
    </>
  }
>
  Contenido del modal aquí
</Modal>

// size: 'sm' | 'md' | 'lg' | 'xl'`}</Code>
        </Section>

        {/* ══ 6. SPINNER / LOADING ═══════════════════════════════ */}
        <Section id="spinners" title="6. Spinner / Loading" subtitle="Importa: import { Spinner, LoadingOverlay } from '@/components/ui'">
          <Card padding="lg" className="space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tamaños</p>
              <Row>
                <Spinner size="xs" />
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" />
                <span className="text-[10px] text-slate-400 font-mono">xs · sm · md · lg</span>
              </Row>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loading overlay</p>
              <Button onClick={simulateOverlay} variant="secondary">
                Simular overlay de 2 s
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En botón</p>
              <Row>
                <Button loading={loading} onClick={simulateLoad}>
                  {loading ? 'Guardando…' : 'Guardar'}
                </Button>
                <Button variant="secondary" loading={loading}>
                  {loading ? 'Cargando…' : 'Cargar datos'}
                </Button>
              </Row>
            </div>
          </Card>

          <Code>{`import { Spinner, LoadingOverlay } from '@/components/ui';

// Spinner inline
<Spinner size="md" />                  // xs | sm | md | lg

// Overlay de pantalla completa
<LoadingOverlay label="Procesando…" />

// En un botón (usa la prop loading del Button)
<Button loading={isLoading}>Guardar</Button>`}</Code>
        </Section>

        {/* ══ 7. SKELETON ════════════════════════════════════════ */}
        <Section id="skeletons" title="7. Skeleton" subtitle="Importa: import { Skeleton, SkeletonCard, SkeletonKPI, ... } from '@/components/ui'">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SkeletonKPI</p>
              <SkeletonKPI />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SkeletonCard</p>
              <SkeletonCard />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primitivos</p>
              <Card padding="md" className="space-y-3">
                <div className="flex items-center gap-3">
                  <SkeletonAvatar size="md" />
                  <SkeletonText lines={2} className="flex-1" />
                </div>
                <Skeleton height="80px" rounded="lg" />
                <SkeletonText lines={3} />
              </Card>
            </div>
          </div>

          <Code>{`import {
  Skeleton, SkeletonText, SkeletonAvatar,
  SkeletonCard, SkeletonKPI, SkeletonTableRows,
} from '@/components/ui';

// Primitivos
<Skeleton height="40px" width="200px" rounded="md" />
<SkeletonText lines={3} />
<SkeletonAvatar size="md" />        // sm | md | lg

// Compuestos
<SkeletonKPI />                     // para tarjetas de métricas
<SkeletonCard />                    // tarjeta completa
<SkeletonTableRows rows={5} cols={6} />  // filas de tabla`}</Code>
        </Section>

        {/* ══ 8. ALERT ═══════════════════════════════════════════ */}
        <Section id="alerts" title="8. Alert" subtitle="Importa: import { Alert } from '@/components/ui'">
          <Card padding="lg" className="space-y-3">
            <Alert variant="success" title="Venta registrada">
              La transacción #1234 fue procesada exitosamente y sincronizada con el POS.
            </Alert>
            <Alert variant="warning" title="Stock mínimo detectado">
              Arroz con Mariscos tiene menos de 5 porciones disponibles. Reabastece pronto.
            </Alert>
            <Alert variant="danger" title="Error de conexión" onClose={() => {}}>
              No se pudo conectar al servidor POS. Verifica tu red e intenta nuevamente.
            </Alert>
            <Alert variant="info" title="Sincronización en curso">
              Los datos se están actualizando desde el servidor central de Lima.
            </Alert>
            <Alert variant="brand" title="Tip Comercial">
              Yape y Plin lideran el 52% de los cobros digitales hoy.
              Promueve postres con banners QR directos.
            </Alert>
          </Card>

          <Code>{`import { Alert } from '@/components/ui';

<Alert variant="success" title="Título opcional">
  Mensaje de éxito aquí.
</Alert>

<Alert
  variant="danger"
  title="Error"
  onClose={() => setVisible(false)}
>
  Descripción del error.
</Alert>

// variant: 'success' | 'warning' | 'danger' | 'info' | 'brand'
// onClose: agrega botón × para cerrar`}</Code>
        </Section>

        {/* ══ 9. DESIGN TOKENS ═══════════════════════════════════ */}
        <Section id="tokens" title="9. Design Tokens" subtitle="Archivo: app/design-tokens.css — cambia un valor y se actualiza toda la app">

          {/* Brand color palette */}
          <Card padding="lg" className="space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Paleta de marca — haz clic en cualquier color para copiar
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { token: '--color-brand',        hex: '#007542', label: 'Brand',        usage: 'bg-brand · text-brand · border-brand' },
                { token: '--color-brand-hover',   hex: '#1E8C45', label: 'Brand Hover',  usage: 'hover:bg-brand-hover' },
                { token: '--color-brand-accent',  hex: '#58BB43', label: 'Brand Accent', usage: 'bg-brand-accent · text-brand-accent' },
                { token: '--color-brand-subtle',  hex: '#3AA346', label: 'Brand Subtle', usage: 'hover:bg-brand-subtle' },
                { token: '--color-brand-dark',    hex: '#094127', label: 'Brand Dark',   usage: 'sidebar gradient start' },
                { token: '--color-brand-medium',  hex: '#08683d', label: 'Brand Medium', usage: 'sidebar gradient end' },
                { token: '--color-brand-deeper',  hex: '#005e34', label: 'Brand Deeper', usage: 'sidebar footer bg' },
              ].map(t => {
                const copied = copiedToken === t.token;
                return (
                  <button
                    key={t.token}
                    onClick={() => copyToken(`${t.token}: ${t.hex};`, t.token)}
                    className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 p-3 rounded-xl transition-all text-left w-full group"
                  >
                    {/* Color swatch */}
                    <div
                      className="h-10 w-10 rounded-lg border border-black/10 shrink-0 shadow-sm"
                      style={{ backgroundColor: t.hex }}
                    />
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold text-slate-700">{t.label}</p>
                        <span className="text-[9px] font-mono font-bold text-slate-400">{t.hex}</span>
                      </div>
                      <p className="text-[9px] font-mono text-slate-400 truncate mt-0.5">{t.token}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{t.usage}</p>
                    </div>
                    {/* Copy feedback */}
                    <span className={`text-[9px] font-bold shrink-0 transition-all ${copied ? 'text-emerald-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                      {copied ? '✓ copiado' : 'copiar'}
                    </span>
                  </button>
                );
              })}
            </div>

            <Alert variant="brand" title="Cómo cambiar toda la paleta">
              Edita <code className="bg-white/60 px-1 py-0.5 rounded font-mono text-[10px]">app/design-tokens.css</code> y
              cambia <code className="bg-white/60 px-1 py-0.5 rounded font-mono text-[10px]">--color-brand</code>.
              Se actualizan automáticamente botones, badges, bordes, textos e iconos en toda la app.
            </Alert>
          </Card>

          <Code>{`/* app/design-tokens.css — Paleta de marca RestoPro */
--color-brand:        #007542;   /* → bg-brand, text-brand, border-brand  */
--color-brand-hover:  #1E8C45;   /* → hover:bg-brand-hover                */
--color-brand-accent: #58BB43;   /* → bg-brand-accent, text-brand-accent  */
--color-brand-subtle: #3AA346;   /* → hover:bg-brand-subtle               */
--color-brand-dark:   #094127;   /* → from-brand-dark (sidebar)           */
--color-brand-medium: #08683d;   /* → to-brand-medium (sidebar)           */
--color-brand-deeper: #005e34;   /* → bg-brand-deeper (sidebar footer)    */`}</Code>
        </Section>

      </div>

      {/* Footer note */}
      <div className="mt-12 pt-6 border-t border-slate-200 flex items-center gap-2 text-[10px] text-slate-400">
        <Star className="h-3 w-3 text-brand-accent" />
        <span>RestoPro Design System v1.0 — todos los componentes importan desde <code className="font-mono text-brand">@/components/ui</code></span>
      </div>
    </div>
  );
}
