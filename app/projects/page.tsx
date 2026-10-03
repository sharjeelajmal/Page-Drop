import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { ProjectsSkeleton, ProjectsView } from "@/components/projects/ProjectsView";
import { Toaster } from "@/components/ui/Toaster";
import { getSession, type Session } from "@/lib/auth/guard";
import { listProjects } from "@/lib/projects/service";
import { getServerRequestOrigin } from "@/lib/urls";

export const metadata: Metadata = { title: "Projects — PageDrop" };

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/projects");

  return (
    <AppShell role={session.role}>
      <Toaster>
        {/* The shell renders immediately; the list streams in as soon as the query returns. */}
        <Suspense fallback={<ProjectsSkeleton />}>
          <ProjectsData session={session} />
        </Suspense>
      </Toaster>
    </AppShell>
  );
}

/** Loads the first page of data on the server, so there is no client-side fetch waterfall. */
async function ProjectsData({ session }: { session: Session }) {
  let initial;
  let initialError: string | undefined;
  try {
    initial = await listProjects(await getServerRequestOrigin(), session, "active");
  } catch (error) {
    initialError = error instanceof Error ? error.message : "Could not load projects.";
  }
  return <ProjectsView role={session.role} initialProjects={initial} initialError={initialError} />;
}
