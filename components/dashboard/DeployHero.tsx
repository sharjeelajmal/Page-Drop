"use client";

import { FileCode2, Globe, Images, Link2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { PipelineSteps, type PipelineStep } from "@/components/dashboard/PipelineSteps";
import { IconTile } from "@/components/ui/IconTile";
import { Tilt } from "@/components/ui/Tilt";

interface DeployHeroProps {
  ready: boolean;
  steps: PipelineStep[];
}

/** Dashboard hero: headline + pipeline on the left, interactive 3D scene on the right. */
export function DeployHero({ ready, steps }: DeployHeroProps) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <div className="animate-slide-up">
        <span className="edge glass depth-1 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-fg">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
            <span className="relative h-2 w-2 rounded-full bg-primary" />
          </span>
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {ready ? "Deployment ready" : "New deployment"}
        </span>

        <h1 className="mt-5 text-4xl leading-[1.05] font-bold tracking-[-0.035em] text-fg sm:text-5xl lg:text-[56px]">
          {ready ? (
            <>
              Your site is <span className="text-brand">live.</span>
            </>
          ) : (
            <>
              Deploy a <span className="text-brand">static site</span>
              <br className="hidden sm:block" /> in seconds.
            </>
          )}
        </h1>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-fg-muted">
          Drop an HTML file or a ZIP, choose your link, attach images and share a public URL — no build step, no
          servers to manage.
        </p>

        <ul className="mt-6 flex flex-wrap gap-2.5">
          <Chip icon={<Zap className="h-3.5 w-3.5" />}>Live in seconds</Chip>
          <Chip icon={<ShieldCheck className="h-3.5 w-3.5" />}>Sandboxed pages</Chip>
          <Chip icon={<Link2 className="h-3.5 w-3.5" />}>Custom links</Chip>
        </ul>

        <div className="edge glass depth-1 mt-7 w-fit rounded-full px-4 py-2.5">
          <PipelineSteps steps={steps} />
        </div>
      </div>

      <HeroScene />
    </div>
  );
}

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-[13px] font-medium text-fg-muted backdrop-blur">
      <span className="text-primary">{icon}</span>
      {children}
    </li>
  );
}

const layer = (z: number): CSSProperties => ({ "--base": `translateZ(${z}px)`, transform: `translateZ(${z}px)` }) as CSSProperties;

/** Floating browser window with file chips at different depths. */
function HeroScene() {
  return (
    <Tilt max={7} glare={false} className="relative mx-auto hidden h-[360px] w-full max-w-[520px] lg:block">
      <div aria-hidden="true" className="absolute inset-0 [transform-style:preserve-3d]">
        <div
          className="absolute inset-x-12 top-10 bottom-14 [transform-style:preserve-3d]"
          style={{ transform: "rotateX(8deg) rotateY(-12deg)" }}
        >
          {/* Glow under the window */}
          <div className="absolute inset-x-10 -bottom-6 h-16 rounded-full bg-primary/30 blur-3xl" style={{ transform: "translateZ(-40px)" }} />

          {/* Browser window */}
          <div className="edge glass depth-3 absolute inset-0 overflow-hidden rounded-2xl border border-border/60">
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 flex-1 truncate rounded-md bg-surface-2 px-3 py-1 font-mono text-[11px] text-fg-subtle">
                pagedrop.app/summer-sale
              </span>
            </div>
            <div className="space-y-3 p-4">
              <div className="bg-brand relative h-24 overflow-hidden rounded-xl">
                <div className="absolute -top-8 -right-6 h-28 w-28 rounded-full bg-white/20" />
                <div className="absolute top-5 left-5 h-3 w-28 rounded bg-white/85" />
                <div className="absolute top-11 left-5 h-2 w-40 rounded bg-white/55" />
                <div className="absolute bottom-4 left-5 h-5 w-20 rounded-full bg-white/90" />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-1.5 rounded-lg border border-border/70 bg-surface/60 p-2.5">
                    <div className="h-6 w-6 rounded-md bg-primary/15" />
                    <div className="h-1.5 w-full rounded bg-surface-3" />
                    <div className="h-1.5 w-2/3 rounded bg-surface-3" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating chips */}
          <FloatingChip style={layer(36)} className="-top-5 -left-10" delay="0s">
            <IconTile size="sm" tone="sky">
              <FileCode2 />
            </IconTile>
            <span>
              <span className="block font-mono text-[12px] font-semibold text-fg">index.html</span>
              <span className="block text-[11px] text-fg-subtle">Uploaded · 12 KB</span>
            </span>
          </FloatingChip>

          <FloatingChip style={layer(52)} className="top-[42%] -right-12" delay="-2s">
            <IconTile size="sm" tone="violet">
              <Images />
            </IconTile>
            <span>
              <span className="block font-mono text-[12px] font-semibold text-fg">logo.png</span>
              <span className="block text-[11px] text-fg-subtle">Cloudinary CDN</span>
            </span>
          </FloatingChip>

          <FloatingChip style={layer(68)} className="-bottom-8 left-6" delay="-4s">
            <IconTile size="sm" tone="emerald">
              <Globe />
            </IconTile>
            <span>
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-fg">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Live
              </span>
              <span className="block font-mono text-[11px] text-fg-subtle">/summer-sale</span>
            </span>
          </FloatingChip>
        </div>
      </div>
    </Tilt>
  );
}

function FloatingChip({
  children,
  className,
  style,
  delay,
}: {
  children: ReactNode;
  className: string;
  style: CSSProperties;
  delay: string;
}) {
  return (
    <div
      className={`edge glass depth-3 hover-z absolute flex items-center gap-2.5 rounded-2xl border border-border/60 py-2 pr-4 pl-2 ${className}`}
      style={{ ...style, animationDelay: delay }}
    >
      {children}
    </div>
  );
}
