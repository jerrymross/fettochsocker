"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { RecipeDocumentActions } from "@/components/recipes/recipe-document-actions";
import type { PrintableRecipeDocument } from "@/lib/printable-recipe";
import type { EditableRecipe } from "@/lib/types";
import { formatIngredientAmount, usesWeightUnit } from "@/lib/units";
import { inputClass, panelClass } from "@/lib/ui";
import { slugify } from "@/lib/utils";

export function RecipeScaler({
  recipe,
  totalWeightGrams,
  pdfEnabled = true,
}: {
  recipe: EditableRecipe;
  totalWeightGrams: number;
  pdfEnabled?: boolean;
}) {
  const { dictionary } = useLanguage();
  const [mode, setMode] = useState<"TOTAL_WEIGHT" | "PORTIONS">("TOTAL_WEIGHT");
  const [targetTotalWeight, setTargetTotalWeight] = useState(totalWeightGrams || 1);
  const [portionWeight, setPortionWeight] = useState(250);
  const [portionCount, setPortionCount] = useState(1);

  const computedTargetWeight = mode === "TOTAL_WEIGHT" ? targetTotalWeight : portionWeight * portionCount;
  const factor = totalWeightGrams > 0 ? computedTargetWeight / totalWeightGrams : 1;

  const scaledIngredients = useMemo(
    () =>
      recipe.ingredients.map((ingredient) => ({
        ...ingredient,
        scaledQuantity: Number((ingredient.quantity * factor).toFixed(2)),
      })),
    [factor, recipe.ingredients],
  );
  const hasNonWeightUnits = recipe.ingredients.some((ingredient) => !usesWeightUnit(ingredient.unit, ingredient.name));
  const scaledDocument = useMemo<PrintableRecipeDocument>(
    () => ({
      title: recipe.title,
      description: recipe.description,
      totalWeightGrams: Number(computedTargetWeight.toFixed(2)),
      meta: [
        {
          label: dictionary.scaler.factor,
          value: `${factor.toFixed(4)}x`,
        },
        {
          label: dictionary.scaler.computedTargetWeight,
          value: `${computedTargetWeight.toFixed(2)} g`,
        },
        {
          label: mode === "TOTAL_WEIGHT" ? dictionary.scaler.targetWeight : dictionary.scaler.portionPlan,
          value:
            mode === "TOTAL_WEIGHT"
              ? `${targetTotalWeight.toFixed(2)} g`
              : `${portionWeight.toFixed(2)} g x ${portionCount}`,
        },
      ],
      ingredients: scaledIngredients.map((ingredient) => ({
        name: ingredient.name,
        quantity: ingredient.scaledQuantity,
        unit: ingredient.unit,
        note: ingredient.note,
      })),
      steps: recipe.steps,
    }),
    [
      computedTargetWeight,
      dictionary.scaler.computedTargetWeight,
      dictionary.scaler.factor,
      dictionary.scaler.portionPlan,
      dictionary.scaler.targetWeight,
      factor,
      mode,
      portionCount,
      portionWeight,
      recipe.description,
      recipe.steps,
      recipe.title,
      scaledIngredients,
      targetTotalWeight,
    ],
  );
  const scaledFileName = `${slugify(recipe.title)}-scaled.pdf`;

  return (
    <div className={`${panelClass} space-y-5`}>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-amber-800">{dictionary.scaler.eyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">{dictionary.scaler.title}</h2>
        <p className="mt-2 text-sm text-slate-700">{dictionary.scaler.description}</p>
      </div>

      <div className="flex gap-3">
        <button
          className={`rounded-2xl px-4 py-2 text-sm font-medium ${mode === "TOTAL_WEIGHT" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
          onClick={() => setMode("TOTAL_WEIGHT")}
          type="button"
        >
          {dictionary.scaler.targetWeight}
        </button>
        <button
          className={`rounded-2xl px-4 py-2 text-sm font-medium ${mode === "PORTIONS" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
          onClick={() => setMode("PORTIONS")}
          type="button"
        >
          {dictionary.scaler.portionPlan}
        </button>
      </div>

      {mode === "TOTAL_WEIGHT" ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">{dictionary.scaler.targetTotalWeight}</label>
          <input
            className={inputClass}
            min={1}
            step="0.01"
            type="number"
            value={targetTotalWeight}
            onChange={(event) => setTargetTotalWeight(Number(event.target.value) || 1)}
          />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">{dictionary.scaler.portionWeight}</label>
            <input
              className={inputClass}
              min={1}
              step="0.01"
              type="number"
              value={portionWeight}
              onChange={(event) => setPortionWeight(Number(event.target.value) || 1)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">{dictionary.scaler.portionCount}</label>
            <input
              className={inputClass}
              min={1}
              step="1"
              type="number"
              value={portionCount}
              onChange={(event) => setPortionCount(Number(event.target.value) || 1)}
            />
          </div>
        </div>
      )}

      <div className="rounded-[22px] bg-slate-50 p-4">
        <p className="text-sm text-slate-700">{dictionary.scaler.computedTargetWeight}</p>
        <p className="mt-2 text-3xl font-semibold text-slate-950">{computedTargetWeight.toFixed(2)} g</p>
        <p className="mt-2 text-sm text-slate-700">{dictionary.scaler.factor}: {factor.toFixed(4)}x</p>
        {hasNonWeightUnits ? <p className="mt-2 text-xs text-amber-900">{dictionary.scaler.weightUnitNotice}</p> : null}
      </div>

      <RecipeDocumentActions compact fileName={scaledFileName} pdfEnabled={pdfEnabled} recipeDocument={scaledDocument} />

      <div className="space-y-3">
        {scaledIngredients.map((ingredient) => (
          <div key={`${ingredient.name}-${ingredient.note ?? ""}`} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
            <div>
              <p className="font-medium text-slate-900">{ingredient.name}</p>
              <p className="text-sm text-slate-600">{dictionary.scaler.base} {formatIngredientAmount(ingredient.quantity, ingredient.unit)}</p>
            </div>
            <p className="font-sans text-base font-semibold text-slate-950">{formatIngredientAmount(ingredient.scaledQuantity, ingredient.unit)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
