'use client';

import { useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Upload, Sparkles, ImageOff, RotateCcw, Check, Loader2 } from 'lucide-react';
import { useProductos } from '@/hooks/productos/useProductos';
import { useCategorias } from '@/hooks/categorias/useCategorias';
import { useApp } from '@/context/AppContext';
import {
  resizeImageToBlob,
  subirImagenProducto,
  eliminarImagenProductoCloudflare,
} from '@/lib/uploadImagen';

type Status = 'idle' | 'analyzing' | 'ready' | 'error';

const ERROR_MESSAGES: Record<string, string> = {
  no_food_detected: 'No se reconoció comida o bebida en la imagen. Prueba con otra foto más clara.',
  image_too_large: 'La imagen es demasiado pesada (máx. 6 MB).',
  invalid_type: 'El archivo debe ser una imagen.',
  server_misconfigured: 'La IA no está configurada en el servidor.',
  ai_request_failed: 'La IA no pudo procesar la imagen. Intenta de nuevo.',
  ai_unreachable: 'No se pudo conectar con el servicio de IA.',
};

export default function ImportarTab() {
  const { data: session } = useSession();
  const sucursalId = session?.user?.sucursalId ?? undefined;
  const { crearProducto } = useProductos(sucursalId);
  const { categorias } = useCategorias();
  const { triggerToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [guardando, setGuardando] = useState(false);

  const categoriasNombres = categorias.map((c) => c.nombre);
  const defaultCategoria = categoriasNombres[0] ?? '';

  const [form, setForm] = useState({ name: '', description: '', category: defaultCategoria, price: '' });

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setStatus('idle');
    setErrorMsg('');
    setPreview(null);
    setImageBlob(null);
    setForm({ name: '', description: '', category: categoriasNombres[0] ?? '', price: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      triggerToast('Selecciona un archivo de imagen.', 'warning');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      triggerToast('La imagen es demasiado pesada (máx. 6 MB).', 'warning');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setStatus('analyzing');
    setErrorMsg('');

    // Se sube a Cloudflare recién al dar "Agregar al menú" (no aquí), igual que en la Carta.
    try {
      setImageBlob(await resizeImageToBlob(file, 800, 800, 0.75));
    } catch {
      setImageBlob(null);
    }

    try {
      const body = new FormData();
      body.append('image', file);
      const res = await fetch('/api/analizar-plato', { method: 'POST', body });
      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(ERROR_MESSAGES[data.error] ?? 'No se pudo analizar la imagen.');
        return;
      }

      const suggestedCategory = data.category ?? '';
      setForm({
        name: data.name ?? '',
        description: data.description ?? '',
        category: categoriasNombres.includes(suggestedCategory)
          ? suggestedCategory
          : (categoriasNombres[0] ?? ''),
        price: '',
      });
      setStatus('ready');
    } catch {
      setStatus('error');
      setErrorMsg('No se pudo conectar con el servicio de IA.');
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleAdd = async () => {
    const price = parseFloat(form.price);
    if (!form.name.trim()) { triggerToast('Ingresa un nombre para el plato.', 'warning'); return; }
    if (!price || price <= 0) { triggerToast('Ingresa un precio válido.', 'warning'); return; }

    const cat = categorias.find((c) => c.nombre === form.category);
    if (!cat) { triggerToast('Selecciona una categoría válida.', 'warning'); return; }

    setGuardando(true);

    let imagenUrl: string | undefined;
    let imagenSubidaId: string | null = null;
    if (imageBlob) {
      try {
        const subida = await subirImagenProducto(imageBlob);
        imagenUrl = subida.url;
        imagenSubidaId = subida.imageId;
      } catch {
        setGuardando(false);
        triggerToast('No se pudo subir la imagen. Intenta nuevamente.', 'error');
        return;
      }
    }

    const creado = await crearProducto({
      categoriaId: cat.id,
      nombre: form.name.trim(),
      descripcion: form.description.trim() || undefined,
      imagenUrl,
    }, price);

    setGuardando(false);

    if (!creado) {
      if (imagenSubidaId) eliminarImagenProductoCloudflare(imagenSubidaId);
      return;
    }

    triggerToast(`"${form.name.trim()}" agregado al menú.`, 'success');
    reset();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-brand" />
        <p className="text-sm font-semibold text-slate-700">Importar con IA</p>
      </div>
      <p className="text-xs text-slate-500 mb-6">
        Sube una foto de un plato, postre o bebida y la IA sugerirá el nombre y la descripción para tu carta.
      </p>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={onInputChange} className="hidden" />

      {status === 'idle' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          className="border-2 border-dashed border-slate-200 rounded-2xl py-14 text-center cursor-pointer hover:border-brand hover:bg-brand/5 transition-colors"
        >
          <Upload className="w-8 h-8 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Arrastra una imagen o haz clic para subirla</p>
          <p className="text-xs text-slate-400 mt-1">JPG o PNG, máx. 6 MB</p>
        </div>
      )}

      {status !== 'idle' && (
        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-6">
          <div className="space-y-2">
            <div className="relative h-56 sm:h-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
              {preview && (
                <img src={preview} alt="Plato analizado" className="h-full w-full object-cover" />
              )}
              {status === 'analyzing' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 text-white">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs font-medium">Analizando con IA...</span>
                </div>
              )}
            </div>
            <button
              onClick={reset}
              disabled={guardando}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Subir otra imagen
            </button>
          </div>

          <div>
            {status === 'error' && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-4 mb-4">
                <ImageOff className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {status === 'ready' && (
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" /> La IA sugirió estos datos — revísalos y ajústalos
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Nombre del plato *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-slate-50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Precio (S/.) *</label>
                    <input
                      type="number" min={0} step={0.5}
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-slate-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Categoría</label>
                    <select
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-slate-50"
                    >
                      {categoriasNombres.length === 0 && (
                        <option value="">Sin categorías</option>
                      )}
                      {categoriasNombres.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Descripción</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-slate-50 resize-none"
                  />
                </div>
                <button
                  onClick={handleAdd}
                  disabled={guardando}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" /> {guardando ? 'Guardando...' : 'Agregar al menú'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
