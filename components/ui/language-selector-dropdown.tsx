"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type LanguageOption = {
  code: string;
  label: string;
  flag: string;
};

export function Component({
  selected,
  languages,
  onSelect,
  className,
  menuClassName,
}: {
  selected: LanguageOption;
  languages: LanguageOption[];
  onSelect: (language: LanguageOption) => void;
  className?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        className={cn(
          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
          "bg-white/70 backdrop-blur-md shadow-sm",
          "border-slate-200 text-slate-800",
          "hover:bg-white transition-all",
          className,
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{selected.flag}</span>
        <span>{selected.label}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          className={cn(
            "animate-fade-in absolute left-0 mt-2 w-48 overflow-hidden rounded-xl",
            "border border-slate-200 bg-white/95 backdrop-blur-xl shadow-lg",
            menuClassName,
          )}
        >
          {languages.map((language) => (
            <button
              key={language.code}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                selected.code === language.code
                  ? "font-semibold text-blue-600"
                  : "text-slate-800 hover:bg-slate-100",
              )}
              onClick={() => {
                onSelect(language);
                setOpen(false);
              }}
              type="button"
            >
              <span>{language.flag}</span>
              <span className="flex-1">{language.label}</span>
              {selected.code === language.code ? <Check className="h-4 w-4 text-blue-500" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
