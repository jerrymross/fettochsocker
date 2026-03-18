import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/server/locale";
import { getEnabledModules } from "@/lib/server/modules";
import { listRecentRecipes } from "@/lib/server/recipes";
import { requireSession } from "@/lib/server/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { panelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export default async function DashboardPage() {
  const localePromise = getLocale();
  const sessionPromise = requireSession();
  const [locale, session] = await Promise.all([localePromise, sessionPromise]);
  const dictionary = getDictionary(locale);
  const [enabledModules, recentRecipes] = await Promise.all([
    getEnabledModules(locale),
    listRecentRecipes(session.userId, session.role),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Link className={secondaryButtonClass} href="/export">
              {dictionary.dashboardPage.buildExport}
            </Link>
            <Link className={primaryButtonClass} href="/recipes/new">
              {dictionary.dashboardPage.newRecipe}
            </Link>
          </>
        }
        description={dictionary.dashboardPage.description}
        eyebrow={dictionary.dashboardPage.eyebrow}
        title={dictionary.dashboardPage.title}
      />

      <div className={`${panelClass}`}>
        <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#817869]">
          {dictionary.dashboardPage.enabledModulesEyebrow}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {enabledModules.map((module) => (
            <Link
              key={module.key}
              className="group flex flex-col gap-3 rounded-[20px] bg-[#fbf7ee] p-5 transition-all duration-200 hover:bg-[#f3e7c3]/50 hover:shadow-[0_4px_20px_-4px_rgba(24,22,17,0.10)]"
              href={module.href}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-[#181611]">{module.label}</p>
                <ChevronRight className="size-4 shrink-0 text-[#b7ad9b] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#F182EF]" />
              </div>
              <p className="text-sm leading-relaxed text-[#6e675c]">{module.summary}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className={`${panelClass} flex flex-col gap-5`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#817869]">
          {dictionary.dashboardPage.recentRecipesEyebrow}
        </p>
        <div className="recipe-scroll space-y-2 lg:max-h-[28rem] lg:overflow-y-auto lg:pr-1">
          {recentRecipes.map((recipe) => (
            <Link
              key={recipe.id}
              className="group flex items-center justify-between rounded-[18px] bg-[#fbf7ee] px-5 py-4 transition-all duration-200 hover:bg-[#f3e7c3]/40"
              href={`/recipes/${recipe.id}`}
            >
              <div>
                <p className="font-semibold text-[#181611]">{recipe.title}</p>
                <p className="mt-0.5 text-sm text-[#817869]">{recipe.totalWeightGrams.toString()} g</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#b7ad9b]">{recipe.updatedAt.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-US")}</span>
                <ChevronRight className="size-4 text-[#b7ad9b] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#F182EF]" />
              </div>
            </Link>
          ))}
          {recentRecipes.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[#e6dcc6] px-5 py-8 text-center text-sm text-[#817869]">
              {dictionary.dashboardPage.noRecipes}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
