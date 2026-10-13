import { DashboardShell } from "@/features/dashboard/dashboard-shell"
import { ReviewGate } from "@/features/verification/components/review-gate"
import { LiveWorldBoundary } from "@/features/tradechain/live-world-boundary"

export default function SellerDashboardLayout({
  children,
}: LayoutProps<"/seller/dashboard">) {
  return (
    <DashboardShell role="seller">
      <ReviewGate role="seller">
        <LiveWorldBoundary>{children}</LiveWorldBoundary>
      </ReviewGate>
    </DashboardShell>
  )
}
