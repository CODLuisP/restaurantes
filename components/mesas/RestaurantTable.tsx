'use client';

import type { Table } from '@/types';

/* Geometría (coordenadas SVG). SCALE reduce todo el dibujo para cards más compactas. */
const SCALE = 0.78;
const BODY_W = Math.round(96 * SCALE);  // ancho del tablero por mesa
const BODY_H = Math.round(58 * SCALE);  // alto del tablero (mesa apaisada, no cuadrada)
const CD = Math.round(28 * SCALE);      // profundidad de la silla (para offset de posición)
const GAP = Math.round(3 * SCALE) || 2; // separación silla ↔ mesa
const PAD = CD + GAP + Math.round(4 * SCALE); // margen para sillas en cada lado

export type UnitStatus = 'disponible' | 'ocupada' | 'reservada';

/* Colores de las sillas tapizadas según el estado */
interface ChairTokens { base: string; seat: string; stroke: string; }
const CHAIR: Record<UnitStatus, ChairTokens> = {
  disponible: { base: '#2f7d76', seat: '#3f948d', stroke: '#235e58' },
  ocupada:    { base: '#b14a54', seat: '#c66670', stroke: '#8f3a43' },
  reservada:  { base: '#c0883a', seat: '#d3a04c', stroke: '#9a6d2b' },
};

/* Madera del tablero */
const WOOD = { base: '#b5834e', edge: '#7c5327', grain: 'rgba(85,52,20,0.28)' };

/** Reparte la capacidad entre lados largos y extremos, como en un salón real. */
function seatLayout(capacidad: number) {
  const ends = capacidad >= 6 ? 2 : 0;      // una silla en cada cabecera
  const rest = capacidad - ends;
  const top = Math.ceil(rest / 2);
  const bottom = Math.floor(rest / 2);
  return { top, bottom, left: ends >= 1 ? 1 : 0, right: ends >= 2 ? 1 : 0 };
}

/** Posiciones equiespaciadas a lo largo de un tramo. */
function spread(n: number, from: number, span: number): number[] {
  if (n <= 0) return [];
  const usable = span - 24;
  return Array.from({ length: n }, (_, i) => from + 12 + ((i + 0.5) * usable) / n);
}

interface RestaurantTableProps {
  members: Table[];
  status: UnitStatus;
  capacidad: number;
  label: string;
  selected?: boolean;
  className?: string;
}

/** Sillón tapizado visto desde arriba, centrado en el origen y mirando hacia +Y (la mesa).
 *  El respaldo (curvo y más ancho) queda arriba; el asiento y los apoyabrazos hacia abajo. */
function Chair({ cx, cy, rot, tok, k }: { cx: number; cy: number; rot: number; tok: ChairTokens; k: string }) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${SCALE})`} key={k}>
      {/* Cuerpo del sillón: respaldo curvo ancho arriba, asiento hacia la mesa (tub chair) */}
      <path
        d="M -16,-7
           C -16,-15 -9,-18 0,-18
           C 9,-18 16,-15 16,-7
           L 15,8
           C 15,13 11,15 6,15
           L -6,15
           C -11,15 -15,13 -15,8
           Z"
        fill={tok.base} stroke={tok.stroke} strokeWidth={1.4} strokeLinejoin="round"
      />
      {/* Respaldo (banda superior curva, un poco más oscura) */}
      <path
        d="M -14,-8 C -14,-15 -7,-16 0,-16 C 7,-16 14,-15 14,-8 L 14,-3 C 8,-6 -8,-6 -14,-3 Z"
        fill={tok.stroke} opacity={0.38}
      />
      {/* Apoyabrazos (dos almohadillas laterales, por encima del asiento) */}
      <rect x={-16} y={-3} width={8} height={16} rx={4} fill={tok.base} stroke={tok.stroke} strokeWidth={1.1} />
      <rect x={8} y={-3} width={8} height={16} rx={4} fill={tok.base} stroke={tok.stroke} strokeWidth={1.1} />
      {/* Cojín del asiento, entre los apoyabrazos */}
      <path
        d="M -7,-3 C -4,-5 4,-5 7,-3 L 7,9 C 7,12 4,13 2,13 L -2,13 C -4,13 -7,12 -7,9 Z"
        fill={tok.seat}
      />
    </g>
  );
}

export function RestaurantTable({
  members, status, capacidad, label, selected, className,
}: RestaurantTableProps) {
  const n = members.length;
  const bodyW = BODY_W * n;
  const svgW = bodyW + PAD * 2;
  const svgH = BODY_H + PAD * 2;
  const tok = CHAIR[status];

  const bx = PAD;                 // esquina sup-izq del tablero
  const by = PAD;
  const lay = seatLayout(capacidad);

  const topXs = spread(lay.top, bx, bodyW);
  const botXs = spread(lay.bottom, bx, bodyW);
  const midY = by + BODY_H / 2;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className={className}
      style={{ width: '100%', height: 'auto', maxWidth: svgW, display: 'block', margin: '0 auto' }}
    >
      {/* ── Sillas ── */}
      {topXs.map((x, i) => <Chair key={`t${i}`} k={`t${i}`} cx={x} cy={by - GAP - CD / 2} rot={0} tok={tok} />)}
      {botXs.map((x, i) => <Chair key={`b${i}`} k={`b${i}`} cx={x} cy={by + BODY_H + GAP + CD / 2} rot={180} tok={tok} />)}
      {lay.left ? <Chair k="l" cx={bx - GAP - CD / 2} cy={midY} rot={270} tok={tok} /> : null}
      {lay.right ? <Chair k="r" cx={bx + bodyW + GAP + CD / 2} cy={midY} rot={90} tok={tok} /> : null}

      {/* ── Tablero de madera ── */}
      <rect x={bx} y={by} width={bodyW} height={BODY_H} rx={12}
        fill={WOOD.base} stroke={WOOD.edge} strokeWidth={2.5} />
      {/* vetas horizontales */}
      {[0.18, 0.34, 0.5, 0.66, 0.82].map((f, i) => (
        <line key={`g${i}`} x1={bx + 6} y1={by + BODY_H * f} x2={bx + bodyW - 6} y2={by + BODY_H * f}
          stroke={WOOD.grain} strokeWidth={i % 2 ? 1 : 1.6} />
      ))}
      {/* brillo superior y sombra inferior para dar volumen */}
      <rect x={bx} y={by} width={bodyW} height={BODY_H / 2} rx={12} fill="#ffffff" opacity={0.06} />
      <rect x={bx} y={by + BODY_H / 2} width={bodyW} height={BODY_H / 2} rx={12} fill="#000000" opacity={0.06} />
      {/* uniones entre mesas juntadas */}
      {n > 1 && Array.from({ length: n - 1 }, (_, i) => (
        <line key={`u${i}`} x1={bx + BODY_W * (i + 1)} y1={by + 3} x2={bx + BODY_W * (i + 1)} y2={by + BODY_H - 3}
          stroke={WOOD.edge} strokeWidth={2} opacity={0.55} />
      ))}

      {/* ── Número de mesa (chapa clara para legibilidad) ── */}
      <g>
        <rect x={svgW / 2 - (n > 1 ? 26 : 18)} y={midY - 13} width={n > 1 ? 52 : 36} height={26} rx={13}
          fill="#fdf6e3" opacity={0.92} />
        <text x={svgW / 2} y={midY} textAnchor="middle" dominantBaseline="central"
          fontSize={n > 1 ? 15 : 18} fontWeight={800} fill="#5b3a1a" style={{ fontFamily: 'inherit' }}>
          {label}
        </text>
      </g>

      {/* selección para unir */}
      {selected && (
        <rect x={bx - 4} y={by - 4} width={bodyW + 8} height={BODY_H + 8} rx={16}
          fill="none" stroke="#6366f1" strokeWidth={3} />
      )}
    </svg>
  );
}
