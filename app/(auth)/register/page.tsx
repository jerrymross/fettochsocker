import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { LanguageToggle } from "@/components/language-toggle";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/server/locale";
import { shellCardClass } from "@/lib/ui";
import { getSession } from "@/lib/server/session";

export default async function RegisterPage() {
  const [session, locale] = await Promise.all([getSession(), getLocale()]);
  const dictionary = getDictionary(locale);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(243,231,195,0.65),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(248,175,229,0.20),transparent_28%),linear-gradient(135deg,#fcfcfb_0%,#f7f3ea_100%)] px-4 py-10 lg:grid-cols-[1fr_0.95fr] lg:px-8">
      <section className="hidden rounded-[36px] bg-[linear-gradient(180deg,#f3e7c3_0%,#f8f1da_100%)] p-12 lg:block">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6e675c]">{dictionary.auth.registerHeroEyebrow}</p>
          <LanguageToggle />
        </div>
        <h1 className="mt-6 max-w-lg text-5xl font-semibold text-[#181611]">{dictionary.auth.registerHeroTitle}</h1>
        <p className="mt-5 max-w-lg text-lg text-[#4f493f]">{dictionary.auth.registerHeroDescription}</p>
      </section>

      <section className="flex items-center justify-center">
        <div className={`${shellCardClass} w-full max-w-xl p-8 lg:p-10`}>
          <div className="flex items-start justify-between gap-4 lg:hidden">
            <p className="text-xs uppercase tracking-[0.3em] text-[#817869]">{dictionary.common.brand}</p>
            <LanguageToggle />
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[#817869] lg:mt-0">{dictionary.auth.registerEyebrow}</p>
          <h2 className="mt-3 text-4xl font-semibold text-[#181611]">{dictionary.auth.registerTitle}</h2>
          <p className="mt-3 text-base text-[#6e675c]">{dictionary.auth.registerDescription}</p>
          <div className="mt-8">
            <RegisterForm />
          </div>
        </div>
      </section>
    </main>
  );
}
