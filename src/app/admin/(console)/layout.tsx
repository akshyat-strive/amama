import { AdminShell } from "@/features/admin/admin-shell"

export default function AdminConsoleLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>
}
