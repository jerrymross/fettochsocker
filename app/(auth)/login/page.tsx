import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { LanguageToggle } from "@/components/language-toggle";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/server/locale";
import { shellCardClass } from "@/lib/ui";
import { getSession } from "@/lib/server/session";

export default async function LoginPage() {
  const [session, locale] = await Promise.all([getSession(), getLocale()]);
  const dictionary = getDictionary(locale);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen px-4 py-10 lg:grid-cols-[1.2fr_0.9fr] lg:gap-5 lg:px-8" style={{ backgroundColor: "#8d9c87", backgroundImage: "radial-gradient(ellipse 70% 50% at 20% 0%, rgba(201,239,56,0.14) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 85% 100%, rgba(0,0,0,0.12) 0%, transparent 60%)" }}>
      {/* Dark hero panel */}
      <section className="relative hidden flex-col justify-between overflow-hidden rounded-[36px] bg-[#111110] px-10 py-12 text-white lg:flex">
        {/* Dot grid texture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="login-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#login-dots)" />
          </svg>
        </div>
        {/* Lime glow */}
        <div className="pointer-events-none absolute -left-12 -top-12 size-72 rounded-full bg-[#c9ef38]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-0 size-52 rounded-full bg-[#c9ef38]/6 blur-3xl" />

        <div className="relative">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center justify-between gap-4">
              <LanguageToggle className="border-white/10 bg-white/5 text-white" />
            </div>
            <Image
              alt={dictionary.common.brand}
              className="mt-4 h-auto w-full object-contain max-h-[35dvh]"
              height={384}
              priority
              sizes="(min-width: 1024px) 36rem, 90vw"
              src="/logo-384.png"
              width={384}
            />
          </div>
          <h1 className="mt-8 max-w-xl text-[3rem] font-semibold leading-[1.06] tracking-[-0.04em]">{dictionary.auth.loginHeroTitle}</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/60">{dictionary.auth.loginHeroDescription}</p>
        </div>

        <div className="relative grid gap-3 md:grid-cols-3">
          {dictionary.auth.loginBullets.map((item) => (
            <div key={item} className="rounded-[22px] border border-white/[0.07] bg-white/[0.04] p-4 text-sm leading-6 text-white/60 backdrop-blur-sm">
              <span className="mb-2.5 inline-block h-0.5 w-6 rounded-full bg-[#c9ef38]" />
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center">
        <div className={`${shellCardClass} w-full max-w-xl p-6 sm:p-8 lg:p-10`}>
          <div className="flex flex-col gap-3 lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <LanguageToggle />
            </div>
            <Image
              alt={dictionary.common.brand}
              className="h-auto w-full object-contain max-h-[40dvh]"
              height={384}
              priority
              sizes="90vw"
              src="/logo-384.png"
              width={384}
            />
          </div>
          <div className="mt-3 flex items-center gap-2.5 lg:mt-0">
            <span className="hidden h-px w-5 bg-[#c9ef38] lg:block" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">{dictionary.auth.loginEyebrow}</p>
          </div>
          <h2 className="mt-2 text-[2.2rem] font-semibold leading-[1.1] tracking-[-0.04em] text-[#111110]">{dictionary.auth.loginTitle}</h2>
          <p className="mt-3 text-base leading-7 text-slate-500">{dictionary.auth.loginDescription}</p>
          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
