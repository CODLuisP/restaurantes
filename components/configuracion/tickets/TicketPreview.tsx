'use client';

import { QRCodeCanvas } from 'qrcode.react';
import type { TicketBlock, FontSize, Align, Side } from './ticketData';
import { SAMPLE, SEP_CHAR, money, COMPROBANTE_COLOR, DOC_META } from './ticketData';

const SIZE_CLASS: Record<FontSize, string> = {
  small: 'text-[9px]',
  normal: 'text-[11px]',
  large: 'text-[15px]',
  xlarge: 'text-[20px]',
};
const ALIGN_CLASS: Record<Align, string> = {
  left: 'text-left', center: 'text-center', right: 'text-right',
};
const IMG_SIZE: Record<string, string> = {
  chico: 'h-12', mediano: 'h-16', grande: 'h-24',
};

function Spacer({ lines }: { lines: number }) {
  if (!lines) return null;
  return <div style={{ height: `${lines * 0.9}em` }} />;
}

/** Logo por defecto (placeholder de marca) cuando no hay imagen subida. */
function LogoMark({ size }: { size: string }) {
  return (
    <div className={`${IMG_SIZE[size] ?? 'h-16'} aspect-square rounded-full bg-orange-500 flex items-center justify-center mx-auto`}>
      <span className="text-white font-black" style={{ fontSize: '1.4em' }}>ı</span>
    </div>
  );
}

/** Datos reales del negocio para la vista previa; sin ellos se usa el ejemplo de SAMPLE. */
export interface PreviewNegocio { name?: string; address?: string; ruc?: string; logoUrl?: string }

function BlockView({ block, side, negocio }: { block: TicketBlock; side: Side; negocio?: PreviewNegocio }) {
  /* Cada comprobante se previsualiza con sus propios datos (tipo, N°, etiqueta del documento). */
  const doc = side === 'cocina' ? null : DOC_META[side];
  const align = ALIGN_CLASS[block.align ?? 'left'];
  const sizeCls = SIZE_CLASS[block.size ?? 'normal'];
  const weight = block.bold ? 'font-bold' : '';
  const transform = block.upper ? 'uppercase' : '';

  const inner = (() => {
    switch (block.type) {
      case 'imagen':
        return (
          <div className="text-center">
            {block.imgSource === 'uploaded' && block.imgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={block.imgUrl} alt="Logo" className={`${IMG_SIZE[block.imgSize ?? 'mediano']} object-contain mx-auto`} />
            ) : negocio?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={negocio.logoUrl} alt="Logo" className={`${IMG_SIZE[block.imgSize ?? 'mediano']} object-contain mx-auto`} />
            ) : (
              <LogoMark size={block.imgSize ?? 'mediano'} />
            )}
          </div>
        );

      case 'negocio':
        return (
          <div className="text-center leading-tight">
            {block.showName && (
              <div className={`${block.compactName ? 'text-[13px]' : 'text-[17px]'} font-black tracking-tight`}>
                {negocio?.name ?? SAMPLE.businessName}
              </div>
            )}
            {block.showAddress && <div className="text-[9px]">{block.fiscalAddress ? 'Dir. Fiscal: ' : ''}{negocio?.address ?? SAMPLE.businessAddress}</div>}
            {block.showPhone && <div className="text-[9px]">{SAMPLE.businessPhone}</div>}
          </div>
        );

      case 'texto':
        return <div className={`${align} ${sizeCls} ${weight} ${transform} whitespace-pre-wrap break-words`}>{block.text}</div>;

      case 'separador':
        return (
          <div className="text-center overflow-hidden whitespace-nowrap select-none opacity-80" aria-hidden>
            {SEP_CHAR[block.sepStyle ?? 'guiones'].repeat(48)}
          </div>
        );

      case 'datos-pedido':
        if (block.tabular) {
          return (
            <div className={sizeCls}>
              {block.showFecha && <div className="flex gap-1.5"><b className="w-[52px] shrink-0">Fecha:</b><span>{SAMPLE.date} {SAMPLE.time}</span></div>}
            </div>
          );
        }
        return (
          <div className={`${sizeCls} space-y-0.5`}>
            {block.showFecha && (
              <div className="flex justify-between"><span>Fecha:</span><span>{SAMPLE.date}, {SAMPLE.time}</span></div>
            )}
            {block.showHora && !block.showFecha && (
              <div className="flex justify-between"><span>Hora:</span><span>{SAMPLE.time}</span></div>
            )}
            {block.showFecha && block.showHora && null}
            {block.showMozo && <div><span className="font-bold">Mozo:</span> {SAMPLE.mozo}</div>}
          </div>
        );

      case 'numero-pedido':
        return <div className={`${align} ${SIZE_CLASS[block.size ?? 'xlarge']} font-bold`}>Pedido #{SAMPLE.orderNumber}</div>;

      case 'cliente':
        if (block.tabular) {
          return (
            <div className={sizeCls}>
              {block.showClientName && <div className="flex gap-1.5"><b className="w-[52px] shrink-0">Cliente:</b><span>{doc?.sampleCustomer ?? SAMPLE.customerName}</span></div>}
              {block.showClientDoc && <div className="flex gap-1.5"><b className="w-[52px] shrink-0">{doc?.clienteDocLabel ?? 'Doc.:'}</b><span>{doc?.sampleDoc ?? SAMPLE.customerDoc}</span></div>}
            </div>
          );
        }
        return (
          <div className={`${sizeCls} space-y-0.5`}>
            {block.showClientName && <div><span className="font-bold">Cliente:</span> {SAMPLE.customerName}</div>}
            {block.showClientPhone && <div>Tel: {SAMPLE.customerPhone}</div>}
            {block.showClientAddress && <div>Dir: {SAMPLE.customerAddress}</div>}
            {block.showDeliveryTime && <div>Hora de entrega: {SAMPLE.deliveryTime}</div>}
          </div>
        );

      case 'productos':
        return (
          <div className={sizeCls}>
            <div className="flex justify-between font-bold border-b border-black/30 pb-0.5 mb-1">
              <span>Cant. Producto</span>
              {block.showPrices && <span>Total</span>}
            </div>
            <div className="space-y-1.5">
              {SAMPLE.items.map((it, i) => (
                <div key={i}>
                  <div className="flex justify-between font-medium">
                    <span>{it.qty}&nbsp;&nbsp;{it.name}</span>
                    {block.showPrices && <span>{money(it.price)}</span>}
                  </div>
                  {block.showModifiers && it.modifiers && it.modifiers.length > 0 && (
                    <div className="pl-4 text-[0.85em] leading-tight">
                      {it.modifiers.map((m, j) => (
                        <div key={j}>
                          {m.removed ? '− ' : '+ '}{m.label}
                          {m.extra ? ` (+${money(m.extra)})` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'totales':
        return (
          <div className={sizeCls}>
            {block.showSubtotal && <div className="flex justify-between"><span>Subtotal</span><span>{money(SAMPLE.subtotal)}</span></div>}
            {block.showEnvio && <div className="flex justify-between"><span>Envío</span><span>{money(SAMPLE.envio)}</span></div>}
            <div className="flex justify-between font-bold text-[1.25em] mt-0.5"><span>TOTAL</span><span>{money(SAMPLE.total)}</span></div>
          </div>
        );

      case 'pago':
        return <div className={`${align} ${sizeCls} ${weight}`}>Pagado — {SAMPLE.paymentMethod}</div>;

      case 'qr':
        return (
          <div className="flex justify-center">
            <QRCodeCanvas value={`${typeof window !== 'undefined' ? window.location.origin : ''}/menu`} size={96} bgColor="#ffffff" fgColor="#000000" level="M" />
          </div>
        );

      case 'comprobante-cabecera':
        return (
          <div className="text-center">
            <div className="text-[15px] font-bold py-0.5">RUC: {negocio?.ruc ?? SAMPLE.ruc}</div>
            <div className="font-bold text-[14px] text-white py-0.5" style={{ background: COMPROBANTE_COLOR }}>{doc?.docLabel ?? SAMPLE.docLabel}</div>
            <div className="text-[14px] font-bold py-1">N° {doc?.sampleNumber ?? SAMPLE.docNumber}</div>
          </div>
        );

      case 'detalle-comprobante':
        return (
          <table className={`w-full border-collapse ${sizeCls}`}>
            <thead>
              <tr className="text-white" style={{ background: COMPROBANTE_COLOR }}>
                <th className="text-left px-0.5">#</th><th className="text-left">Cod</th><th className="text-left">Cant</th>
                <th className="text-left">Desc</th><th className="text-right">P.Vent</th><th className="text-right pr-0.5">Total</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE.items.map((it, i) => (
                <tr key={i}>
                  <td>{i + 1}</td><td>P00{i + 1}</td><td>{it.qty.toFixed(2)}</td><td>{it.name}</td>
                  <td className="text-right">{(it.price / it.qty).toFixed(2)}</td><td className="text-right">{it.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'totales-comprobante': {
        const base = SAMPLE.total / (1 + SAMPLE.igvPorcentaje / 100);
        return (
          <div className={sizeCls}>
            <div className="flex justify-between"><span>Op. Gravadas</span><span>{money(base)}</span></div>
            <div className="flex justify-between"><span>Op. Exoneradas</span><span>{money(0)}</span></div>
            <div className="flex justify-between"><span>Op. Inafectas</span><span>{money(0)}</span></div>
            <div className="flex justify-between"><span>I.G.V. ({SAMPLE.igvPorcentaje}%)</span><span>{money(SAMPLE.total - base)}</span></div>
            <div className="flex justify-between font-bold text-[14px] text-white px-1 py-0.5 mt-1" style={{ background: COMPROBANTE_COLOR }}>
              <span>IMPORTE TOTAL</span><span>{money(SAMPLE.total)}</span>
            </div>
            <div className="font-bold pt-1">OCHENTA Y CINCO CON 00/100 SOLES</div>
          </div>
        );
      }

      case 'forma-pago':
        return (
          <div className={sizeCls}>
            <div className="font-bold pb-0.5">FORMA DE PAGO</div>
            <div className="flex justify-between"><span>Tipo</span><span>Contado</span></div>
            <div className="flex justify-between"><span>{SAMPLE.paymentMethod}</span><span>{money(SAMPLE.total)}</span></div>
          </div>
        );
    }
  })();

  return (
    <div>
      <Spacer lines={block.spaceTop} />
      {inner}
      <Spacer lines={block.spaceBottom} />
    </div>
  );
}

interface TicketPreviewProps {
  blocks: TicketBlock[];
  side: Side;
  paper: '80mm' | '58mm';
  selectedId: string | null;
  onSelect: (id: string) => void;
  negocio?: PreviewNegocio;
}

export default function TicketPreview({ blocks, side, paper, selectedId, onSelect, negocio }: TicketPreviewProps) {
  const width = paper === '80mm' ? 300 : 220;

  return (
    <div className="flex flex-col items-center">
      {/* Cabecera del rollo */}
      <div className="w-full max-w-[360px] bg-slate-800 rounded-t-2xl px-4 pt-3 pb-6 -mb-4">
        <div className="flex items-center justify-between text-white/90">
          <span className="text-[10px] font-bold tracking-wide flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {side === 'cocina' ? 'TICKET DE COCINA' : DOC_META[side].label.toUpperCase()}
          </span>
          <span className="text-[10px] text-white/60">Papel {paper}</span>
        </div>
      </div>

      {/* Papel */}
      <div
        id="ticket-paper"
        className="bg-white shadow-lg px-4 py-5 font-mono text-black relative"
        style={{ width, boxShadow: '0 10px 40px rgba(0,0,0,0.12)' }}
      >
        {blocks.filter(b => b.visible).length === 0 && (
          <p className="text-center text-slate-300 text-xs py-10 italic">Sin bloques visibles.</p>
        )}
        {blocks.map(block => {
          if (!block.visible) return null;
          const selected = block.id === selectedId;
          return (
            <div
              key={block.id}
              onClick={() => onSelect(block.id)}
              className={`relative cursor-pointer rounded transition-all ${
                selected ? 'ring-2 ring-brand ring-offset-2 ring-offset-white' : 'hover:bg-brand/5'
              }`}
            >
              {selected && (
                <span className="absolute -top-2 left-0 z-10 text-[8px] font-bold bg-brand text-white px-1.5 py-0.5 rounded uppercase tracking-wide">
                  {block.type === 'datos-pedido' ? 'Datos' : block.type === 'numero-pedido' ? 'N° Pedido' : block.type}
                </span>
              )}
              <div className="px-1 py-0.5">
                <BlockView block={block} side={side} negocio={negocio} />
              </div>
            </div>
          );
        })}
        {/* Borde dentado inferior del papel */}
        <div
          className="absolute left-0 right-0 -bottom-2 h-2"
          style={{
            background: 'radial-gradient(circle at 6px -2px, transparent 6px, white 6px) repeat-x',
            backgroundSize: '12px 12px',
          }}
        />
      </div>
    </div>
  );
}
