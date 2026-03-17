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
      <div className="pointer-events-none absolute -left-4 -top-4 size-24 rounded-full bg-[#f8afe5]/20 blur-2xl" />
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-[24px] bg-gradient-to-r from-[#98b694] via-[#98b694]/65 to-transparent" />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#817869]">{label}</p>
        <p className="mt-3 text-5xl font-semibold tracking-tight text-[#181611]">{value}</p>
        <p className="mt-2.5 text-sm leading-relaxed text-[#6e675c]">{caption}</p>
      </div>
    </div>
  );
}
