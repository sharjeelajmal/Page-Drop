import { apiRequest, uploadWithProgress } from "@/lib/client/api";
import type { ProjectDTO, ProjectSummaryDTO } from "@/types/project";

/** Typed client for the admin projects API. */

const projectUrl = (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}`;

export async function fetchProjects(): Promise<ProjectSummaryDTO[]> {
  const { projects } = await apiRequest<{ projects: ProjectSummaryDTO[] }>("/api/projects", { cache: "no-store" });
  return projects;
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
