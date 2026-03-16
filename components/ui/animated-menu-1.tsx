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
          "fixed left-5 top-5 z-50 inline-flex size-11 items-center justify-center rounded-xl border border-amber-900/[0.08] bg-[#fffffe]/95 text-slate-950 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.20),inset_0_1px_0_rgba(255,255,255,0.9)] transition duration-200 hover:scale-[1.03] active:scale-[0.97]",
          isOpen && "pointer-events-none opacity-0",
        )}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Menu className="size-5" />
      </button>

      <button
        aria-hidden={!isOpen}
        aria-label="Close navigation"
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/28 transition-opacity duration-200 sm:backdrop-blur-[6px]",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeMenu}
        type="button"
      />

      <nav
        aria-hidden={!isOpen}
        className={cn(
          "fixed left-0 top-0 z-50 flex h-[100dvh] w-[22rem] max-w-[92vw] flex-col overflow-hidden border-r border-black/[0.06] bg-white text-slate-950 shadow-[0_40px_90px_-36px_rgba(17,17,16,0.30)] transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#c9ef38] via-[#c9ef38]/60 to-transparent" />

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
                height={1024}
                sizes="(max-width: 640px) 80vw, 24rem"
                src="/logo.png"
                width={1024}
              />
            </div>
            {title ? <h2 className="mt-3 max-w-[10ch] text-[2rem] font-semibold leading-[0.98] text-slate-950">{title}</h2> : null}
            {description ? <p className="mt-2 max-w-[24rem] text-sm leading-6 text-slate-600">{description}</p> : null}
            {isOpen && resolvedTopSlot ? <div className="mt-4">{resolvedTopSlot}</div> : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-all duration-150",
                      item.active
                        ? "bg-[#c9ef38] !text-[#111110] shadow-[0_8px_20px_-8px_rgba(140,190,0,0.40)]"
                        : "text-slate-600 hover:bg-slate-50 hover:text-[#111110]",
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
                          ? "bg-[#111110] text-white"
                          : "bg-slate-100 text-slate-500 group-hover:bg-[#c9ef38]/30 group-hover:text-[#3a5010]",
                      )}
                    >
                      <item.icon className="size-4.5" />
                    </span>
                    <span className={cn("truncate", item.active && "font-semibold text-[#111110]")}>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="shrink-0 space-y-2 border-t border-slate-100 pt-2">
              {footer}
              {hint ? (
                <div className="rounded-2xl border border-slate-200 bg-white/65 px-3 py-2 text-xs text-slate-600">
                  {hint}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </nav>

      {isMobileViewport && isOpen ? <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-10 bg-gradient-to-t from-white/35 to-transparent" /> : null}
    </>
  );
}
