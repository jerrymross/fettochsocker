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
    <main className="grid min-h-screen px-4 py-10 lg:grid-cols-[1.2fr_0.9fr] lg:gap-5 lg:px-8" style={{ backgroundColor: "#fcfcfb", backgroundImage: "radial-gradient(ellipse 68% 52% at 18% 0%, rgba(243,231,195,0.72) 0%, transparent 58%), radial-gradient(ellipse 48% 44% at 88% 12%, rgba(248,175,229,0.22) 0%, transparent 58%), radial-gradient(ellipse 52% 48% at 82% 100%, rgba(152,182,148,0.16) 0%, transparent 62%)" }}>
      {/* Dark hero panel */}
      <section className="relative hidden flex-col justify-between overflow-hidden rounded-[36px] bg-[#181611] px-10 py-12 text-[#fcfcfb] lg:flex">
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
        <div className="pointer-events-none absolute -left-12 -top-12 size-72 rounded-full bg-[#98b694]/16 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-0 size-52 rounded-full bg-[#f8afe5]/10 blur-3xl" />

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
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#f7f2e8]/70">{dictionary.auth.loginHeroDescription}</p>
        </div>

        <div className="relative grid gap-3 md:grid-cols-3">
          {dictionary.auth.loginBullets.map((item) => (
            <div key={item} className="rounded-[22px] border border-white/[0.08] bg-white/[0.05] p-4 text-sm leading-6 text-[#f7f2e8]/68 backdrop-blur-sm">
              <span className="mb-2.5 inline-block h-0.5 w-6 rounded-full bg-[#98b694]" />
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
            <span className="hidden h-px w-5 bg-[#98b694] lg:block" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#817869]">{dictionary.auth.loginEyebrow}</p>
          </div>
          <h2 className="mt-2 text-[2.2rem] font-semibold leading-[1.1] tracking-[-0.04em] text-[#181611]">{dictionary.auth.loginTitle}</h2>
          <p className="mt-3 text-base leading-7 text-[#6e675c]">{dictionary.auth.loginDescription}</p>
          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
