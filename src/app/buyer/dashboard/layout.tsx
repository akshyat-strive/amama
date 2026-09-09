import { DashboardShell } from "@/features/dashboard/dashboard-shell"
import { ReviewGate } from "@/features/verification/components/review-gate"

export default function BuyerDashboardLayout({
  children,
}: LayoutProps<"/buyer/dashboard">) {
  return (
    <ReviewGate role="buyer">
      <DashboardShell role="buyer">{children}</DashboardShell>
    </ReviewGate>
  )
}
