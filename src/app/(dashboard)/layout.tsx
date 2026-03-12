import { DashboardShell } from "@/components/layout/DashboardShell";
import { FloatingChat } from "@/components/layout/FloatingChat";
import { requireAuth } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  if (!session) redirect("/login");

  return (
    <>
      <DashboardShell>{children}</DashboardShell>
      <FloatingChat />
    </>
  );
}
