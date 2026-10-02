"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/client/api";
import { isValidCustomSlug } from "@/lib/slug";

export type SlugStatus = "empty" | "invalid" | "checking" | "available" | "taken";

interface Result {
  slug: string;
  available: boolean;
  reason?: string;
}

/** Debounced server check that a chosen project link is free. */
export function useSlugAvailability(slug: string): { status: SlugStatus; reason?: string } {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!isValidCustomSlug(slug)) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      apiRequest<{ available: boolean; reason?: string }>(`/api/projects/slug?value=${encodeURIComponent(slug)}`)
        .then((response) => !cancelled && setResult({ slug, ...response }))
        // If the check itself fails, let the upload decide (the server re-validates).
        .catch(() => !cancelled && setResult({ slug, available: true }));
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [slug]);

  if (!slug) return { status: "empty" };
  if (!isValidCustomSlug(slug)) return { status: "invalid" };
  if (!result || result.slug !== slug) return { status: "checking" };
  return result.available ? { status: "available" } : { status: "taken", reason: result.reason };
}
