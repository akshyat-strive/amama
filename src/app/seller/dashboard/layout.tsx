import { DashboardShell } from "@/features/dashboard/dashboard-shell"
import { ReviewGate } from "@/features/verification/components/review-gate"

export default function SellerDashboardLayout({
  children,
}: LayoutProps<"/seller/dashboard">) {
  return (
    <ReviewGate role="seller">
      <DashboardShell role="seller">{children}</DashboardShell>
    </ReviewGate>
  )
}
