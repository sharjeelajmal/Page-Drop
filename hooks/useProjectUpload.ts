"use client";

import { useCallback, useState } from "react";

import { apiRequest, getErrorMessage, uploadWithProgress } from "@/lib/client/api";
import { validateProjectFile } from "@/lib/client/validation";
import type { ProjectDTO } from "@/types/project";

export type ProjectUploadState =
  | { phase: "idle" }
  | { phase: "uploading"; fileName: string; fileSize: number; progress: number }
  | { phase: "processing"; fileName: string; fileSize: number }
  | { phase: "ready"; project: ProjectDTO }
  | { phase: "error"; fileName?: string; message: string };

export function useProjectUpload() {
  const [state, setState] = useState<ProjectUploadState>({ phase: "idle" });

  /**
   * `slug` is the optional link chosen by the user (site-url/<slug>);
   * `locked` is only honoured for the private account.
   */
  const upload = useCallback(async (
    file: File,
    options: { slug?: string; locked?: boolean } = {},
  ): Promise<ProjectDTO | null> => {
    const fileName = file.name;
    const fileSize = file.size;
    const invalid = validateProjectFile(file);
    if (invalid) {
      setState({ phase: "error", fileName, message: invalid });
      return null;
    }

    setState({ phase: "uploading", fileName, fileSize, progress: 0 });
    try {
      const { project } = await uploadWithProgress<{ project: ProjectDTO }>(
        "/api/projects",
        file,
        (progress) =>
          setState(
            progress >= 1
              ? { phase: "processing", fileName, fileSize }
              : { phase: "uploading", fileName, fileSize, progress },
          ),
        {
          ...(options.slug ? { slug: options.slug } : {}),
          ...(options.locked !== undefined ? { locked: String(options.locked) } : {}),
        },
      );
      setState({ phase: "ready", project });
      return project;
    } catch (error) {
      setState({ phase: "error", fileName, message: getErrorMessage(error) });
      return null;
    }
  }, []);

  /** Loads an existing project (e.g. after a page refresh). */
  const restore = useCallback(async (projectId: string): Promise<ProjectDTO | null> => {
    try {
      const { project } = await apiRequest<{ project: ProjectDTO }>(
        `/api/projects/${encodeURIComponent(projectId)}`,
      );
      if (project.status !== "ready") return null;
      setState({ phase: "ready", project });
      return project;
    } catch {
      return null;
    }
  }, []);

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  return { state, upload, restore, reset };
}
