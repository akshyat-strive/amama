import { AdminShell } from "@/features/admin/admin-shell"

export default function KamConsoleLayout({ children }: LayoutProps<"/admin/kam">) {
  return <AdminShell role="kam">{children}</AdminShell>
}
