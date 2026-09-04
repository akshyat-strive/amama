import { DashboardShell } from "@/features/dashboard/dashboard-shell"

export default function BuyerDashboardLayout({
  children,
}: LayoutProps<"/buyer/dashboard">) {
  return <DashboardShell role="buyer">{children}</DashboardShell>
}
