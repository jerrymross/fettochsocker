import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { LanguageToggle } from "@/components/language-toggle";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/server/locale";
import { shellCardClass } from "@/lib/ui";
import { getSession } from "@/lib/server/session";

export default async function RegisterPage() {
  const session = await getSession();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,215,158,0.45),transparent_32%),linear-gradient(135deg,#fff7e8_0%,#edf4ff_100%)] px-4 py-10 lg:grid-cols-[1fr_0.95fr] lg:px-8">
      <section className="hidden rounded-[36px] bg-[linear-gradient(180deg,#fff4d8_0%,#f6d789_100%)] p-12 lg:block">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-900">{dictionary.auth.registerHeroEyebrow}</p>
          <LanguageToggle />
        </div>
        <h1 className="mt-6 max-w-lg text-5xl font-semibold text-slate-950">{dictionary.auth.registerHeroTitle}</h1>
        <p className="mt-5 max-w-lg text-lg text-slate-800">{dictionary.auth.registerHeroDescription}</p>
      </section>

      <section className="flex items-center justify-center">
        <div className={`${shellCardClass} w-full max-w-xl p-8 lg:p-10`}>
          <div className="flex items-start justify-between gap-4 lg:hidden">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-800">{dictionary.common.brand}</p>
            <LanguageToggle />
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-amber-800 lg:mt-0">{dictionary.auth.registerEyebrow}</p>
          <h2 className="mt-3 text-4xl font-semibold text-slate-950">{dictionary.auth.registerTitle}</h2>
          <p className="mt-3 text-base text-slate-700">{dictionary.auth.registerDescription}</p>
          <div className="mt-8">
            <RegisterForm />
          </div>
        </div>
      </section>
    </main>
  );
}
