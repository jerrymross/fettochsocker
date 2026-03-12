import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { LanguageProvider } from "@/components/language-provider";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/server/locale";
import "./globals.css";

const uiFont = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-ui",
});

export const metadata: Metadata = {
  title: "Fett & Socker",
  description: "Modular production-ready recipe management with import, export, and admin feature flags.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  return (
    <html lang={locale}>
      <body className={uiFont.variable}>
        <LanguageProvider initialDictionary={dictionary} initialLocale={locale}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
