"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import type { RecipeCategoryOption } from "@/lib/recipe-categories";
import { inputClass } from "@/lib/ui";

type RecipeListItem = {
  id: string;
  title: string;
  description: string;
  categories: RecipeCategoryOption[];
  totalWeight: string;
  ingredientCount: number;
  updatedAt: string;
  updatedAtValue: string;
};

export function RecipeList({
  recipes,
  categories,
  labels,
}: {
  recipes: RecipeListItem[];
  categories: RecipeCategoryOption[];
  labels: {
    searchPlaceholder: string;
    noRecipes: string;
    noMatches: string;
    recipe: string;
    category: string;
    allCategories: string;
    sortBy: string;
    sortUpdated: string;
    sortTitle: string;
    sortCategory: string;
    uncategorized: string;
    totalWeight: string;
    ingredients: string;
    updated: string;
  };
}) {
  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"UPDATED" | "TITLE" | "CATEGORY">("UPDATED");

  const filteredRecipes = recipes
    .filter((recipe) => {
      const normalizedQuery = query.trim().toLowerCase();
      const matchesQuery =
        normalizedQuery === "" ||
        recipe.title.toLowerCase().includes(normalizedQuery) ||
        recipe.categories.some((category) => category.name.toLowerCase().includes(normalizedQuery));

      const matchesCategory =
        selectedCategoryId === "ALL" || recipe.categories.some((category) => category.id === selectedCategoryId);

      return matchesQuery && matchesCategory;
    })
    .sort((left, right) => {
      if (sortBy === "TITLE") {
        return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
      }

      if (sortBy === "CATEGORY") {
        const leftCategory = left.categories.map((category) => category.name).sort()[0] ?? labels.uncategorized;
        const rightCategory = right.categories.map((category) => category.name).sort()[0] ?? labels.uncategorized;
        const categoryComparison = leftCategory.localeCompare(rightCategory, undefined, { sensitivity: "base" });

        if (categoryComparison !== 0) {
          return categoryComparison;
        }

        return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
      }

      return right.updatedAtValue.localeCompare(left.updatedAtValue);
    });

  return (
    <div className="space-y-0">
      <div className="space-y-4 border-b border-slate-100 px-6 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClass} pl-10`}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={labels.searchPlaceholder}
              type="text"
              value={query}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{labels.sortBy}</label>
            <select
              className={`${inputClass} min-w-[220px]`}
              onChange={(event) => setSortBy(event.target.value as "UPDATED" | "TITLE" | "CATEGORY")}
              value={sortBy}
            >
              <option value="UPDATED">{labels.sortUpdated}</option>
              <option value="TITLE">{labels.sortTitle}</option>
              <option value="CATEGORY">{labels.sortCategory}</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{labels.category}</p>
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategoryId === "ALL"
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
              onClick={() => setSelectedCategoryId("ALL")}
              type="button"
            >
              {labels.allCategories}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  selectedCategoryId === category.id
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
                onClick={() => setSelectedCategoryId(category.id)}
                type="button"
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden md:grid md:grid-cols-[1.5fr_0.55fr_0.55fr_0.4fr_0.5fr_auto] gap-4 border-b border-slate-200 bg-slate-50/70 px-6 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{labels.recipe}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{labels.category}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{labels.totalWeight}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{labels.ingredients}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{labels.updated}</span>
        <span className="w-5" />
      </div>

      {filteredRecipes.map((recipe) => (
        <Link
          key={recipe.id}
          className="group block border-b border-slate-100 transition-all duration-150 hover:bg-[#c9ef38]/10 last:border-b-0"
          href={`/recipes/${recipe.id}`}
        >
          {/* Mobile layout */}
          <div className="flex items-center gap-3 px-4 py-4 md:hidden">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-950">{recipe.title}</p>
              {recipe.description ? <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{recipe.description}</p> : null}
              {recipe.categories.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {recipe.categories.map((category) => (
                    <span key={category.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {category.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <ChevronRight className="size-4 shrink-0 text-slate-300 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-[#5a7020]" />
          </div>
          {/* Desktop layout */}
          <div className="hidden md:grid md:grid-cols-[1.5fr_0.55fr_0.55fr_0.4fr_0.5fr_auto] items-center gap-4 px-6 py-4">
            <div className="min-w-0">
              <p className="font-semibold text-slate-950">{recipe.title}</p>
              <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{recipe.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {recipe.categories.length > 0 ? (
                recipe.categories.map((category) => (
                  <span key={category.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {category.name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400">{labels.uncategorized}</span>
              )}
            </div>
            <span className="text-sm text-slate-700">{recipe.totalWeight}</span>
            <span className="text-sm text-slate-700">{recipe.ingredientCount}</span>
            <span className="text-sm text-slate-500">{recipe.updatedAt}</span>
            <ChevronRight className="size-4 text-slate-300 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-[#5a7020]" />
          </div>
        </Link>
      ))}

      {recipes.length === 0 ? (
        <div className="px-6 py-12 text-sm text-slate-500">{labels.noRecipes}</div>
      ) : null}

      {recipes.length > 0 && filteredRecipes.length === 0 ? (
        <div className="px-6 py-12 text-sm text-slate-500">{labels.noMatches}</div>
      ) : null}
    </div>
  );
}
