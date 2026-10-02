import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { Toaster } from "@/components/ui/Toaster";
import { isAuthenticated } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "Projects — PageDrop" };

export default async function ProjectsPage() {
  if (!(await isAuthenticated())) redirect("/login?next=/projects");

  return (
    <AppShell>
      <Toaster>
        <ProjectsView />
      </Toaster>
    </AppShell>
  );
}
