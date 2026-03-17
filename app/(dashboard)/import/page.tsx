import dynamic from "next/dynamic";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDictionary } from "@/lib/i18n";
import { listRecipeCategories } from "@/lib/server/recipe-categories";
import { getLocale } from "@/lib/server/locale";
import { requireModuleEnabled } from "@/lib/server/modules";
import { requireSession } from "@/lib/server/session";
import { panelClass } from "@/lib/ui";

const ImportPreviewBuilder = dynamic(
  () => import("@/components/imports/import-preview-builder").then((module) => module.ImportPreviewBuilder),
  {
    loading: () => <div className={`${panelClass} min-h-[18rem] animate-pulse bg-slate-50/70`} />,
  },
);

export default async function ImportPage() {
  const localePromise = getLocale();
  const sessionPromise = requireSession();
  await Promise.all([sessionPromise, requireModuleEnabled("IMPORT")]);
  const [locale, session] = await Promise.all([localePromise, sessionPromise]);
  const dictionary = getDictionary(locale);
  const categories = await listRecipeCategories();

  return (
    <div className="space-y-6">
      <PageHeader
        description={dictionary.importPage.description}
        eyebrow={dictionary.importPage.eyebrow}
        title={dictionary.importPage.title}
      />
      <ImportPreviewBuilder availableCategories={categories} canManageVisibility={session.role === "ADMIN"} />
    </div>
  );
}
