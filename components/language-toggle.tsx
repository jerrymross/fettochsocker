"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, localeCookieName, type Locale } from "@/lib/i18n";
import { useLanguage } from "@/components/language-provider";
import { Component as LanguageSelectorDropdown, type LanguageOption } from "@/components/ui/language-selector-dropdown";

const languages: LanguageOption[] = [
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "en", label: "English", flag: "🇺🇸" },
];

export function LanguageToggle({ className }: { className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { locale, setLanguageState } = useLanguage();

  function setLocale(nextLocale: Locale) {
    if (nextLocale === locale) {
      return;
    }

    startTransition(() => {
      document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
      setLanguageState(nextLocale, getDictionary(nextLocale));
      router.refresh();
    });
  }

  const selected = languages.find((item) => item.code === locale) ?? languages[0];

  return (
    <LanguageSelectorDropdown
      className={className}
      languages={languages}
      onSelect={(language) => setLocale(language.code as Locale)}
      selected={{
        ...selected,
        label: isPending ? "..." : selected.label,
      }}
    />
  );
}
