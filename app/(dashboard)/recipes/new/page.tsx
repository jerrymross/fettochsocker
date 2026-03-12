import { getDictionary } from "@/lib/i18n";
import { listRecipeCategories } from "@/lib/server/recipe-categories";
import { requireModuleEnabled } from "@/lib/server/modules";
import { getLocale } from "@/lib/server/locale";
import { requireSession } from "@/lib/server/session";
import { RecipeEditor } from "@/components/recipes/recipe-editor";
import { PageHeader } from "@/components/dashboard/page-header";

export default async function NewRecipePage() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const session = await requireSession();
  await requireModuleEnabled("RECIPES");
  const categories = await listRecipeCategories();

  return (
    <div className="space-y-6">
      <PageHeader
        description={dictionary.recipesPage.createDescription}
        eyebrow={dictionary.recipesPage.eyebrow}
        title={dictionary.recipesPage.createTitle}
      />
      <RecipeEditor
        availableCategories={categories}
        canManageVisibility={session.role === "ADMIN"}
        endpoint="/api/recipes"
        method="POST"
        submitLabel={dictionary.recipesPage.createAction}
      />
    </div>
  );
}
