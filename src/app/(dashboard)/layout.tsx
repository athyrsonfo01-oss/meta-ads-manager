import { DashboardShell } from "@/components/layout/DashboardShell";
import { FloatingChat } from "@/components/layout/FloatingChat";
import { SessionProvider } from "@/lib/auth-context";
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
    <SessionProvider
      session={{
        role: (session.role as "admin" | "user") ?? "user",
        name: session.name ?? "",
        email: session.email ?? "",
      }}
    >
      <DashboardShell>{children}</DashboardShell>
      <FloatingChat />
    </SessionProvider>
  );
}
