import Link from "next/link";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/server/locale";
import { listAdminRecipeCatalog, listAdminUsers, listRecipePackages } from "@/lib/server/admin";
import { requireAdminSession } from "@/lib/server/session";
import { panelClass, primaryButtonClass } from "@/lib/ui";

const AdminCatalogManager = dynamic(
  () => import("@/components/admin/admin-catalog-manager").then((module) => module.AdminCatalogManager),
  {
    loading: () => <div className={`${panelClass} min-h-[24rem] animate-pulse bg-slate-50/70`} />,
  },
);

export default async function AdminPage() {
  const localePromise = getLocale();
  const sessionPromise = requireAdminSession();
  const [locale, session] = await Promise.all([localePromise, sessionPromise]);
  const dictionary = getDictionary(locale);

  const [recipes, users, packages] = await Promise.all([
    listAdminRecipeCatalog(),
    listAdminUsers(),
    listRecipePackages(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Link className={primaryButtonClass} href="/recipes/new">
            {dictionary.recipesPage.newRecipe}
          </Link>
        }
        description={dictionary.adminPage.description}
        eyebrow={dictionary.adminPage.eyebrow}
        title={dictionary.adminPage.title}
      />

      <AdminCatalogManager
        currentAdminUserId={session.userId}
        packages={packages.map((packageItem) => ({
          id: packageItem.id,
          name: packageItem.name,
          description: packageItem.description ?? "",
          createdByName: packageItem.createdBy.name,
          recipeIds: packageItem.recipeLinks.map((item) => item.recipeId),
          recipeTitles: packageItem.recipeLinks.map((item) => item.recipe.title),
          userIds: packageItem.userLinks.map((item) => item.userId),
          userNames: packageItem.userLinks.map((item) => item.user.name),
        }))}
        recipes={recipes.map((recipe) => ({
          id: recipe.id,
          title: recipe.title,
          isPublic: recipe.isPublic,
          authorName: recipe.author.name,
          categories: recipe.categories.map((item) => item.category.name),
          packageNames: recipe.packageLinks.map((item) => item.package.name),
        }))}
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }))}
      />
    </div>
  );
}
