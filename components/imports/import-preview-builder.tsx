"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import type { RecipeCategoryOption } from "@/lib/recipe-categories";
import type { EditableRecipe } from "@/lib/types";
import { panelClass, primaryButtonClass } from "@/lib/ui";

type ImportResponse = {
  importId: string;
  recipe: EditableRecipe & { rawText?: string };
};

const RecipeEditor = dynamic(
  () => import("@/components/recipes/recipe-editor").then((module) => module.RecipeEditor),
  {
    loading: () => <div className={`${panelClass} min-h-[18rem] animate-pulse bg-slate-50/70`} />,
  },
);

export function ImportPreviewBuilder({
  availableCategories,
  canManageVisibility = false,
}: {
  availableCategories: RecipeCategoryOption[];
  canManageVisibility?: boolean;
}) {
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
      try {
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
      } catch (currentError) {
        setError(currentError instanceof Error ? currentError.message : dictionary.importBuilder.parseFailed);
      } finally {
        event.target.value = "";
      }
    });
  }
  const actionLabel = isPending ? dictionary.importBuilder.parsing : null;

  return (
    <div className="space-y-6">
      <div className={`${panelClass} flex flex-col items-center justify-center gap-4 border-dashed text-center`}>
        <div className="flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <UploadCloud className="size-8" />
        </div>
        <div>
          <p className="text-xl font-semibold text-slate-950">{dictionary.importBuilder.title}</p>
          <p className="mt-2 text-sm text-slate-700">{dictionary.importBuilder.description}</p>
        </div>
        <div className="flex w-full flex-col justify-center gap-3 sm:flex-row">
          <label className={`${primaryButtonClass} cursor-pointer gap-2`}>
            <FileText className="size-4" />
            <span>{actionLabel ?? dictionary.importBuilder.chooseDocument}</span>
            <input
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={handleUpload}
              type="file"
            />
          </label>
        </div>
        <p className="text-xs text-slate-500">{dictionary.importBuilder.supportedFormats}</p>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {preview ? (
        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
          <RecipeEditor
            availableCategories={availableCategories}
            canManageVisibility={canManageVisibility}
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
