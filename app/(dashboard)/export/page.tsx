import dynamic from "next/dynamic";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/server/locale";
import { requireModuleEnabled } from "@/lib/server/modules";
import { listRecipesForExport } from "@/lib/server/recipes";
import { requireSession } from "@/lib/server/session";
import { toNumber } from "@/lib/utils";
import { panelClass } from "@/lib/ui";

const ExportBuilder = dynamic(
  () => import("@/components/exports/export-builder").then((module) => module.ExportBuilder),
  {
    loading: () => <div className={`${panelClass} min-h-[18rem] animate-pulse bg-slate-50/70`} />,
  },
);

export default async function ExportPage() {
  const localePromise = getLocale();
  const sessionPromise = requireSession();
  await Promise.all([sessionPromise, requireModuleEnabled("EXPORT")]);
  const [locale, session] = await Promise.all([localePromise, sessionPromise]);
  const dictionary = getDictionary(locale);
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
