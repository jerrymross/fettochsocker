import Link from "next/link";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { DeleteRecipeButton } from "@/components/recipes/delete-recipe-button";
import { RecipeDocumentActions } from "@/components/recipes/recipe-document-actions";
import { RecipeReadonly } from "@/components/recipes/recipe-readonly";
import { RecipeScaler } from "@/components/recipes/recipe-scaler";
import { getDictionary } from "@/lib/i18n";
import type { PrintableRecipeDocument } from "@/lib/printable-recipe";
import { listRecipeCategories } from "@/lib/server/recipe-categories";
import { getLocale } from "@/lib/server/locale";
import { isModuleEnabled, requireModuleEnabled } from "@/lib/server/modules";
import { getRecipeById } from "@/lib/server/recipes";
import { requireSession } from "@/lib/server/session";
import { formatDateTime, formatGrams, slugify, toNumber } from "@/lib/utils";
import { panelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

const RecipeEditor = dynamic(
  () => import("@/components/recipes/recipe-editor").then((module) => module.RecipeEditor),
  {
    loading: () => <div className={`${panelClass} min-h-[24rem] animate-pulse bg-slate-50/70`} />,
  },
);

export default async function RecipeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ recipeId: string }>;
  searchParams: Promise<{ edit?: string; saved?: string }>;
}) {
  const localePromise = getLocale();
  const sessionPromise = requireSession();
  const [{ recipeId }, { edit, saved }, locale, session] = await Promise.all([
    params,
    searchParams,
    localePromise,
    sessionPromise,
    requireModuleEnabled("RECIPES"),
  ]);
  const dictionary = getDictionary(locale);
  const [exportEnabled, availableCategories, recipe] = await Promise.all([
    isModuleEnabled("EXPORT"),
    listRecipeCategories(),
    getRecipeById(recipeId, session.userId, session.role),
  ]);

  if (!recipe) {
    notFound();
  }

  const canManageRecipe = session.role === "ADMIN" || recipe.authorId === session.userId;
  const isEditMode = edit === "1" && canManageRecipe;
  const showSavedState = saved === "1";

  const editableRecipe = {
    title: recipe.title,
    description: recipe.description,
    categoryIds: recipe.categories.map((item) => item.categoryId),
    isPublic: recipe.isPublic,
    ingredients: recipe.ingredients.map((item) => ({
      name: item.ingredient.name,
      quantity: toNumber(item.quantity),
      unit: item.unit,
      note: item.note ?? "",
    })),
    steps: recipe.steps.map((step) => ({
      instruction: step.instruction,
    })),
  };
  const savedAt = formatDateTime(recipe.updatedAt, locale);
  const createdAt = formatDateTime(recipe.createdAt, locale);
  const recipeDocument: PrintableRecipeDocument = {
    title: recipe.title,
    description: recipe.description,
    totalWeightGrams: toNumber(recipe.totalWeightGrams),
    ingredients: editableRecipe.ingredients,
    steps: editableRecipe.steps,
    meta: [
      {
        label: dictionary.recipesPage.updatedAt,
        value: savedAt,
      },
      {
        label: dictionary.recipesPage.createdAt,
        value: createdAt,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        description={dictionary.recipesPage.detailDescription}
        eyebrow={dictionary.recipesPage.detailEyebrow}
        title={recipe.title}
        actions={
          isEditMode ? (
            <Link className={secondaryButtonClass} href={`/recipes/${recipe.id}`}>
              {dictionary.recipesPage.cancelEditing}
            </Link>
          ) : null
        }
      />

      {recipe.categories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {recipe.categories
            .map((item) => item.category)
            .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }))
            .map((category) => (
              <span key={category.id} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
                {category.name}
              </span>
            ))}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-6">
          {!isEditMode ? (
            <RecipeDocumentActions
              fileName={`${slugify(recipe.title)}.pdf`}
              pdfEnabled={exportEnabled}
              recipeDocument={recipeDocument}
              trailingActions={
                canManageRecipe ? (
                  <>
                    <DeleteRecipeButton recipeId={recipe.id} />
                    <Link className={primaryButtonClass} href={`/recipes/${recipe.id}?edit=1`}>
                      {dictionary.recipesPage.editRecipe}
                    </Link>
                  </>
                ) : null
              }
            />
          ) : null}

          {showSavedState ? (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-6 py-5 shadow-[0_20px_50px_-35px_rgba(5,150,105,0.35)]">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">{dictionary.recipesPage.savedTitle}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{savedAt}</p>
              <p className="mt-2 text-sm text-slate-700">{dictionary.recipesPage.savedDescription}</p>
            </div>
          ) : null}

          <div className={`${panelClass} grid gap-4 md:grid-cols-3`}>
            <div>
              <p className="text-sm text-slate-600">{dictionary.common.totalWeight}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatGrams(toNumber(recipe.totalWeightGrams))}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">{dictionary.recipesPage.updatedAt}</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{savedAt}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">{dictionary.recipesPage.createdAt}</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{createdAt}</p>
            </div>
          </div>

          {isEditMode ? (
            <RecipeEditor
              availableCategories={availableCategories}
              canManageVisibility={session.role === "ADMIN"}
              endpoint={`/api/recipes/${recipe.id}`}
              initialRecipe={editableRecipe}
              method="PUT"
              submitLabel={dictionary.recipesPage.saveChanges}
            />
          ) : (
            <RecipeReadonly dictionary={dictionary} locale={locale} recipe={editableRecipe} />
          )}
        </div>

        <RecipeScaler pdfEnabled={exportEnabled} recipe={editableRecipe} totalWeightGrams={toNumber(recipe.totalWeightGrams)} />
      </div>
    </div>
  );
}
