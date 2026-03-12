"use client";

import { useMemo, useState, useTransition } from "react";
import { Download } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { inputClass, panelClass, primaryButtonClass } from "@/lib/ui";

type ExportableRecipe = {
  id: string;
  title: string;
  description: string;
  totalWeightGrams: number;
};

export function ExportBuilder({ recipes }: { recipes: ExportableRecipe[] }) {
  const { dictionary } = useLanguage();
  const [selectedIds, setSelectedIds] = useState<string[]>(recipes[0] ? [recipes[0].id] : []);
  const [title, setTitle] = useState<string>(dictionary.exportBuilder.defaultCollectionTitle);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);

  function toggleRecipe(recipeId: string) {
    setSelectedIds((current) =>
      current.includes(recipeId) ? current.filter((id) => id !== recipeId) : [...current, recipeId],
    );
  }

  function downloadPdf() {
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/exports/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          recipeIds: selectedIds,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? dictionary.exportBuilder.exportFailed);
        return;
      }

      const blob = await response.blob();
      const fileName =
        response.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ?? "recipes.pdf";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1.1fr_0.8fr]">
      <div className={`${panelClass} space-y-4`}>
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">{dictionary.exportBuilder.selectRecipes}</h2>
          <p className="mt-2 text-sm text-slate-700">{dictionary.exportBuilder.selectRecipesDescription}</p>
        </div>
        <div className="space-y-3">
          {recipes.map((recipe) => {
            const checked = selectedIds.includes(recipe.id);

            return (
              <label
                key={recipe.id}
                className={`flex cursor-pointer items-start gap-4 rounded-[22px] border px-4 py-4 transition ${checked ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white"}`}
              >
                <input checked={checked} onChange={() => toggleRecipe(recipe.id)} type="checkbox" />
                <div className="space-y-1">
                  <p className="font-medium text-slate-950">{recipe.title}</p>
                  <p className="text-sm text-slate-700">{recipe.description}</p>
                  <p className="text-sm text-slate-600">{recipe.totalWeightGrams.toFixed(2)} g {dictionary.exportBuilder.total}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className={`${panelClass} space-y-4`}>
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">{dictionary.exportBuilder.exportSettings}</h2>
          <p className="mt-2 text-sm text-slate-700">{dictionary.exportBuilder.exportSettingsDescription}</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="collection-title">
            {dictionary.exportBuilder.collectionTitle}
          </label>
          <input
            id="collection-title"
            className={inputClass}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="rounded-[22px] bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-950">{dictionary.exportBuilder.selectedRecipes}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{selectedCount}</p>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <button
          className={`${primaryButtonClass} w-full`}
          disabled={selectedCount === 0 || isPending}
          onClick={downloadPdf}
          type="button"
        >
          <Download className="mr-2 size-4" />
          {isPending ? dictionary.exportBuilder.buildPdf : dictionary.exportBuilder.exportPdf}
        </button>
      </div>
    </div>
  );
}
