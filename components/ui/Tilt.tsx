"use client";

import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";

interface TiltProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Maximum rotation in degrees. */
  max?: number;
  glare?: boolean;
}

/**
 * Pointer-driven 3D tilt with a soft glare. Writes CSS variables directly
 * (no React state per frame) and only reacts to mouse/pen, so touch scrolling
 * is unaffected. Disabled when the user prefers reduced motion.
 */
export function Tilt({ children, className = "", style, max = 6, glare = true }: TiltProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const px = (clientX - rect.left) / rect.width;
      const py = (clientY - rect.top) / rect.height;
      el.dataset.tilting = "true";
      el.style.setProperty("--tilt-x", `${((0.5 - py) * max * 2).toFixed(2)}deg`);
      el.style.setProperty("--tilt-y", `${((px - 0.5) * max * 2).toFixed(2)}deg`);
      el.style.setProperty("--glare-x", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--glare-y", `${(py * 100).toFixed(1)}%`);
    });
  };

  const onLeave = () => {
    cancelAnimationFrame(frame.current);
    const el = ref.current;
    if (!el) return;
    el.dataset.tilting = "false";
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <div ref={ref} className={`tilt ${className}`} style={style} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
      {glare && <span aria-hidden="true" className="tilt-glare" />}
    </div>
  );
}
