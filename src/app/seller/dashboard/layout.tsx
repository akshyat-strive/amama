import { DashboardShell } from "@/features/dashboard/dashboard-shell"

export default function SellerDashboardLayout({
  children,
}: LayoutProps<"/seller/dashboard">) {
  return <DashboardShell role="seller">{children}</DashboardShell>
}
