import { redirect } from "next/navigation";

import { Dashboard } from "@/components/dashboard/Dashboard";
import { AppShell } from "@/components/layout/AppShell";
import { isAuthenticated } from "@/lib/auth/guard";

export default async function Home() {
  if (!(await isAuthenticated())) redirect("/login");

  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}
