import { panelClass } from "@/lib/ui";

export function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className={`${panelClass} relative overflow-hidden`}>
      {/* Lime glow in top-left */}
      <div className="pointer-events-none absolute -left-4 -top-4 size-24 rounded-full bg-[#c9ef38]/25 blur-2xl" />
      {/* Lime accent top edge */}
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-[24px] bg-gradient-to-r from-[#c9ef38] via-[#c9ef38]/60 to-transparent" />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
        <p className="mt-3 text-5xl font-semibold tracking-tight text-[#111110]">{value}</p>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-500">{caption}</p>
      </div>
    </div>
  );
}
