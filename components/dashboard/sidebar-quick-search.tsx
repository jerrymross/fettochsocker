"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type SearchRecipe = {
  id: string;
  title: string;
};

export function SidebarQuickSearch({
  recipes,
  placeholder,
  noMatchesLabel,
  onNavigate,
}: {
  recipes: SearchRecipe[];
  placeholder: string;
  noMatchesLabel: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRecipes =
    normalizedQuery === ""
      ? []
      : recipes.filter((recipe) => recipe.title.toLowerCase().includes(normalizedQuery)).slice(0, 6);

  function handleSelect(recipeId: string) {
    setQuery("");
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

      {normalizedQuery ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-10 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/96 shadow-[0_20px_44px_-24px_rgba(15,23,42,0.28)] backdrop-blur">
          {filteredRecipes.length > 0 ? (
            filteredRecipes.map((recipe) => (
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
