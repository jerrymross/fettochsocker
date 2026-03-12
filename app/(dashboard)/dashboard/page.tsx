import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getDictionary, getModuleMeta } from "@/lib/i18n";
import { getLocale } from "@/lib/server/locale";
import { getEnabledModules } from "@/lib/server/modules";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { panelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export default async function DashboardPage() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const moduleMeta = getModuleMeta(locale);
  const [recipeCount, importCount, exportCount, enabledModules, recentRecipes] = await Promise.all([
    prisma.recipe.count(),
    prisma.importJob.count(),
    prisma.exportJob.count(),
    getEnabledModules(locale),
    prisma.recipe.findMany({
      orderBy: { updatedAt: "desc" },
      take: 24,
      select: {
        id: true,
        title: true,
        totalWeightGrams: true,
        updatedAt: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard caption={dictionary.dashboardPage.recipesCaption} label={dictionary.common.recipes} value={String(recipeCount)} />
        <StatCard caption={dictionary.dashboardPage.importsCaption} label={dictionary.common.import} value={String(importCount)} />
        <StatCard caption={dictionary.dashboardPage.exportsCaption} label={dictionary.common.export} value={String(exportCount)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className={`${panelClass} space-y-4`}>
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              <span className="inline-flex size-3.5 items-center justify-center rounded-full bg-[#c9ef38]">
                <span className="size-1 rounded-full bg-[#111110]" />
              </span>
              {dictionary.dashboardPage.enabledModulesEyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111110]">{dictionary.dashboardPage.enabledModulesTitle}</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {enabledModules.map((module) => (
              <Link
                key={module.key}
                className="group relative rounded-[20px] bg-slate-50 p-4 transition-all duration-200 hover:bg-[#c9ef38]/12 hover:shadow-[0_4px_16px_-4px_rgba(17,17,16,0.10)]"
                href={module.href}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-[#111110]">{module.label}</p>
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#5a7020]" />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{module.summary}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className={`${panelClass} flex flex-col gap-4 lg:max-h-[30rem]`}>
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              <span className="inline-flex size-3.5 items-center justify-center rounded-full bg-[#c9ef38]">
                <span className="size-1 rounded-full bg-[#111110]" />
              </span>
              {dictionary.dashboardPage.recentRecipesEyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111110]">{dictionary.dashboardPage.recentRecipesTitle}</h2>
          </div>
          <div className="recipe-scroll flex-1 space-y-2 overflow-y-auto pr-1">
            {recentRecipes.map((recipe) => (
              <Link
                key={recipe.id}
                className="group flex min-h-[4.5rem] items-center justify-between rounded-[18px] bg-slate-50 px-4 py-3.5 transition-all duration-200 hover:bg-[#c9ef38]/12"
                href={`/recipes/${recipe.id}`}
              >
                <div>
                  <p className="font-semibold text-[#111110]">{recipe.title}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{recipe.totalWeightGrams.toString()} g</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">{recipe.updatedAt.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-US")}</span>
                  <ChevronRight className="size-4 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#5a7020]" />
                </div>
              </Link>
            ))}
            {recentRecipes.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-slate-200 p-6 text-sm text-slate-400">
                {dictionary.dashboardPage.noRecipes}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className={`${panelClass} space-y-4`}>
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            <span className="inline-flex size-3.5 items-center justify-center rounded-full bg-[#c9ef38]">
              <span className="size-1 rounded-full bg-[#111110]" />
            </span>
            {dictionary.dashboardPage.architectureEyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111110]">{dictionary.dashboardPage.architectureTitle}</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {Object.entries(moduleMeta).map(([key, meta]) => (
            <div key={key} className="rounded-[20px] bg-slate-50 px-4 py-4">
              <p className="font-semibold text-[#111110]">{meta.label}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{meta.summary}</p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{key}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
