'use client';

import { ChevronUp, ChevronDown, Copy, Trash2, Bold } from 'lucide-react';
import {
  type Align, type FontSize, type SepStyle, type TicketBlock,
  BLOCK_META, SEP_LABEL, SEP_CHAR,
} from './ticketData';
import { Segmented, CheckRow, Slider, FieldLabel } from './EditorControls';

const ALIGN_OPTS = [
  { value: 'left' as Align, label: 'Izq.' },
  { value: 'center' as Align, label: 'Centro' },
  { value: 'right' as Align, label: 'Der.' },
];
const SIZE_OPTS = [
  { value: 'small' as FontSize, label: 'S' },
  { value: 'normal' as FontSize, label: 'M' },
  { value: 'large' as FontSize, label: 'L' },
  { value: 'xlarge' as FontSize, label: 'XL' },
];

interface InspectorProps {
  block: TicketBlock;
  onChange: (patch: Partial<TicketBlock>) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onUploadClick: () => void;
}

/** Panel derecho del editor: controles de personalización según el tipo de bloque seleccionado. */
export default function Inspector({ block, onChange, onMove, onDuplicate, onRemove, onUploadClick }: InspectorProps) {
  const meta = BLOCK_META[block.type];

  const textFormat = (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <FieldLabel>Alineación</FieldLabel>
        <Segmented options={ALIGN_OPTS} value={block.align ?? 'left'} onChange={v => onChange({ align: v })} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel>Tamaño de letra</FieldLabel>
        <Segmented options={SIZE_OPTS} value={block.size ?? 'normal'} onChange={v => onChange({ size: v })} />
      </div>
      <div className="flex gap-2">
        <button onClick={() => onChange({ bold: !block.bold })}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg border transition-colors ${
            block.bold ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}>
          <Bold className="h-3.5 w-3.5" /> Negrita
        </button>
        <button onClick={() => onChange({ upper: !block.upper })}
          className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-colors ${
            block.upper ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}>
          MAYÚS
        </button>
      </div>
    </div>
  );

  const Icon = meta.icon;

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-white" />
          </span>
          <h4 className="text-sm font-bold text-slate-800">{meta.label}</h4>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => onMove(-1)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Subir">
            <ChevronUp className="h-4 w-4" />
          </button>
          <button onClick={() => onMove(1)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Bajar">
            <ChevronDown className="h-4 w-4" />
          </button>
          <button onClick={onDuplicate} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Duplicar">
            <Copy className="h-4 w-4" />
          </button>
          <button onClick={onRemove} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50" title="Eliminar">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-4">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={block.visible} onChange={e => onChange({ visible: e.target.checked })} className="accent-blue-600 w-4 h-4" />
          <span className="text-xs font-medium text-slate-700">Visible</span>
        </label>
      </div>

      <div className="border-t border-slate-100 mx-4" />
      <div className="px-4 space-y-5 pb-4">

      {/* Controles por tipo */}
      {block.type === 'imagen' && (
        <div className="space-y-4">
          <Segmented
            options={[{ value: 'logo', label: 'Logo del negocio' }, { value: 'uploaded', label: 'Imagen subida' }]}
            value={block.imgSource ?? 'logo'}
            onChange={v => v === 'uploaded' ? onUploadClick() : onChange({ imgSource: 'logo' })}
          />
          {block.imgSource === 'uploaded' && (
            <button onClick={onUploadClick} className="w-full text-xs font-semibold text-brand bg-brand/10 hover:bg-brand/20 py-2 rounded-lg">
              Cambiar imagen…
            </button>
          )}
          <div className="space-y-1.5">
            <FieldLabel>Tamaño</FieldLabel>
            <Segmented
              options={[{ value: 'chico', label: 'Chico' }, { value: 'mediano', label: 'Mediano' }, { value: 'grande', label: 'Grande' }]}
              value={block.imgSize ?? 'mediano'}
              onChange={v => onChange({ imgSize: v })}
            />
          </div>
        </div>
      )}

      {block.type === 'negocio' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <FieldLabel>Nombre del negocio</FieldLabel>
            <CheckRow checked={block.showName ?? true} onChange={v => onChange({ showName: v })} label="Mostrar nombre" />
            <Segmented options={[{ value: 'false', label: 'Normal' }, { value: 'true', label: 'Compacta' }]}
              value={String(block.compactName ?? false)} onChange={v => onChange({ compactName: v === 'true' })} />
          </div>
          <div className="border-t border-slate-100" />
          <div className="space-y-1">
            <FieldLabel>Datos del local</FieldLabel>
            <CheckRow checked={block.showAddress ?? false} onChange={v => onChange({ showAddress: v })} label="Dirección" />
            <CheckRow checked={block.showPhone ?? false} onChange={v => onChange({ showPhone: v })} label="Teléfono" />
          </div>
        </div>
      )}

      {block.type === 'texto' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <FieldLabel>Contenido</FieldLabel>
            <textarea value={block.text ?? ''} onChange={e => onChange({ text: e.target.value })} rows={2}
              className="input w-full px-3 py-2 text-sm resize-none" placeholder="Escribe el texto…" />
          </div>
          {textFormat}
        </div>
      )}

      {block.type === 'separador' && (
        <div className="space-y-1.5">
          <FieldLabel>Estilo</FieldLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(SEP_LABEL) as SepStyle[]).map(s => (
              <button key={s} onClick={() => onChange({ sepStyle: s })}
                className={`text-xs font-semibold py-2 rounded-lg border transition-colors ${
                  (block.sepStyle ?? 'guiones') === s ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}>
                <span className="font-mono mr-1">{SEP_CHAR[s]}</span> {SEP_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {block.type === 'datos-pedido' && (
        <div className="space-y-1">
          <FieldLabel>Mostrar</FieldLabel>
          <CheckRow checked={block.showFecha ?? true} onChange={v => onChange({ showFecha: v })} label="Fecha" />
          <CheckRow checked={block.showHora ?? true} onChange={v => onChange({ showHora: v })} label="Hora" />
        </div>
      )}

      {block.type === 'numero-pedido' && textFormat}

      {block.type === 'cliente' && (
        <div className="space-y-1">
          <FieldLabel>Datos a mostrar</FieldLabel>
          <CheckRow checked={block.showClientName ?? true} onChange={v => onChange({ showClientName: v })} label="Nombre" />
          <CheckRow checked={block.showClientPhone ?? true} onChange={v => onChange({ showClientPhone: v })} label="Teléfono" />
          <CheckRow checked={block.showClientAddress ?? true} onChange={v => onChange({ showClientAddress: v })} label="Dirección" />
          <CheckRow checked={block.showDeliveryTime ?? true} onChange={v => onChange({ showDeliveryTime: v })} label="Hora de entrega" />
        </div>
      )}

      {block.type === 'productos' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <FieldLabel>Detalle</FieldLabel>
            <CheckRow checked={block.showModifiers ?? true} onChange={v => onChange({ showModifiers: v })} label="Mostrar modificadores" />
            <CheckRow checked={block.showPrices ?? true} onChange={v => onChange({ showPrices: v })} label="Mostrar precios" />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Tamaño de letra</FieldLabel>
            <Segmented options={SIZE_OPTS} value={block.size ?? 'normal'} onChange={v => onChange({ size: v })} />
          </div>
        </div>
      )}

      {block.type === 'totales' && (
        <div className="space-y-1">
          <FieldLabel>Mostrar</FieldLabel>
          <CheckRow checked={block.showSubtotal ?? true} onChange={v => onChange({ showSubtotal: v })} label="Subtotal" />
          <CheckRow checked={block.showEnvio ?? true} onChange={v => onChange({ showEnvio: v })} label="Envío" />
        </div>
      )}

      {block.type === 'pago' && textFormat}

      {block.type === 'qr' && (
        <p className="text-xs text-slate-500">El QR enlaza al seguimiento del pedido. Ajusta su posición con el espaciado.</p>
      )}

      <div className="border-t border-slate-100" />

      {/* Espaciado (común a todos) */}
      <div className="space-y-2">
        <FieldLabel>Espaciado (líneas en blanco)</FieldLabel>
        <Slider label="Superior" value={block.spaceTop} onChange={v => onChange({ spaceTop: v })} />
        <Slider label="Inferior" value={block.spaceBottom} onChange={v => onChange({ spaceBottom: v })} />
      </div>
      </div>
    </div>
  );
}
