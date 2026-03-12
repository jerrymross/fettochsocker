"use client";

import { FileDown, FileUp, LayoutDashboard, LogOut, NotebookTabs, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { LanguageToggle } from "@/components/language-toggle";
import { SidebarQuickSearch } from "@/components/dashboard/sidebar-quick-search";
import AnimatedMenuComponent from "@/components/ui/animated-menu-1";
import { useLanguage } from "@/components/language-provider";

const iconMap = {
  dashboard: LayoutDashboard,
  RECIPES: NotebookTabs,
  IMPORT: FileUp,
  EXPORT: FileDown,
  settings: Settings,
};

type SidebarLink = {
  href: string;
  label: string;
  key: "RECIPES" | "IMPORT" | "EXPORT";
};

export function AppSidebar({
  userName,
  modules,
  recipeSearchItems,
}: {
  userName: string;
  modules: SidebarLink[];
  recipeSearchItems: Array<{ id: string; title: string }>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { dictionary } = useLanguage();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const items = [
    {
      href: "/dashboard",
      icon: iconMap.dashboard,
      label: dictionary.common.dashboard,
      active: pathname === "/dashboard",
    },
    ...modules.map((module) => ({
      href: module.href,
      icon: iconMap[module.key],
      label: module.label,
      active: pathname === module.href || pathname.startsWith(`${module.href}/`),
    })),
    {
      href: "/settings",
      icon: iconMap.settings,
      label: dictionary.common.settings,
      active: pathname === "/settings" || pathname.startsWith("/settings/"),
    },
  ];

  return (
    <AnimatedMenuComponent
      brand={dictionary.common.brand}
      description=""
      topSlot={({ closeMenu }) =>
        recipeSearchItems.length > 0 ? (
          <SidebarQuickSearch
            noMatchesLabel={dictionary.recipesPage.noMatches}
            onNavigate={closeMenu}
            placeholder={dictionary.common.quickSearch}
            recipes={recipeSearchItems}
          />
        ) : null
      }
      footer={
        <div className="rounded-[20px] bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400">{dictionary.common.signedInAs}</p>
          <p className="mt-1 text-sm font-semibold text-[#111110]">{userName}</p>
          <LanguageToggle className="mt-2.5 border-slate-200 bg-white px-2 py-1 text-xs" />
          <button
            className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#111110] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_-8px_rgba(17,17,16,0.50)] transition-all duration-200 hover:bg-[#1e261a] active:scale-[0.98]"
            onClick={logout}
            type="button"
          >
            <LogOut className="size-4" />
            {dictionary.common.signOut}
          </button>
        </div>
      }
      items={items}
      title=""
    />
  );
}
