"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";

export function DeleteRecipeButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(dictionary.recipesPage.deleteConfirm)) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? dictionary.recipesPage.deleteFailed);
        return;
      }

      router.push("/recipes");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <button
        className="inline-flex items-center justify-center rounded-2xl border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"
        disabled={isPending}
        onClick={handleDelete}
        type="button"
      >
        <Trash2 className="mr-2 size-4" />
        {isPending ? dictionary.recipesPage.deletingRecipe : dictionary.recipesPage.deleteRecipe}
      </button>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
