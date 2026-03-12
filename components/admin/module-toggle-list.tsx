"use client";

import { useState, useTransition } from "react";
import type { Module } from "@prisma/client";
import { useLanguage } from "@/components/language-provider";
import { panelClass } from "@/lib/ui";

export function ModuleToggleList({ modules }: { modules: Module[] }) {
  const { dictionary } = useLanguage();
  const [items, setItems] = useState(modules);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateModule(key: Module["key"], enabled: boolean) {
    setError(null);
    setItems((current) => current.map((item) => (item.key === key ? { ...item, enabled } : item)));

    startTransition(async () => {
      const response = await fetch("/api/settings/modules", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key, enabled }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? dictionary.settingsPage.updateFailed);
      }
    });
  }

  return (
    <div className={`${panelClass} space-y-4`}>
      {items.map((module) => (
        <div key={module.id} className="flex items-center justify-between gap-4 rounded-[22px] border border-slate-200 px-4 py-4">
          <div>
            <p className="text-lg font-semibold text-slate-950">{dictionary.modules[module.key].label}</p>
            <p className="mt-1 text-sm text-slate-700">{dictionary.modules[module.key].description}</p>
          </div>
          <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-800">
            <span>{module.enabled ? dictionary.common.enabled : dictionary.common.disabled}</span>
            <input
              checked={module.enabled}
              disabled={isPending}
              onChange={(event) => updateModule(module.key, event.target.checked)}
              type="checkbox"
            />
          </label>
        </div>
      ))}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
