import { AdminShell } from "@/features/admin/admin-shell"

export default function AdminConsoleLayout({ children }: LayoutProps<"/internal">) {
  return <AdminShell>{children}</AdminShell>
}
