import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { listRecipeCategories } from "@/lib/server/recipe-categories";
import { getLocale } from "@/lib/server/locale";
import { requireModuleEnabled } from "@/lib/server/modules";
import { listRecipeSummaries } from "@/lib/server/recipes";
import { requireSession } from "@/lib/server/session";
import { formatDate, formatGrams, toNumber } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { RecipeList } from "@/components/recipes/recipe-list";
import { panelClass, primaryButtonClass } from "@/lib/ui";

export default async function RecipesPage() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const session = await requireSession();
  await requireModuleEnabled("RECIPES");
  const [recipes, categories] = await Promise.all([
    listRecipeSummaries(session.userId, session.role),
    listRecipeCategories(),
  ]);
  const recipeItems = recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    isPublic: recipe.isPublic,
    isOwnRecipe: recipe.authorId === session.userId,
    categories: recipe.categories
      .map((item) => ({ id: item.category.id, name: item.category.name }))
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" })),
    totalWeight: formatGrams(toNumber(recipe.totalWeightGrams)),
    ingredientCount: recipe._count.ingredients,
    updatedAt: formatDate(recipe.updatedAt),
    updatedAtValue: recipe.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Link className={primaryButtonClass} href="/recipes/new">
            {dictionary.recipesPage.newRecipe}
          </Link>
        }
        description={dictionary.recipesPage.description}
        eyebrow={dictionary.recipesPage.eyebrow}
        title={dictionary.recipesPage.title}
      />

      <div className={`${panelClass} overflow-hidden p-0`}>
        <RecipeList
          categories={categories}
          labels={{
            searchPlaceholder: dictionary.recipesPage.searchPlaceholder,
            noRecipes: dictionary.recipesPage.noRecipes,
            noMatches: dictionary.recipesPage.noMatches,
            recipe: dictionary.recipesPage.recipe,
            category: dictionary.recipesPage.category,
            allCategories: dictionary.recipesPage.allCategories,
            sortBy: dictionary.recipesPage.sortBy,
            sortUpdated: dictionary.recipesPage.sortUpdated,
            sortTitle: dictionary.recipesPage.sortTitle,
            sortCategory: dictionary.recipesPage.sortCategory,
            uncategorized: dictionary.recipesPage.uncategorized,
            totalWeight: dictionary.common.totalWeight,
            ingredients: dictionary.common.ingredients,
            updated: dictionary.common.updated,
            showPublicRecipes: dictionary.recipesPage.showPublicRecipes,
            showOwnRecipes: dictionary.recipesPage.showOwnRecipes,
          }}
          recipes={recipeItems}
          showAccessFilters={session.role !== "ADMIN"}
        />
      </div>
    </div>
  );
}
