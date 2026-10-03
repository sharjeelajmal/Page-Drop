import { redirect } from "next/navigation";

import { Dashboard } from "@/components/dashboard/Dashboard";
import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth/guard";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell role={session.role}>
      <Dashboard role={session.role} />
    </AppShell>
  );
}
