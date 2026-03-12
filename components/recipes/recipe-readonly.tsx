"use client";

import { formatIngredientAmount } from "@/lib/units";
import { panelClass } from "@/lib/ui";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { EditableRecipe } from "@/lib/types";

export function RecipeReadonly({
  recipe,
  dictionary,
  locale,
}: {
  recipe: EditableRecipe;
  dictionary: Dictionary;
  locale: Locale;
}) {
  const intlLocale = locale === "sv" ? "sv-SE" : "en-US";

  return (
    <div className="space-y-6">
      <div className={`${panelClass} space-y-5`}>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{dictionary.recipeEditor.description}</h2>
          <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-slate-700">{recipe.description}</p>
        </div>
      </div>

      <div className={`${panelClass} space-y-4`}>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{dictionary.recipeEditor.ingredientsTitle}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{dictionary.recipeEditor.ingredientsDescription}</p>
        </div>

        <div className="space-y-2">
          {recipe.ingredients.map((ingredient, index) => (
            <div
              key={`${ingredient.name}-${index}`}
              className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 transition-colors hover:border-slate-200 hover:bg-white"
            >
              <div>
                <p className="font-semibold text-slate-950">{ingredient.name}</p>
                {ingredient.note ? <p className="mt-0.5 text-sm text-slate-500">{ingredient.note}</p> : null}
              </div>
              <p className="shrink-0 font-semibold tabular-nums text-slate-950">
                {formatIngredientAmount(ingredient.quantity, ingredient.unit, intlLocale)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className={`${panelClass} space-y-4`}>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{dictionary.recipeEditor.methodTitle}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{dictionary.recipeEditor.methodDescription}</p>
        </div>

        <div className="space-y-3">
          {recipe.steps.map((step, index) => (
            <div key={`${index + 1}-${step.instruction.slice(0, 20)}`} className="flex gap-4 rounded-[20px] border border-slate-100 bg-slate-50/40 p-4 transition-colors hover:border-slate-200 hover:bg-white">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 font-semibold text-sm text-amber-800">
                {index + 1}
              </div>
              <p className="whitespace-pre-wrap text-base leading-7 text-slate-700">{step.instruction}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
