import { STAT_TONES } from "./types";

export default function StatChip({
  icon,
  tone,
  label,
  value,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: number;
}) {
  return (
    <div className="card p-3 flex items-center gap-3">
      <div
        className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${STAT_TONES[tone]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide truncate mt-1">
          {label}
        </p>
      </div>
    </div>
  );
}
