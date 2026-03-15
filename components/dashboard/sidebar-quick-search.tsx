"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type SearchRecipe = {
  id: string;
  title: string;
};

export function SidebarQuickSearch({
  placeholder,
  noMatchesLabel,
  loadingLabel,
  onNavigate,
}: {
  placeholder: string;
  noMatchesLabel: string;
  loadingLabel: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const normalizedQuery = deferredQuery.trim();

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/recipes/search?query=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setResults([]);
          return;
        }

        const payload = (await response.json()) as { recipes?: SearchRecipe[] };
        setResults(payload.recipes ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [normalizedQuery]);

  function handleSelect(recipeId: string) {
    setQuery("");
    setResults([]);
    onNavigate?.();
    router.push(`/recipes/${recipeId}`);
    router.refresh();
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/85 px-3 py-2 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)] backdrop-blur">
        <Search className="size-4 text-slate-500" />
        <input
          className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-500"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          type="text"
          value={query}
        />
      </div>

      {normalizedQuery.length >= 2 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-10 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/96 shadow-[0_20px_44px_-24px_rgba(15,23,42,0.28)] backdrop-blur">
          {isLoading ? (
            <div className="px-3 py-3 text-sm text-slate-600">{loadingLabel}</div>
          ) : results.length > 0 ? (
            results.map((recipe) => (
              <button
                key={recipe.id}
                className={cn(
                  "flex w-full items-center justify-between border-b border-slate-100 px-3 py-2.5 text-left text-sm text-slate-800 transition hover:bg-slate-50",
                  "last:border-b-0",
                )}
                onClick={() => handleSelect(recipe.id)}
                type="button"
              >
                <span className="truncate">{recipe.title}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-sm text-slate-600">{noMatchesLabel}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
