"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AnimatedMenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onSelect?: () => void;
};

export default function AnimatedMenuComponent({
  brand,
  title,
  description,
  items,
  topSlot,
  footer,
  hint,
}: {
  brand: string;
  title: string;
  description: string;
  items: AnimatedMenuItem[];
  topSlot?: React.ReactNode | ((helpers: { closeMenu: () => void }) => React.ReactNode);
  footer?: React.ReactNode;
  hint?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const resolvedTopSlot = typeof topSlot === "function" ? topSlot({ closeMenu }) : topSlot;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);

    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <>
      <button
        className={cn(
          "fixed left-5 top-5 z-50 inline-flex size-11 items-center justify-center rounded-xl border border-[#e8dcc0] bg-[#fcfcfb]/95 text-[#181611] shadow-[0_8px_24px_-12px_rgba(24,22,17,0.16),inset_0_1px_0_rgba(255,255,255,0.9)] transition duration-200 hover:scale-[1.03] active:scale-[0.97]",
          isOpen && "pointer-events-none opacity-0",
        )}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Menu className="size-5" />
      </button>

      {isOpen ? (
        <>
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-[#181611]/18 transition-opacity duration-200 sm:backdrop-blur-[6px]"
            onClick={closeMenu}
            type="button"
          />

          <nav className="fixed left-0 top-0 z-50 flex h-[100dvh] w-[22rem] max-w-[92vw] flex-col overflow-hidden border-r border-[#ece4d1] bg-[#fcfcfb] text-[#181611] shadow-[0_40px_90px_-36px_rgba(24,22,17,0.18)]">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#F182EF] via-[#F182EF]/60 to-transparent" />

            <div className="relative flex h-full min-h-0 flex-col px-4 pb-3 pt-14">
              <button
                className="absolute right-5 top-5 inline-flex size-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-800 transition hover:rotate-90 hover:bg-white"
                onClick={closeMenu}
                type="button"
              >
                <X className="size-5" />
              </button>

              <div className="mb-3 shrink-0">
                <div className="flex flex-col gap-2">
                  <Image
                    alt={brand}
                    className="h-auto max-h-[7.5rem] w-full object-contain"
                    height={384}
                    sizes="(max-width: 640px) 72vw, 18rem"
                    src="/logo-384.png"
                    width={384}
                  />
                </div>
                {title ? <h2 className="mt-3 max-w-[10ch] text-[2rem] font-semibold leading-[0.98] text-[#181611]">{title}</h2> : null}
                {description ? <p className="mt-2 max-w-[24rem] text-sm leading-6 text-[#6e675c]">{description}</p> : null}
                {resolvedTopSlot ? <div className="mt-4">{resolvedTopSlot}</div> : null}
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <li key={item.href}>
                      <Link
                        className={cn(
                          "group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-all duration-150",
                          item.active
                            ? "bg-[#F182EF]/18 !text-[#181611] shadow-[0_8px_20px_-8px_rgba(241,130,239,0.30)] ring-1 ring-[#F182EF]/40"
                            : "text-[#6e675c] hover:bg-[#f3e7c3]/30 hover:text-[#181611]",
                        )}
                        href={item.href}
                        onClick={() => {
                          item.onSelect?.();
                          closeMenu();
                        }}
                      >
                        <span
                          className={cn(
                            "inline-flex size-9 shrink-0 items-center justify-center rounded-2xl transition-all",
                            item.active
                              ? "bg-[#F182EF] text-white"
                              : "bg-[#f5f0e3] text-[#817869] group-hover:bg-[#f8afe5]/25 group-hover:text-[#181611]",
                          )}
                        >
                          <item.icon className="size-4.5" />
                        </span>
                        <span className={cn("truncate", item.active && "font-semibold text-[#2a0d29]")}>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="shrink-0 space-y-2 border-t border-[#efe7d7] pt-2">
                  {footer}
                  {hint ? (
                    <div className="rounded-2xl border border-[#e7ddc6] bg-white/75 px-3 py-2 text-xs text-[#6e675c]">
                      {hint}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </nav>
        </>
      ) : null}

      {isMobileViewport && isOpen ? <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-10 bg-gradient-to-t from-white/35 to-transparent" /> : null}
    </>
  );
}
