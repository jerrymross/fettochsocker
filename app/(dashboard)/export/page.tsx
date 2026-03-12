import { ExportBuilder } from "@/components/exports/export-builder";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/server/locale";
import { requireModuleEnabled } from "@/lib/server/modules";
import { listRecipesForExport } from "@/lib/server/recipes";
import { requireSession } from "@/lib/server/session";
import { toNumber } from "@/lib/utils";

export default async function ExportPage() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const session = await requireSession();
  await requireModuleEnabled("EXPORT");

  const recipes = await listRecipesForExport(session.userId, session.role);

  return (
    <div className="space-y-6">
      <PageHeader
        description={dictionary.exportPage.description}
        eyebrow={dictionary.exportPage.eyebrow}
        title={dictionary.exportPage.title}
      />
      <ExportBuilder
        recipes={recipes.map((recipe) => ({
          ...recipe,
          totalWeightGrams: toNumber(recipe.totalWeightGrams),
        }))}
      />
    </div>
  );
}
