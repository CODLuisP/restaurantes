'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  segundosIniciales: number;
  snapshotAt: number;
  isLive: boolean;
}

export default function CocinaTimer({ segundosIniciales, snapshotAt, isLive }: Props) {
  const [segundos, setSegundos] = useState(
    segundosIniciales + (isLive ? Math.floor((Date.now() - snapshotAt) / 1000) : 0)
  );
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLive) { setSegundos(segundosIniciales); return; }
    const base = segundosIniciales + Math.floor((Date.now() - snapshotAt) / 1000);
    setSegundos(base);
    const start = Date.now();
    ref.current = setInterval(() => {
      setSegundos(base + Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [segundosIniciales, snapshotAt, isLive]);

  const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
  const ss = String(segundos % 60).padStart(2, '0');
  const minutos = segundos / 60;
  const color =
    minutos >= 20 ? 'bg-rose-100 text-rose-600' :
    minutos >= 10 ? 'bg-amber-100 text-amber-600' :
    minutos >= 5  ? 'bg-emerald-100 text-emerald-600' :
                    'bg-slate-100 text-slate-500';

  return (
    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full tabular-nums ${color}`}>
      {mm}:{ss}
    </span>
  );
}
