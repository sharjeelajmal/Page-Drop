import Image from "next/image";
import type { ReactNode } from "react";

import { LoginIllustration } from "@/components/auth/LoginIllustration";
import { ShieldIcon } from "@/components/ui/icons";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-[22px] w-[22px]",
};

const FEATURES: { icon: ReactNode; title: string; subtitle: string }[] = [
  {
    icon: (
      <svg {...iconProps}>
        <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
      </svg>
    ),
    title: "Fast",
    subtitle: "Deployments",
  },
  { icon: <ShieldIcon className="h-[22px] w-[22px]" />, title: "Secure", subtitle: "Infrastructure" },
  {
    icon: (
      <svg {...iconProps}>
        <path d="M7 18a5 5 0 0 1-.6-9.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z" />
      </svg>
    ),
    title: "Scalable",
    subtitle: "Performance",
  },
  {
    icon: (
      <svg {...iconProps}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </svg>
    ),
    title: "Modern",
    subtitle: "Workflow",
  },
];

/**
 * Dark brand panel on the left of the sign-in page (always dark, any theme).
 * Everything sits in one content column so logo, headline, features,
 * illustration and footer share the same left edge.
 */
export function LoginShowcase() {
  return (
    <section className="relative hidden overflow-hidden bg-[#060b2e] text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:min-h-[700px]">
      {/* Background: navy gradient, soft orbs and a faint grid */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_25%_15%,#14207a_0%,transparent_60%),radial-gradient(ellipse_70%_55%_at_55%_90%,#1a2a9c_0%,transparent_55%)]" />
        <div className="absolute -top-44 -right-28 h-[440px] w-[440px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#3946d6_0%,#1d238f_45%,transparent_70%)] opacity-70" />
        <div className="absolute bottom-[6%] -left-44 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle_at_70%_40%,#1f2fa8_0%,#0b1352_55%,transparent_72%)] opacity-80" />
        <div className="absolute -right-28 -bottom-36 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#2f3fd0_0%,#141a7a_50%,transparent_72%)] opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(96,165,250,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(96,165,250,0.06)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_30%,transparent_80%)]" />
      </div>

      <div className="relative mx-auto grid h-full w-full max-w-[760px] grid-rows-[auto_1fr] px-12 py-10 xl:px-14 xl:py-12">
        {/* Brand */}
        <div className="flex items-center gap-3.5 animate-fade-in">
          <Image
            src="/icon-512.png"
            alt=""
            width={52}
            height={52}
            priority
            className="rounded-[14px] shadow-[0_8px_24px_-6px_rgba(59,130,246,0.7)]"
          />
          <span className="text-[30px] font-semibold tracking-[-0.02em]">PageDrop</span>
        </div>

        {/* Message + illustration */}
        <div className="flex min-h-0 flex-col justify-center gap-[clamp(20px,4vh,44px)] py-[clamp(16px,4vh,40px)]">
          <div>
            <h1
              className="animate-slide-up text-[clamp(40px,3.6vw,58px)] leading-[1.06] font-bold tracking-[-0.03em]"
              style={{ animationDelay: "80ms" }}
            >
              Deploy Faster.
              <br />
              <span className="bg-gradient-to-r from-[#3b82f6] via-[#6d7cff] to-[#8b5cf6] bg-clip-text text-transparent">
                Manage Smarter.
              </span>
            </h1>
            <p
              className="mt-5 max-w-[460px] animate-slide-up text-[clamp(16px,1.2vw,19px)] leading-relaxed text-slate-300/85"
              style={{ animationDelay: "160ms" }}
            >
              Powerful deployments, seamless workflows, and complete control — all in one place.
            </p>

            <ul
              className="mt-8 grid animate-slide-up grid-cols-2 gap-y-5 xl:flex xl:items-center xl:justify-between xl:gap-5"
              style={{ animationDelay: "240ms" }}
            >
              {FEATURES.map(({ icon, title, subtitle }, index) => (
                <li
                  key={title}
                  className={`flex items-center gap-3 ${
                    index > 0 ? "xl:border-l xl:border-white/10 xl:pl-5" : ""
                  } ${index % 2 === 1 ? "border-l border-white/10 pl-5 xl:pl-5" : ""}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3b5bff]/15 text-[#7c93ff] ring-1 ring-[#5b7cff]/25">
                    {icon}
                  </span>
                  <span className="text-[14px] leading-snug whitespace-nowrap">
                    <span className="block font-medium text-white/95">{title}</span>
                    <span className="block text-slate-400">{subtitle}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative min-h-[180px] flex-1 animate-fade-in" style={{ animationDelay: "320ms" }}>
            <div className="absolute inset-0">
              <LoginIllustration />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
