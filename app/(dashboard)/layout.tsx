import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { getLocale } from "@/lib/server/locale";
import { getEnabledModules } from "@/lib/server/modules";
import { listRecipeSearchItems } from "@/lib/server/recipes";
import { requireSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();
  const locale = await getLocale();
  const modules = await getEnabledModules(locale);
  const recipeSearchItems = modules.some((module) => module.key === "RECIPES")
    ? await listRecipeSearchItems(session.userId, session.role)
    : [];

  return (
    <div className="min-h-screen">
      <AppSidebar isAdmin={session.role === "ADMIN"} modules={modules} recipeSearchItems={recipeSearchItems} userName={session.name} />
      <main className="min-w-0 pb-6 pt-24 sm:pb-8 sm:pl-24 sm:pr-6 sm:pt-24 lg:pl-24 lg:pr-10 lg:pt-10">
        {children}
      </main>
    </div>
  );
}
