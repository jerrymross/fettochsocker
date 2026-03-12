export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 px-4 pb-2 sm:px-0 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-white/65">
          <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[#c9ef38]">
            <span className="size-1.5 rounded-full bg-[#111110]" />
          </span>
          {eyebrow}
        </p>
        <h1 className="mt-2 text-[2rem] font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-[2.5rem]">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-white/65">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
