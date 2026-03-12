import { ModuleToggleList } from "@/components/admin/module-toggle-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDictionary } from "@/lib/i18n";
import { getAllModules } from "@/lib/server/modules";
import { getLocale } from "@/lib/server/locale";
import { requireSession } from "@/lib/server/session";

export default async function SettingsPage() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  await requireSession();
  const modules = await getAllModules();

  return (
    <div className="space-y-6">
      <PageHeader
        description={dictionary.settingsPage.description}
        eyebrow={dictionary.settingsPage.eyebrow}
        title={dictionary.settingsPage.title}
      />
      <ModuleToggleList modules={modules} />
    </div>
  );
}
