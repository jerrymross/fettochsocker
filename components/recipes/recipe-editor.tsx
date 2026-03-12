"use client";

import { IngredientUnit } from "@prisma/client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import type { RecipeCategoryOption } from "@/lib/recipe-categories";
import { recipeInputSchema, type RecipeFormInput, type RecipeInput } from "@/lib/schemas/recipe";
import { convertToWeightGrams, ingredientUnitLabels, ingredientUnitOptions } from "@/lib/units";
import { inputClass, panelClass, primaryButtonClass, secondaryButtonClass, textareaClass } from "@/lib/ui";

const emptyRecipe: RecipeFormInput = {
  title: "",
  description: "",
  categoryIds: [],
  ingredients: [{ name: "", quantity: 100, unit: IngredientUnit.G, note: "" }],
  steps: [{ instruction: "" }],
};

export function RecipeEditor({
  endpoint,
  method,
  submitLabel,
  initialRecipe,
  importId,
  availableCategories,
}: {
  endpoint: string;
  method: "POST" | "PUT";
  submitLabel: string;
  initialRecipe?: RecipeInput;
  importId?: string;
  availableCategories: RecipeCategoryOption[];
}) {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isAddingCategory, startAddingCategory] = useTransition();
  const [categoryOptions, setCategoryOptions] = useState(availableCategories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null);
  const form = useForm<RecipeFormInput, undefined, RecipeInput>({
    resolver: zodResolver(recipeInputSchema),
    defaultValues: {
      ...emptyRecipe,
      ...initialRecipe,
      categoryIds: initialRecipe?.categoryIds ?? [],
    },
  });

  const ingredientFields = useFieldArray({
    control: form.control,
    name: "ingredients",
  });
  const stepFields = useFieldArray({
    control: form.control,
    name: "steps",
  });

  const watchedIngredients = useWatch({
    control: form.control,
    name: "ingredients",
  }) ?? [];
  const selectedCategoryIds = useWatch({
    control: form.control,
    name: "categoryIds",
  }) ?? [];
  const totalWeight = watchedIngredients.reduce(
    (sum, item) => sum + (convertToWeightGrams(Number(item?.quantity) || 0, item?.unit ?? IngredientUnit.G) ?? 0),
    0,
  );
  const hasNonWeightUnits = watchedIngredients.some((item) => item?.unit && !convertToWeightGrams(1, item.unit));

  function toggleCategory(categoryId: string) {
    const nextCategoryIds = selectedCategoryIds.includes(categoryId)
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId];

    form.setValue("categoryIds", nextCategoryIds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function handleAddCategory() {
    setNewCategoryError(null);

    startAddingCategory(async () => {
      const response = await fetch("/api/recipe-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newCategoryName }),
      });

      const payload = (await response.json()) as { error?: string; category?: RecipeCategoryOption };

      if (!response.ok || !payload.category) {
        setNewCategoryError(payload.error ?? dictionary.recipeEditor.addCategoryFailed);
        return;
      }

      const createdCategory = payload.category;

      setCategoryOptions((current) => {
        if (current.some((category) => category.id === createdCategory.id)) {
          return current;
        }

        return [...current, createdCategory];
      });

      form.setValue("categoryIds", Array.from(new Set([...selectedCategoryIds, createdCategory.id])), {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setNewCategoryName("");
    });
  }

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);

    startTransition(async () => {
      const payload = importId ? { importId, recipe: values } : values;
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string; recipe?: { id: string } };

      if (!response.ok) {
        setServerError(data.error ?? dictionary.recipeEditor.saveRecipeFailed);
        return;
      }

      const recipeId = data.recipe?.id;
      router.push(recipeId ? `/recipes/${recipeId}?saved=1` : "/recipes");
      router.refresh();
    });
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className={`${panelClass} space-y-5`}>
        <div className="grid gap-5 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="title">
              {dictionary.recipeEditor.title}
            </label>
            <input id="title" className={inputClass} {...form.register("title")} />
            {form.formState.errors.title ? (
              <p className="text-sm text-rose-600">{form.formState.errors.title.message}</p>
            ) : null}
          </div>

          <div className="rounded-[22px] bg-amber-50 px-5 py-4">
            <p className="text-sm font-medium text-amber-950">{dictionary.recipeEditor.automaticWeight}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{totalWeight.toFixed(2)} g</p>
            <p className="mt-2 text-sm text-slate-700">{dictionary.recipeEditor.automaticWeightDescription}</p>
            {hasNonWeightUnits ? <p className="mt-2 text-xs text-amber-900">{dictionary.recipeEditor.weightUnitNotice}</p> : null}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="description">
            {dictionary.recipeEditor.description}
          </label>
          <textarea id="description" className={textareaClass} {...form.register("description")} />
          {form.formState.errors.description ? (
            <p className="text-sm text-rose-600">{form.formState.errors.description.message}</p>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-700">{dictionary.recipeEditor.categories}</p>
              <p className="mt-1 text-sm text-slate-500">{dictionary.recipeEditor.categoriesDescription}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className={`${inputClass} min-w-[220px]`}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder={dictionary.recipeEditor.newCategoryPlaceholder}
                type="text"
                value={newCategoryName}
              />
              <button
                className={secondaryButtonClass}
                disabled={isAddingCategory || newCategoryName.trim().length < 2}
                onClick={handleAddCategory}
                type="button"
              >
                <Plus className="mr-2 size-4" />
                {isAddingCategory ? dictionary.recipeEditor.creatingCategory : dictionary.recipeEditor.addCategory}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((category) => {
              const isSelected = selectedCategoryIds.includes(category.id);

              return (
                <button
                  key={category.id}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                  onClick={() => toggleCategory(category.id)}
                  type="button"
                >
                  {category.name}
                </button>
              );
            })}
          </div>

          {form.formState.errors.categoryIds ? (
            <p className="text-sm text-rose-600">{form.formState.errors.categoryIds.message}</p>
          ) : null}
          {newCategoryError ? <p className="text-sm text-rose-600">{newCategoryError}</p> : null}
        </div>
      </div>

      <div className={`${panelClass} space-y-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">{dictionary.recipeEditor.ingredientsTitle}</h2>
            <p className="text-sm text-slate-700">{dictionary.recipeEditor.ingredientsDescription}</p>
          </div>
          <button
            className={secondaryButtonClass}
            onClick={() => ingredientFields.append({ name: "", quantity: 100, unit: IngredientUnit.G, note: "" })}
            type="button"
          >
            <Plus className="mr-2 size-4" />
            {dictionary.recipeEditor.addIngredient}
          </button>
        </div>

        <div className="space-y-4">
          {ingredientFields.fields.map((field, index) => (
            <div key={field.id} className="grid gap-3 rounded-[22px] border border-slate-200 p-4 sm:grid-cols-[1.5fr_0.5fr_0.4fr] lg:grid-cols-[1.35fr_0.55fr_0.4fr_1fr_auto]">
              <input className={inputClass} placeholder={dictionary.recipeEditor.ingredientName} {...form.register(`ingredients.${index}.name`)} />
              <input
                className={inputClass}
                min={1}
                placeholder={dictionary.recipeEditor.quantity}
                step="0.01"
                type="number"
                {...form.register(`ingredients.${index}.quantity`, { valueAsNumber: true })}
              />
              <select className={inputClass} {...form.register(`ingredients.${index}.unit`)}>
                {ingredientUnitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {ingredientUnitLabels[unit]}
                  </option>
                ))}
              </select>
              <input className={`${inputClass} sm:col-span-2 lg:col-span-1`} placeholder={dictionary.recipeEditor.optionalNote} {...form.register(`ingredients.${index}.note`)} />
              <button
                className={`${secondaryButtonClass} px-3`}
                disabled={ingredientFields.fields.length === 1}
                onClick={() => ingredientFields.remove(index)}
                type="button"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={`${panelClass} space-y-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">{dictionary.recipeEditor.methodTitle}</h2>
            <p className="text-sm text-slate-700">{dictionary.recipeEditor.methodDescription}</p>
          </div>
          <button
            className={secondaryButtonClass}
            onClick={() => stepFields.append({ instruction: "" })}
            type="button"
          >
            <Plus className="mr-2 size-4" />
            {dictionary.recipeEditor.addStep}
          </button>
        </div>

        <div className="space-y-4">
          {stepFields.fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 rounded-[22px] border border-slate-200 p-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 font-sans text-sm font-semibold text-slate-900">
                {index + 1}
              </div>
              <div className="flex-1 space-y-2">
                <textarea
                  className={textareaClass}
                  placeholder={dictionary.recipeEditor.describeStep}
                  {...form.register(`steps.${index}.instruction`)}
                />
              </div>
              <button
                className={`${secondaryButtonClass} h-11 px-3`}
                disabled={stepFields.fields.length === 1}
                onClick={() => stepFields.remove(index)}
                type="button"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {serverError ? <p className="text-sm text-rose-600">{serverError}</p> : null}

      <button className={primaryButtonClass} disabled={isPending} type="submit">
        {isPending ? dictionary.recipeEditor.saving : submitLabel}
      </button>
    </form>
  );
}
