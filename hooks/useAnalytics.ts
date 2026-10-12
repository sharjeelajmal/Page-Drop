"use client";

import { useCallback, useEffect, useState } from "react";

import { getErrorMessage } from "@/lib/client/api";
import { fetchAnalytics } from "@/lib/client/projects";
import type { ProjectAnalyticsDTO } from "@/types/project";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ProjectAnalyticsDTO };

/** Loads visitor analytics for a project; `reload()` refetches in place. */
export function useAnalytics(projectId: string, days: number) {
  const [result, setResult] = useState<{ key: string; state: State } | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = `${projectId}:${days}`;

  useEffect(() => {
    let cancelled = false;
    fetchAnalytics(projectId, days)
      .then((data) => !cancelled && setResult({ key, state: { status: "ready", data } }))
      .catch((error) => !cancelled && setResult({ key, state: { status: "error", message: getErrorMessage(error) } }));
    return () => {
      cancelled = true;
    };
  }, [projectId, days, key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  // Keep showing the previous data while a reload for the same key is in flight.
  const state: State = result && result.key === key ? result.state : { status: "loading" };
  return { state, reload };
}
