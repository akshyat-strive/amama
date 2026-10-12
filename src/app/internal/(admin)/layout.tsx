import { AdminShell } from "@/features/admin/admin-shell"
import { LiveWorldBoundary } from "@/features/tradechain/live-world-boundary"

export default function AdminConsoleLayout({ children }: LayoutProps<"/internal">) {
  return (
    <AdminShell>
      <LiveWorldBoundary>{children}</LiveWorldBoundary>
    </AdminShell>
  )
}
