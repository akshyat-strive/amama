import { AdminShell } from "@/features/admin/admin-shell"

export default function MasterConsoleLayout({ children }: LayoutProps<"/admin/master">) {
  return <AdminShell role="master">{children}</AdminShell>
}
