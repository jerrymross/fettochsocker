"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLanguage } from "@/components/language-provider";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { inputClass, primaryButtonClass } from "@/lib/ui";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dictionary } = useLanguage();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setServerError(payload.error ?? dictionary.auth.loginFailed);
        return;
      }

      router.push(searchParams.get("next") || "/dashboard");
      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-1.5">
        <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500" htmlFor="email">
          {dictionary.auth.email}
        </label>
        <input id="email" type="email" className={inputClass} {...form.register("email")} />
        {form.formState.errors.email ? (
          <p className="text-sm text-rose-600">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500" htmlFor="password">
          {dictionary.auth.password}
        </label>
        <input id="password" type="password" className={inputClass} {...form.register("password")} />
        {form.formState.errors.password ? (
          <p className="text-sm text-rose-600">{form.formState.errors.password.message}</p>
        ) : null}
      </div>

      {serverError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{serverError}</p>
      ) : null}

      <button className={`${primaryButtonClass} mt-2 w-full py-3.5`} disabled={isPending} type="submit">
        {isPending ? dictionary.auth.signingIn : dictionary.auth.signIn}
      </button>

      <p className="text-sm text-slate-600">
        {dictionary.auth.needAccount}{" "}
        <Link className="font-semibold text-slate-950 underline underline-offset-2 decoration-amber-400 hover:decoration-2 transition-all" href="/register">
          {dictionary.auth.registerLink}
        </Link>
      </p>
    </form>
  );
}
