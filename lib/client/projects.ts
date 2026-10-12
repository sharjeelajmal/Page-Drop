import { apiRequest, uploadWithProgress } from "@/lib/client/api";
import type { ProjectAnalyticsDTO, ProjectDTO, ProjectSummaryDTO } from "@/types/project";

/** Typed client for the admin projects API. */

const projectUrl = (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}`;

export type ProjectsListView = "active" | "locked";

export async function fetchProjects(view: ProjectsListView = "active"): Promise<ProjectSummaryDTO[]> {
  const url = view === "locked" ? "/api/projects?view=locked" : "/api/projects";
  const { projects } = await apiRequest<{ projects: ProjectSummaryDTO[] }>(url, { cache: "no-store" });
  return projects;
}

/** Private account only: move a project into / out of the locked vault. */
export async function setProjectLock(projectId: string, locked: boolean): Promise<ProjectDTO> {
  const { project } = await apiRequest<{ project: ProjectDTO }>(projectUrl(projectId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locked }),
  });
  return project;
}

export async function fetchProject(projectId: string): Promise<ProjectDTO> {
  const { project } = await apiRequest<{ project: ProjectDTO }>(projectUrl(projectId), { cache: "no-store" });
  return project;
}

export async function renameProject(projectId: string, name: string): Promise<ProjectDTO> {
  const { project } = await apiRequest<{ project: ProjectDTO }>(projectUrl(projectId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return project;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiRequest(projectUrl(projectId), { method: "DELETE" });
}

export async function redeployProject(
  projectId: string,
  file: File,
  onProgress: (progress: number) => void,
): Promise<ProjectDTO> {
  const { project } = await uploadWithProgress<{ project: ProjectDTO }>(
    `${projectUrl(projectId)}/deploy`,
    file,
    onProgress,
  );
  return project;
}

export async function fetchAnalytics(projectId: string, days = 30): Promise<ProjectAnalyticsDTO> {
  const { analytics } = await apiRequest<{ analytics: ProjectAnalyticsDTO }>(
    `${projectUrl(projectId)}/analytics?days=${days}`,
    { cache: "no-store" },
  );
  return analytics;
}
