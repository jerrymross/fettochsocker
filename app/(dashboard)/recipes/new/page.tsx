import dynamic from "next/dynamic";
import { getDictionary } from "@/lib/i18n";
import { listRecipeCategories } from "@/lib/server/recipe-categories";
import { requireModuleEnabled } from "@/lib/server/modules";
import { getLocale } from "@/lib/server/locale";
import { requireSession } from "@/lib/server/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { panelClass } from "@/lib/ui";

const RecipeEditor = dynamic(
  () => import("@/components/recipes/recipe-editor").then((module) => module.RecipeEditor),
  {
    loading: () => <div className={`${panelClass} min-h-[24rem] animate-pulse bg-slate-50/70`} />,
  },
);

export default async function NewRecipePage() {
  const localePromise = getLocale();
  const sessionPromise = requireSession();
  await Promise.all([sessionPromise, requireModuleEnabled("RECIPES")]);
  const [locale, session] = await Promise.all([localePromise, sessionPromise]);
  const dictionary = getDictionary(locale);
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
