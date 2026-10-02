import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { LoginShowcase } from "@/components/auth/LoginShowcase";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ShieldIcon } from "@/components/ui/icons";
import { isAuthenticated, safeNextPath } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "Sign in — PageDrop" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const destination = safeNextPath(typeof next === "string" ? next : undefined);
  if (await isAuthenticated()) redirect(destination);

  return (
    <div className="grid min-h-screen flex-1 items-start lg:grid-cols-[1.4fr_1fr]">
      <LoginShowcase />

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f8ff] px-4 py-12 dark:bg-bg">
        {/* Soft corner shapes */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-24 -right-32 h-[340px] w-[340px] rounded-full bg-[#eaeefe] dark:bg-primary/10" />
          <div className="absolute -right-28 -bottom-36 h-[360px] w-[360px] rounded-full bg-[#eef1fe] dark:bg-primary/[0.07]" />
          <div className="absolute top-1/3 -left-40 h-72 w-72 rounded-full bg-primary/10 blur-3xl lg:hidden" />
        </div>

        <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
          <ThemeToggle />
        </div>

        <div className="relative w-full max-w-[500px] animate-scale-in">
          <div className="rounded-[22px] border border-white/70 bg-surface px-7 py-10 shadow-[0_24px_70px_-24px_rgba(37,56,140,0.28)] sm:px-11 dark:border-border">
            <div className="flex flex-col items-center">
              <Image
                src="/icon-512.png"
                alt=""
                width={60}
                height={60}
                priority
                className="rounded-2xl shadow-[0_10px_26px_-8px_rgba(37,99,235,0.6)]"
              />
              <span className="mt-3 text-[28px] font-semibold tracking-[-0.02em] text-[#0b1437] dark:text-fg">
                PageDrop
              </span>
            </div>

            <h2 className="mt-9 text-[34px] leading-tight font-bold tracking-[-0.025em] text-[#0b1437] dark:text-fg">
              Welcome back
            </h2>

            <div className="mt-8">
              <LoginForm next={destination} />
            </div>

            <p className="mt-7 flex items-center justify-center gap-2 text-[13px] text-fg-subtle">
              <ShieldIcon className="h-4 w-4" />
              Admin-only area
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
