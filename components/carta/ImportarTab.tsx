'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Upload, Sparkles, FileText, X, Check, AlertTriangle, CheckCircle2, XCircle, RotateCcw,
  ArrowLeft, ArrowRight, Info, Copy, ChevronDown, Minus,
} from 'lucide-react';
import { useProductos } from '@/hooks/productos/useProductos';
import { useCategorias } from '@/hooks/categorias/useCategorias';
import { useApp } from '@/context/AppContext';
import { createCategoria } from '@/lib/api/categorias';
import { createProducto, setPrecioSucursal } from '@/lib/api/productos';
import { resizeImageToBlob } from '@/lib/uploadImagen';
import { Alert, Spinner } from '@/components/ui';
import {
  MAX_BYTES_ARCHIVO, TIPOS_IMAGEN, TIPO_PDF, buscarCoincidencia, normalizarNombre, unirCartas,
  type CartaLeida,
} from '@/lib/carta/importacion';

type Paso = 'subir' | 'analizar' | 'revisar' | 'importar';

const PASOS: { id: Paso; label: string }[] = [
  { id: 'subir', label: 'Subir' },
  { id: 'analizar', label: 'Analizar' },
  { id: 'revisar', label: 'Revisar' },
  { id: 'importar', label: 'Importar' },
];

const MAX_ARCHIVOS = 10;
/** Lado máximo con el que se envían las fotos: suficiente para leer la carta y mucho más liviano. */
const LADO_MAX_FOTO = 2048;

interface ArchivoCarta {
  id: number;
  file: File;
  preview: string | null;
  estado: 'pendiente' | 'leyendo' | 'listo' | 'error';
  error?: string;
  platos?: number;
}

interface PlatoRevision {
  key: string;
  incluir: boolean;
  nombre: string;
  descripcion: string;
  precio: string;
  /** Plato existente que la IA cree que es el mismo con otro nombre (solo aviso). */
  parecidoA: string | null;
}

interface CategoriaRevision {
  key: string;
  nombre: string;
  /** id de una categoría existente, o 'nueva' para crearla al importar. */
  destino: number | 'nueva';
  platos: PlatoRevision[];
}

interface Resultado {
  creados: number;
  categoriasNuevas: number;
  sinPrecio: string[];
  fallidos: { key: string; nombre: string; motivo: string }[];
}

const leerPrecio = (valor: string): number | null => {
  const n = Number(valor.replace(',', '.').trim());
  return valor.trim() !== '' && Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

const esPdf = (f: File) => f.type === TIPO_PDF || /\.pdf$/i.test(f.name);
const esImagen = (f: File) => (TIPOS_IMAGEN as readonly string[]).includes(f.type);

/** Las fotos se reducen y pasan a JPEG antes de enviarlas; si falla, se envía el original. */
async function prepararArchivo(file: File): Promise<Blob> {
  if (!esImagen(file)) return file;
  try {
    return await resizeImageToBlob(file, LADO_MAX_FOTO, LADO_MAX_FOTO, 0.85);
  } catch {
    return file;
  }
}

/** Casilla con el color de la marca; `mixta` = solo algunos platos de la categoría están marcados. */
function Casilla({ marcada, mixta = false, onChange, etiqueta }: {
  marcada: boolean;
  mixta?: boolean;
  onChange: (v: boolean) => void;
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada ? true : mixta ? 'mixed' : false}
      aria-label={etiqueta}
      onClick={() => onChange(!marcada)}
      className={`shrink-0 h-5 w-5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
        marcada || mixta ? 'bg-brand text-white' : 'bg-white border-2 border-slate-300 hover:border-brand'
      }`}
    >
      {marcada ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : mixta && <Minus className="w-3.5 h-3.5" strokeWidth={3} />}
    </button>
  );
}

/** Campo que se lee como texto y muestra el borde al pasar el mouse o al editarlo. */
const CAMPO_EN_LINEA =
  'w-full min-w-0 bg-transparent rounded-lg border border-transparent px-2 py-1 outline-none transition-colors ' +
  'hover:border-slate-200 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15';

export default function ImportarTab({
  sucursalId: sucursalElegida,
  onIrACarta,
}: {
  sucursalId?: number | null;
  onIrACarta?: () => void;
}) {
  const { data: session } = useSession();
  const token = session?.accessToken;
  // La sucursal elegida en Menú Digital (superadmin) manda; el precio se guarda por sucursal.
  const sucursalId = sucursalElegida ?? session?.user?.sucursalId ?? undefined;
  const { productos, loading: cargandoProductos, fetchProductos } = useProductos(sucursalId);
  const { categorias, loading: cargandoCategorias, fetchCategorias } = useCategorias();
  const { triggerToast } = useApp();
  const cargandoCarta = cargandoProductos || cargandoCategorias;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const siguienteId = useRef(0);
  /** Identifica la lectura vigente: si el usuario vuelve a empezar, las respuestas tardías se descartan. */
  const ronda = useRef(0);

  const [paso, setPaso] = useState<Paso>('subir');
  const [archivos, setArchivos] = useState<ArchivoCarta[]>([]);
  const [analizando, setAnalizando] = useState(false);
  const [moneda, setMoneda] = useState('PEN');
  const [revision, setRevision] = useState<CategoriaRevision[]>([]);
  const [progreso, setProgreso] = useState({ hechos: 0, total: 0 });
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [plegadas, setPlegadas] = useState<Set<string>>(new Set());

  // Libera las vistas previas al salir de la pestaña.
  const archivosRef = useRef(archivos);
  archivosRef.current = archivos;
  useEffect(() => () => archivosRef.current.forEach(a => a.preview && URL.revokeObjectURL(a.preview)), []);

  const nombresExistentes = useMemo(() => productos.map(p => p.nombre), [productos]);

  /* ── Paso 1: Subir ─────────────────────────────────────────── */

  const agregarArchivos = (lista: FileList | null) => {
    if (!lista) return;
    const nuevos: ArchivoCarta[] = [];
    for (const file of Array.from(lista)) {
      if (!esImagen(file) && !esPdf(file)) {
        triggerToast(`"${file.name}" no es compatible. Sube fotos JPG, PNG o WEBP, o un PDF.`, 'warning');
        continue;
      }
      if (file.size > MAX_BYTES_ARCHIVO) {
        triggerToast(`"${file.name}" pesa más de 10 MB.`, 'warning');
        continue;
      }
      nuevos.push({
        id: siguienteId.current++,
        file,
        preview: esImagen(file) ? URL.createObjectURL(file) : null,
        estado: 'pendiente',
      });
    }
    setArchivos(prev => {
      const espacio = MAX_ARCHIVOS - prev.length;
      if (nuevos.length > espacio) {
        triggerToast(`Puedes subir hasta ${MAX_ARCHIVOS} archivos por importación.`, 'warning');
        nuevos.slice(espacio).forEach(a => a.preview && URL.revokeObjectURL(a.preview));
      }
      return [...prev, ...nuevos.slice(0, Math.max(espacio, 0))];
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const quitarArchivo = (id: number) => {
    setArchivos(prev => {
      const a = prev.find(x => x.id === id);
      if (a?.preview) URL.revokeObjectURL(a.preview);
      return prev.filter(x => x.id !== id);
    });
  };

  const empezarDeNuevo = () => {
    ronda.current++;
    archivos.forEach(a => a.preview && URL.revokeObjectURL(a.preview));
    setArchivos([]);
    setRevision([]);
    setResultado(null);
    setPlegadas(new Set());
    setAnalizando(false);
    setMoneda('PEN');
    setPaso('subir');
  };

  /* ── Paso 2: Analizar ──────────────────────────────────────── */

  const actualizarArchivo = (id: number, cambios: Partial<ArchivoCarta>) =>
    setArchivos(prev => prev.map(a => (a.id === id ? { ...a, ...cambios } : a)));

  const construirRevision = (carta: CartaLeida): CategoriaRevision[] => {
    const vistos = new Set<string>();
    const nombresCategorias = categorias.map(c => c.nombre);
    return carta.categorias.map((c, ci) => {
      const existente = buscarCoincidencia(c.nombre, nombresCategorias, 0.9);
      return {
        key: `c${ci}`,
        nombre: existente ?? c.nombre,
        destino: categorias.find(x => x.nombre === existente)?.id ?? 'nueva',
        platos: c.platos.map((p, pi) => {
          // Fotos que se solapan repiten platos: la segunda aparición queda desmarcada.
          const clave = normalizarNombre(p.nombre);
          const repetido = vistos.has(clave);
          vistos.add(clave);
          return {
            key: `c${ci}p${pi}`,
            incluir: !p.coincideCon && !repetido,
            nombre: p.nombre,
            descripcion: p.descripcion,
            precio: p.precio != null ? p.precio.toFixed(2) : '',
            parecidoA: p.parecidoA,
          };
        }),
      };
    });
  };

  const analizar = async () => {
    const miRonda = ++ronda.current;
    setPaso('analizar');
    setAnalizando(true);
    const catalogo = JSON.stringify({
      categorias: categorias.map(c => c.nombre),
      platos: productos.map(p => p.nombre),
    });
    const leidas: CartaLeida[] = [];
    let todosBien = true;

    setArchivos(prev => prev.map(a => ({ ...a, estado: 'pendiente', error: undefined, platos: undefined })));

    for (let i = 0; i < archivos.length; i++) {
      const a = archivos[i];
      if (miRonda !== ronda.current) return;
      actualizarArchivo(a.id, { estado: 'leyendo' });
      try {
        const body = new FormData();
        body.append('archivo', await prepararArchivo(a.file), esPdf(a.file) ? a.file.name : 'carta.jpg');
        body.append('catalogo', catalogo);
        const res = await fetch('/api/leer-carta', { method: 'POST', body });
        const data = await res.json().catch(() => null);
        if (miRonda !== ronda.current) return;

        if (!res.ok) {
          todosBien = false;
          const mensaje = data?.error ?? 'No se pudo leer este archivo. Intenta de nuevo.';
          // 4xx = el archivo no sirve (no es una carta, muy pesado, PDF escaneado, sin cuota): ya se muestra en pantalla.
          const registrar = res.status >= 500 ? console.error : console.warn;
          registrar(`[Importar carta] ${a.file.name}: ${res.status} ${mensaje}`);
          actualizarArchivo(a.id, { estado: 'error', error: mensaje });
          // Sin cuota no tiene sentido seguir con el resto de archivos.
          if (res.status === 429) {
            const resto = new Set(archivos.slice(i + 1).map(x => x.id));
            setArchivos(prev => prev.map(x => (resto.has(x.id) ? { ...x, estado: 'error', error: mensaje } : x)));
            break;
          }
          continue;
        }

        const carta = data as CartaLeida;
        leidas.push(carta);
        actualizarArchivo(a.id, {
          estado: 'listo',
          platos: carta.categorias.reduce((n, c) => n + c.platos.length, 0),
        });
      } catch (err) {
        if (miRonda !== ronda.current) return;
        todosBien = false;
        console.error(`[Importar carta] ${a.file.name}:`, err);
        actualizarArchivo(a.id, { estado: 'error', error: 'No se pudo conectar con el servidor. Revisa tu conexión.' });
      }
    }

    if (miRonda !== ronda.current) return;
    setAnalizando(false);
    if (leidas.length === 0) return;

    const carta = unirCartas(leidas);
    setMoneda(carta.moneda);
    setRevision(construirRevision(carta));
    if (todosBien) setPaso('revisar');
  };

  /* ── Paso 3: Revisar ───────────────────────────────────────── */

  const editarPlato = (catKey: string, platoKey: string, cambios: Partial<PlatoRevision>) =>
    setRevision(prev => prev.map(c => (c.key !== catKey ? c : {
      ...c,
      platos: c.platos.map(p => (p.key === platoKey ? { ...p, ...cambios } : p)),
    })));

  const editarCategoria = (catKey: string, cambios: Partial<CategoriaRevision>) =>
    setRevision(prev => prev.map(c => (c.key === catKey ? { ...c, ...cambios } : c)));

  const marcarTodos = (catKey: string, incluir: boolean) =>
    setRevision(prev => prev.map(c => (c.key !== catKey ? c : {
      ...c,
      platos: c.platos.map(p => ({ ...p, incluir })),
    })));

  /** Avisos de cada plato, recalculados al editar: si cambias el nombre, el aviso de "ya existe" se actualiza. */
  const analisis = useMemo(() => {
    const repeticiones = new Map<string, number>();
    for (const c of revision) {
      for (const p of c.platos) {
        if (!p.incluir) continue;
        const clave = normalizarNombre(p.nombre);
        repeticiones.set(clave, (repeticiones.get(clave) ?? 0) + 1);
      }
    }
    const porPlato = new Map<string, { existe: string | null; repetido: boolean; precio: number | null }>();
    let seleccionados = 0, sinPrecio = 0, sinNombre = 0, repetidos = 0, existentes = 0, existentesMarcados = 0;
    for (const c of revision) {
      for (const p of c.platos) {
        const existe = buscarCoincidencia(p.nombre, nombresExistentes);
        const precio = leerPrecio(p.precio);
        const repetido = p.incluir && (repeticiones.get(normalizarNombre(p.nombre)) ?? 0) > 1;
        porPlato.set(p.key, { existe, repetido, precio });
        if (existe) existentes++;
        if (!p.incluir) continue;
        seleccionados++;
        if (precio === null) sinPrecio++;
        if (!p.nombre.trim()) sinNombre++;
        if (repetido) repetidos++;
        if (existe) existentesMarcados++;
      }
    }
    const categoriasSinNombre = revision.filter(
      c => c.destino === 'nueva' && !c.nombre.trim() && c.platos.some(p => p.incluir),
    ).length;
    return { porPlato, seleccionados, sinPrecio, sinNombre, repetidos, existentes, existentesMarcados, categoriasSinNombre };
  }, [revision, nombresExistentes]);

  const motivoBloqueo =
    !sucursalId ? 'Elige una sucursal arriba: el precio de cada plato se guarda por sucursal.'
    : analisis.seleccionados === 0 ? 'Marca al menos un plato para importar.'
    : analisis.sinPrecio > 0 ? `Falta el precio de ${analisis.sinPrecio} plato${analisis.sinPrecio === 1 ? '' : 's'} marcado${analisis.sinPrecio === 1 ? '' : 's'}.`
    : analisis.sinNombre > 0 ? 'Hay platos marcados sin nombre.'
    : analisis.repetidos > 0 ? 'Hay platos marcados con el mismo nombre. Cambia uno o desmarca el repetido.'
    : analisis.categoriasSinNombre > 0 ? 'Ponle nombre a las categorías nuevas.'
    : null;

  /* ── Paso 4: Importar ──────────────────────────────────────── */

  const importar = async () => {
    if (motivoBloqueo || !token || !sucursalId) return;
    const plan = revision
      .map(c => ({ categoria: c, platos: c.platos.filter(p => p.incluir) }))
      .filter(x => x.platos.length > 0);
    const total = plan.reduce((n, x) => n + x.platos.length, 0);

    setPaso('importar');
    setResultado(null);
    setProgreso({ hechos: 0, total });

    const res: Resultado = { creados: 0, categoriasNuevas: 0, sinPrecio: [], fallidos: [] };
    const categoriasCreadas = new Map<string, number>();
    let orden = categorias.reduce((max, c) => Math.max(max, c.orden ?? 0), 0) + 1;
    let hechos = 0;

    for (const { categoria, platos } of plan) {
      let categoriaId = typeof categoria.destino === 'number' ? categoria.destino : null;

      if (categoriaId === null) {
        const nombre = categoria.nombre.trim();
        const clave = normalizarNombre(nombre);
        categoriaId = categorias.find(c => normalizarNombre(c.nombre) === clave)?.id ?? categoriasCreadas.get(clave) ?? null;
        if (categoriaId === null) {
          try {
            const nueva = await createCategoria(token, { nombre, orden: orden++ });
            categoriaId = nueva.id;
            categoriasCreadas.set(clave, nueva.id);
            res.categoriasNuevas++;
          } catch (err: any) {
            console.error(`[Importar carta] No se pudo crear la categoría "${nombre}":`, err);
            for (const p of platos) {
              res.fallidos.push({ key: p.key, nombre: p.nombre.trim(), motivo: `No se pudo crear la categoría "${nombre}".` });
            }
            hechos += platos.length;
            setProgreso({ hechos, total });
            continue;
          }
        }
      }

      for (const p of platos) {
        const nombre = p.nombre.trim();
        try {
          const producto = await createProducto(token, {
            categoriaId,
            nombre,
            descripcion: p.descripcion.trim() || undefined,
          });
          try {
            await setPrecioSucursal(token, producto.id, sucursalId, {
              precio: leerPrecio(p.precio) ?? undefined,
              disponible: true,
              controlaStock: false,
            });
            res.creados++;
          } catch (err) {
            // El plato ya existe en la carta: reintentarlo lo duplicaría, solo falta su precio.
            console.error(`[Importar carta] Precio de "${nombre}":`, err);
            res.sinPrecio.push(nombre);
          }
        } catch (err: any) {
          console.error(`[Importar carta] No se pudo crear "${nombre}":`, err);
          res.fallidos.push({ key: p.key, nombre, motivo: err?.message || 'No se pudo crear el plato.' });
        }
        hechos++;
        setProgreso({ hechos, total });
      }
    }

    setResultado(res);
    fetchProductos();
    fetchCategorias();
  };

  /** Vuelve a la revisión solo con los platos que no se pudieron crear. */
  const reintentarFallidos = () => {
    if (!resultado) return;
    const fallidos = new Set(resultado.fallidos.map(f => f.key));
    setRevision(prev => prev
      .map(c => ({ ...c, platos: c.platos.filter(p => fallidos.has(p.key)) }))
      .filter(c => c.platos.length > 0));
    setResultado(null);
    setPaso('revisar');
  };

  /* ── Render ────────────────────────────────────────────────── */

  const indicePaso = PASOS.findIndex(p => p.id === paso);
  const archivosListos = archivos.filter(a => a.estado === 'listo').length;
  const platosLeidos = revision.reduce((n, c) => n + c.platos.length, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-brand" />
        <p className="text-sm font-semibold text-slate-700">Importar carta con IA</p>
      </div>
      <p className="text-xs text-slate-500 mb-5">
        Sube fotos o el PDF de tu carta. La IA detecta categorías, platos y precios; tú revisas todo antes de agregarlo.
      </p>

      {/* Pasos */}
      <ol className="flex items-start max-w-xl mx-auto mb-8">
        {PASOS.map((p, i) => {
          const hecho = i < indicePaso || (p.id === 'importar' && !!resultado);
          const actual = i === indicePaso && !hecho;
          return (
            <li key={p.id} className="relative flex-1 flex flex-col items-center gap-1.5">
              {i > 0 && (
                <span
                  aria-hidden
                  className={`absolute top-4 right-[calc(50%+1.5rem)] left-[calc(-50%+1.5rem)] h-0.5 rounded-full ${
                    i <= indicePaso ? 'bg-brand' : 'bg-slate-200'
                  }`}
                />
              )}
              <span
                className={`relative h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  hecho ? 'bg-brand text-white'
                  : actual ? 'bg-brand text-white ring-4 ring-brand/20'
                  : 'bg-slate-100 text-slate-400'
                }`}
              >
                {hecho ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={`text-xs ${actual ? 'font-bold text-brand' : hecho ? 'font-semibold text-slate-700' : 'text-slate-400'}`}>
                {p.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* ── 1. Subir ── */}
      {paso === 'subir' && (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
            onChange={e => agregarArchivos(e.target.files)}
            className="hidden"
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); agregarArchivos(e.dataTransfer.files); }}
            className="border-2 border-dashed border-slate-200 rounded-2xl py-12 px-4 text-center cursor-pointer hover:border-brand hover:bg-brand/5 transition-colors"
          >
            <Upload className="w-8 h-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Arrastra las fotos o el PDF de tu carta, o haz clic para elegirlos</p>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP o PDF · máx. 10 MB por archivo · hasta {MAX_ARCHIVOS} archivos</p>
          </div>

          {archivos.length > 0 && (
            <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {archivos.map(a => (
                <li key={a.id} className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  <div className="aspect-4/3 flex items-center justify-center">
                    {a.preview
                      ? <img src={a.preview} alt={a.file.name} className="h-full w-full object-cover" />
                      : <FileText className="w-8 h-8 text-slate-400" />}
                  </div>
                  <p className="text-[11px] text-slate-600 px-2 py-1.5 truncate" title={a.file.name}>{a.file.name}</p>
                  <button
                    onClick={() => quitarArchivo(a.id)}
                    aria-label={`Quitar ${a.file.name}`}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-white/90 shadow flex items-center justify-center text-slate-500 hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
            <span>
              Para mejores resultados: fotos de frente, con buena luz y una página por foto. Si tu PDF es escaneado
              (sin texto seleccionable), sube fotos en su lugar.
            </span>
          </div>

          <div className="flex justify-end">
            <button
              onClick={analizar}
              disabled={archivos.length === 0 || cargandoCarta}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargandoCarta ? <Spinner size="sm" /> : <Sparkles className="w-4 h-4" />}
              {cargandoCarta ? 'Cargando tu carta…' : `Analizar con IA${archivos.length > 1 ? ` (${archivos.length} archivos)` : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* ── 2. Analizar ── */}
      {paso === 'analizar' && (
        <div className="space-y-4">
          {analizando && (
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Spinner size="sm" />
              <span>La IA está leyendo tu carta. Puede tardar hasta 30 segundos por archivo.</span>
            </div>
          )}

          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {archivos.map(a => (
              <li key={a.id} className="flex items-start gap-3 p-3">
                <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                  {a.preview
                    ? <img src={a.preview} alt="" className="h-full w-full object-cover" />
                    : <FileText className="w-5 h-5 text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700 truncate">{a.file.name}</p>
                  {a.estado === 'pendiente' && <p className="text-xs text-slate-400">En espera</p>}
                  {a.estado === 'leyendo' && <p className="text-xs text-brand font-semibold">Leyendo…</p>}
                  {a.estado === 'listo' && (
                    <p className="text-xs text-emerald-600">{a.platos} plato{a.platos === 1 ? '' : 's'} encontrado{a.platos === 1 ? '' : 's'}</p>
                  )}
                  {a.estado === 'error' && <p className="text-xs text-rose-600">{a.error}</p>}
                </div>
                <div className="shrink-0 pt-1">
                  {a.estado === 'leyendo' && <Spinner size="sm" />}
                  {a.estado === 'listo' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  {a.estado === 'error' && <XCircle className="w-5 h-5 text-rose-500" />}
                </div>
              </li>
            ))}
          </ul>

          {!analizando && (
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
              <button onClick={() => setPaso('subir')} className="btn-secondary inline-flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Cambiar archivos
              </button>
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={analizar} className="btn-secondary inline-flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Volver a analizar
                </button>
                {archivosListos > 0 && (
                  <button onClick={() => setPaso('revisar')} className="btn-primary inline-flex items-center justify-center gap-2">
                    Revisar {platosLeidos} plato{platosLeidos === 1 ? '' : 's'} <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 3. Revisar ── */}
      {paso === 'revisar' && (
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { valor: revision.length, label: 'Categorías', estilo: 'bg-brand/10 text-brand' },
              { valor: analisis.seleccionados, label: 'Platos a importar', estilo: 'bg-emerald-50 text-emerald-600' },
              { valor: analisis.sinPrecio, label: 'Sin precio', estilo: 'bg-amber-50 text-amber-600' },
              { valor: analisis.existentes, label: 'Ya en tu carta', estilo: 'bg-rose-50 text-rose-600' },
            ].map(t => (
              <div key={t.label} className={`rounded-2xl px-3 py-3 text-center ${t.estilo}`}>
                <p className="text-2xl font-bold leading-tight">{t.valor}</p>
                <p className="text-xs font-medium">{t.label}</p>
              </div>
            ))}
          </div>

          {moneda !== 'PEN' && (
            <Alert variant="warning">
              Los precios de esta carta parecen estar en {moneda}. Se importarán tal cual como precios en soles: revísalos.
            </Alert>
          )}
          {!sucursalId && (
            <Alert variant="warning">Elige una sucursal arriba: el precio de cada plato se guarda por sucursal.</Alert>
          )}
          {analisis.existentes > 0 && (
            <Alert variant="info">
              Los platos que ya están en tu carta se dejaron desmarcados para no duplicarlos. Si en realidad es otro plato,
              cámbiale el nombre y márcalo.
            </Alert>
          )}

          {revision.map(cat => {
            const marcados = cat.platos.filter(p => p.incluir).length;
            const plegada = plegadas.has(cat.key);
            const alternar = () => setPlegadas(prev => {
              const nuevo = new Set(prev);
              if (nuevo.has(cat.key)) nuevo.delete(cat.key);
              else nuevo.add(cat.key);
              return nuevo;
            });
            return (
              <section key={cat.key} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <header className="px-4 py-3.5 flex items-center gap-3">
                  <Casilla
                    marcada={marcados === cat.platos.length}
                    mixta={marcados > 0}
                    onChange={v => marcarTodos(cat.key, v)}
                    etiqueta={`Importar todos los platos de ${cat.nombre}`}
                  />
                  <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {cat.destino === 'nueva' ? (
                      <input
                        value={cat.nombre}
                        onChange={e => editarCategoria(cat.key, { nombre: e.target.value })}
                        placeholder="Nombre de la categoría"
                        aria-label="Nombre de la categoría nueva"
                        size={Math.max(cat.nombre.length, 12)}
                        className={`${CAMPO_EN_LINEA} -ml-2 w-auto! max-w-full text-sm font-bold uppercase text-slate-800 ${
                          !cat.nombre.trim() && marcados > 0 ? 'border-rose-300' : ''
                        }`}
                      />
                    ) : (
                      <span className="text-sm font-bold uppercase text-slate-800 truncate">{cat.nombre}</span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 whitespace-nowrap">
                      {marcados}/{cat.platos.length} platos
                    </span>
                    <select
                      value={cat.destino}
                      onChange={e => {
                        const v = e.target.value;
                        if (v === 'nueva') editarCategoria(cat.key, { destino: 'nueva' });
                        else editarCategoria(cat.key, { destino: Number(v), nombre: categorias.find(c => c.id === Number(v))?.nombre ?? cat.nombre });
                      }}
                      aria-label="Categoría de destino"
                      className="text-[11px] font-semibold rounded-full pl-2 pr-1 py-0.5 border-0 cursor-pointer outline-none focus:ring-2 focus:ring-brand/20 bg-brand/10 text-brand"
                    >
                      <option value="nueva">Categoría nueva</option>
                      {categorias.length > 0 && (
                        <optgroup label="Agregar a una existente">
                          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </optgroup>
                      )}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={alternar}
                    aria-expanded={!plegada}
                    aria-label={plegada ? `Mostrar platos de ${cat.nombre}` : `Ocultar platos de ${cat.nombre}`}
                    className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${plegada ? '' : 'rotate-180'}`} />
                  </button>
                </header>

                {!plegada && (
                  <ul className="border-t border-slate-100 p-3 sm:p-4 space-y-2">
                    {cat.platos.map(p => {
                      const info = analisis.porPlato.get(p.key);
                      const faltaPrecio = info?.precio === null;
                      const conProblema = p.incluir && (faltaPrecio || info?.repetido || !p.nombre.trim());
                      return (
                        <li
                          key={p.key}
                          className={`rounded-xl border px-3 py-2.5 transition-colors ${
                            conProblema ? 'border-amber-200 bg-amber-50/40'
                            : p.incluir ? 'border-slate-200 bg-white hover:border-slate-300'
                            : 'border-slate-100 bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="pt-1.5">
                              <Casilla
                                marcada={p.incluir}
                                onChange={v => editarPlato(cat.key, p.key, { incluir: v })}
                                etiqueta={`Importar ${p.nombre}`}
                              />
                            </div>
                            <div className={`flex-1 min-w-0 ${p.incluir ? '' : 'opacity-55'}`}>
                              <input
                                value={p.nombre}
                                onChange={e => editarPlato(cat.key, p.key, { nombre: e.target.value })}
                                placeholder="Nombre del plato"
                                aria-label="Nombre del plato"
                                className={`${CAMPO_EN_LINEA} text-sm font-semibold uppercase text-slate-800 ${
                                  p.incluir && !p.nombre.trim() ? 'border-rose-300' : ''
                                }`}
                              />
                              <input
                                value={p.descripcion}
                                onChange={e => editarPlato(cat.key, p.key, { descripcion: e.target.value })}
                                placeholder="Agregar descripción (opcional)"
                                aria-label="Descripción"
                                className={`${CAMPO_EN_LINEA} text-xs text-slate-500 placeholder:text-slate-300`}
                              />
                            </div>
                            <label
                              className={`shrink-0 flex items-center rounded-lg border px-2 py-1 transition-colors focus-within:border-brand focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/15 ${
                                faltaPrecio && p.incluir ? 'border-amber-300 bg-white' : 'border-transparent hover:border-slate-200'
                              } ${p.incluir ? '' : 'opacity-55'}`}
                            >
                              <span className="text-sm font-semibold text-slate-400 mr-1">S/</span>
                              <input
                                value={p.precio}
                                onChange={e => editarPlato(cat.key, p.key, { precio: e.target.value })}
                                onBlur={() => {
                                  const n = leerPrecio(p.precio);
                                  if (n !== null) editarPlato(cat.key, p.key, { precio: n.toFixed(2) });
                                }}
                                inputMode="decimal"
                                placeholder="0.00"
                                aria-label={`Precio de ${p.nombre}`}
                                className="w-16 bg-transparent text-right text-sm font-semibold text-slate-800 outline-none placeholder:text-amber-400"
                              />
                            </label>
                          </div>

                          {(faltaPrecio || info?.existe || p.parecidoA || info?.repetido) && (
                            <div className="flex flex-wrap gap-1.5 mt-2 pl-8 text-[11px] font-medium">
                              {faltaPrecio && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">
                                  <AlertTriangle className="w-3 h-3" /> Falta precio: la carta no lo muestra
                                </span>
                              )}
                              {info?.existe && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 px-2 py-0.5">
                                  <Copy className="w-3 h-3" />
                                  Ya existe como “{info.existe}”{p.incluir ? ': cámbiale el nombre si es otro plato' : ''}
                                </span>
                              )}
                              {!info?.existe && p.parecidoA && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-700 px-2 py-0.5">
                                  <Info className="w-3 h-3" /> Parecido a “{p.parecidoA}” de tu carta
                                </span>
                              )}
                              {info?.repetido && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 px-2 py-0.5">
                                  <AlertTriangle className="w-3 h-3" /> Repetido en esta importación
                                </span>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}

          <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/95 backdrop-blur border-t border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2">
            <p className={`text-xs flex-1 ${motivoBloqueo ? 'text-amber-700' : 'text-slate-500'}`}>
              {motivoBloqueo ?? 'Los platos se agregarán a tu carta como disponibles, con el precio indicado.'}
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button onClick={empezarDeNuevo} className="btn-secondary inline-flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Empezar de nuevo
              </button>
              <button
                onClick={importar}
                disabled={!!motivoBloqueo}
                className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" /> Importar {analisis.seleccionados} plato{analisis.seleccionados === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Importar ── */}
      {paso === 'importar' && (
        <div className="space-y-4">
          {!resultado && (
            <div className="py-8 text-center space-y-3">
              <Spinner size="lg" />
              <p className="text-sm font-semibold text-slate-700">
                Creando platos… {progreso.hechos} de {progreso.total}
              </p>
              <div className="h-2 max-w-sm mx-auto bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand transition-all"
                  style={{ width: `${progreso.total ? (progreso.hechos / progreso.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">No cierres esta pestaña hasta que termine.</p>
            </div>
          )}

          {resultado && (
            <>
              <div className="text-center py-4">
                <CheckCircle2 className={`w-10 h-10 mx-auto mb-2 ${resultado.creados > 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                <p className="text-base font-bold text-slate-800">
                  {resultado.creados} plato{resultado.creados === 1 ? '' : 's'} agregado{resultado.creados === 1 ? '' : 's'} a tu carta
                </p>
                {resultado.categoriasNuevas > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Se crearon {resultado.categoriasNuevas} categoría{resultado.categoriasNuevas === 1 ? '' : 's'} nueva{resultado.categoriasNuevas === 1 ? '' : 's'}.
                  </p>
                )}
              </div>

              {resultado.sinPrecio.length > 0 && (
                <Alert variant="warning" title="Platos creados sin precio">
                  No se pudo guardar el precio de: {resultado.sinPrecio.join(', ')}. Edítalos desde la Carta para fijarlo.
                </Alert>
              )}
              {resultado.fallidos.length > 0 && (
                <Alert variant="danger" title={`${resultado.fallidos.length} plato${resultado.fallidos.length === 1 ? '' : 's'} no se pudo crear`}>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {resultado.fallidos.map(f => <li key={f.key}><strong>{f.nombre}</strong>: {f.motivo}</li>)}
                  </ul>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row sm:justify-center gap-2">
                {resultado.fallidos.length > 0 && (
                  <button onClick={reintentarFallidos} className="btn-secondary inline-flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Revisar los que fallaron
                  </button>
                )}
                <button onClick={empezarDeNuevo} className="btn-secondary inline-flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" /> Importar otra carta
                </button>
                {onIrACarta && (
                  <button onClick={onIrACarta} className="btn-primary inline-flex items-center justify-center gap-2">
                    Ver en la carta <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
