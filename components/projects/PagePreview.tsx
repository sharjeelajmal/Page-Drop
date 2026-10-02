"use client";

import { useEffect, useRef, useState } from "react";

import { ProjectThumb } from "@/components/projects/ProjectThumb";
import type { ProjectSummaryDTO } from "@/types/project";

/** Desktop viewport the page is rendered at before being scaled down. */
const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 720;

/**
 * Live thumbnail of a published page: the page is rendered at desktop size in
 * a sandboxed, non-interactive iframe and scaled to fit the card, so the card
 * shows the page's real top section (banner/hero).
 *
 * - Loads only when the card scrolls into view.
 * - Sandbox allows scripts (many pages need them to render) but no forms,
 *   popups or dialogs, and the page runs in an opaque origin, isolated from
 *   the dashboard.
 */
export function PagePreview({ project, className = "" }: { project: ProjectSummaryDTO; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // Reload the thumbnail after a redeploy.
  const frameKey = `${project.publicUrl}#${project.updatedAt}`;
  const loaded = loadedKey === frameKey;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const resize = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    resize.observe(element);

    const inView = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          inView.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    inView.observe(element);

    return () => {
      resize.disconnect();
      inView.disconnect();
    };
  }, []);

  if (project.status !== "ready") {
    return <ProjectThumb name={project.name} type={project.type} thumbnailUrl={project.thumbnailUrl} className={className} />;
  }

  const scale = width / VIEWPORT_WIDTH;

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-white ${className}`}>
      {/* Placeholder until the page has rendered */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 transition-opacity duration-500 ${loaded ? "opacity-0" : "opacity-100"}`}
      >
        <div className="skeleton absolute inset-0" />
        <div className="absolute inset-x-[8%] top-[14%] space-y-2.5">
          <div className="h-[9%] min-h-2 w-2/5 rounded bg-surface-3/70" />
          <div className="h-[7%] min-h-1.5 w-3/5 rounded bg-surface-3/60" />
          <div className="h-[7%] min-h-1.5 w-1/2 rounded bg-surface-3/50" />
        </div>
      </div>

      {visible && width > 0 && (
        <iframe
          key={frameKey}
          src={project.publicUrl}
          title={`Preview of ${project.name}`}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          loading="lazy"
          scrolling="no"
          tabIndex={-1}
          aria-hidden="true"
          onLoad={() => setLoadedKey(frameKey)}
          className={`pointer-events-none absolute top-0 left-0 origin-top-left border-0 bg-white transition-opacity duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          style={{
            width: VIEWPORT_WIDTH,
            height: VIEWPORT_HEIGHT,
            transform: `scale(${scale})`,
          }}
        />
      )}
    </div>
  );
}
