"use client";

import { useState, useTransition } from "react";
import { UploadCloud } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { RecipeEditor } from "@/components/recipes/recipe-editor";
import type { RecipeCategoryOption } from "@/lib/recipe-categories";
import type { EditableRecipe } from "@/lib/types";
import { panelClass, primaryButtonClass } from "@/lib/ui";

type ImportResponse = {
  importId: string;
  recipe: EditableRecipe & { rawText?: string };
};

export function ImportPreviewBuilder({ availableCategories }: { availableCategories: RecipeCategoryOption[] }) {
  const { dictionary } = useLanguage();
  const [preview, setPreview] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/imports/parse", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ImportResponse & { error?: string };

      if (!response.ok) {
        setError(payload.error ?? dictionary.importBuilder.parseFailed);
        return;
      }

      setPreview(payload);
    });
  }

  return (
    <div className="space-y-6">
      <label className={`${panelClass} flex cursor-pointer flex-col items-center justify-center gap-4 border-dashed text-center`}>
        <div className="flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <UploadCloud className="size-8" />
        </div>
        <div>
          <p className="text-xl font-semibold text-slate-950">{dictionary.importBuilder.title}</p>
          <p className="mt-2 text-sm text-slate-700">{dictionary.importBuilder.description}</p>
        </div>
        <span className={primaryButtonClass}>{isPending ? dictionary.importBuilder.parsing : dictionary.importBuilder.chooseFile}</span>
        <input
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          onChange={handleUpload}
          type="file"
        />
      </label>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {preview ? (
        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
          <RecipeEditor
            availableCategories={availableCategories}
            endpoint="/api/imports/commit"
            importId={preview.importId}
            initialRecipe={preview.recipe}
            method="POST"
            submitLabel={dictionary.importBuilder.importRecipe}
          />

          <div className={`${panelClass} space-y-3`}>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-800">{dictionary.importBuilder.rawPreview}</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">{dictionary.importBuilder.parsedSourceText}</h2>
            </div>
            <pre className="max-h-[900px] overflow-auto whitespace-pre-wrap rounded-[22px] bg-slate-950 p-4 text-sm text-slate-100">
              {preview.recipe.rawText}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
