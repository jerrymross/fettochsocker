"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, type PanInfo, type Variants } from "framer-motion";
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
  const dragX = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();
  const useSimpleMotion = prefersReducedMotion || isMobileViewport;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);

    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, []);

  function closeMenu() {
    setIsOpen(false);
    dragX.set(0);
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.x < -100) {
      closeMenu();
      return;
    }

    dragX.set(0);
  }

  const menuVariants: Variants = {
    closed: {
      x: "-100%",
      transition: {
        duration: useSimpleMotion ? 0.18 : undefined,
        type: useSimpleMotion ? "tween" : "spring",
        stiffness: 220,
        damping: 30,
        mass: 0.85,
      },
    },
    open: {
      x: 0,
      transition: {
        duration: useSimpleMotion ? 0.18 : undefined,
        type: useSimpleMotion ? "tween" : "spring",
        stiffness: 220,
        damping: 30,
        mass: 0.85,
      },
    },
  };

  const itemVariants: Variants = {
    closed: { x: useSimpleMotion ? 0 : -42, opacity: 0 },
    open: (index: number) => ({
      x: 0,
      opacity: 1,
      transition: {
        delay: useSimpleMotion ? 0 : 0.1 + index * 0.06,
        duration: useSimpleMotion ? 0.12 : undefined,
        type: useSimpleMotion ? "tween" : "spring",
        stiffness: 240,
        damping: 24,
      },
    }),
  };

  const resolvedTopSlot = typeof topSlot === "function" ? topSlot({ closeMenu }) : topSlot;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "fixed left-5 top-5 z-50 inline-flex size-11 items-center justify-center rounded-xl border border-amber-900/[0.08] bg-[#fffffe]/95 text-slate-950 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.20),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur transition-opacity",
          isOpen && "opacity-0 pointer-events-none",
        )}
        type="button"
      >
        {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </motion.button>

      <AnimatePresence>
        {isOpen ? (
          <motion.button
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-slate-900/28 sm:backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMenu}
            type="button"
          />
        ) : null}
      </AnimatePresence>

      <motion.nav
        animate={isOpen ? "open" : "closed"}
        className="fixed left-0 top-0 z-50 flex h-[100dvh] w-[24rem] max-w-[92vw] flex-col overflow-hidden border-r border-black/[0.06] bg-white text-slate-950 shadow-[0_40px_90px_-36px_rgba(17,17,16,0.30)]"
        drag={useSimpleMotion ? false : "x"}
        dragConstraints={{ left: -320, right: 0 }}
        dragElastic={useSimpleMotion ? 0 : 0.16}
        initial="closed"
        onDragEnd={handleDragEnd}
        style={{ x: dragX }}
        variants={menuVariants}
      >
        {/* Lime accent top bar */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#c9ef38] via-[#c9ef38]/60 to-transparent" />

        <div className="relative flex h-full min-h-0 flex-col px-5 pb-3 pt-16">
          <motion.button
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-5 top-5 inline-flex size-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-800 transition hover:bg-white"
            initial={{ opacity: 0, scale: 0.8 }}
            onClick={closeMenu}
            transition={{ delay: 0.12 }}
            type="button"
            whileHover={{ rotate: 90, scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
          >
            <X className="size-5" />
          </motion.button>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 shrink-0"
            initial={{ opacity: 0, y: -18 }}
            transition={{ delay: 0.08, type: "spring", stiffness: 180 }}
          >
            <div className="flex flex-col gap-2">
              <Image
                alt={brand}
                className="h-auto w-full object-contain max-h-[40dvh]"
                height={1024}
                sizes="(max-width: 640px) 80vw, 24rem"
                src="/logo.png"
                width={1024}
              />
            </div>
            {title ? <h2 className="mt-3 max-w-[10ch] text-[2rem] font-semibold leading-[0.98] text-slate-950">{title}</h2> : null}
            {description ? <p className="mt-2 max-w-[24rem] text-sm leading-6 text-slate-600">{description}</p> : null}
            {resolvedTopSlot ? <div className="mt-4">{resolvedTopSlot}</div> : null}
          </motion.div>

          <div className="flex min-h-0 flex-1 flex-col">
            <ul className="flex-1 space-y-2.5 pr-1">
              {items.map((item, index) => (
                <motion.li
                  key={item.href}
                  animate={isOpen ? "open" : "closed"}
                  custom={index}
                  initial="closed"
                  variants={itemVariants}
                >
                  <Link
                    className={cn(
                      "group flex items-center gap-3.5 rounded-2xl px-3.5 py-2.5 text-[15px] font-medium transition-all",
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
                        "inline-flex size-10 shrink-0 items-center justify-center rounded-2xl transition-all",
                        item.active
                          ? "bg-[#111110] text-white"
                          : "bg-slate-100 text-slate-500 group-hover:bg-[#c9ef38]/30 group-hover:text-[#3a5010]",
                      )}
                    >
                      <item.icon className="size-5" />
                    </span>
                    <span className={cn("truncate", item.active && "text-[#111110] font-semibold")}>{item.label}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>

            <div className="shrink-0 space-y-2 pt-3">
            {footer}
            {hint ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-200 bg-white/65 px-3 py-2 text-xs text-slate-600"
                initial={{ opacity: 0, y: 18 }}
                transition={{ delay: 0.5 }}
              >
                {hint}
              </motion.div>
            ) : null}
            </div>
          </div>
        </div>
      </motion.nav>
    </>
  );
}
