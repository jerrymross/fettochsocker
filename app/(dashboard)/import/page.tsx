import { ImportPreviewBuilder } from "@/components/imports/import-preview-builder";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDictionary } from "@/lib/i18n";
import { listRecipeCategories } from "@/lib/server/recipe-categories";
import { getLocale } from "@/lib/server/locale";
import { requireModuleEnabled } from "@/lib/server/modules";
import { requireSession } from "@/lib/server/session";

export default async function ImportPage() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const session = await requireSession();
  await requireModuleEnabled("IMPORT");
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
