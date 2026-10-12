import { DashboardShell } from "@/features/dashboard/dashboard-shell"
import { ReviewGate } from "@/features/verification/components/review-gate"
import { LiveWorldBoundary } from "@/features/tradechain/live-world-boundary"

export default function BuyerDashboardLayout({
  children,
}: LayoutProps<"/buyer/dashboard">) {
  return (
    <ReviewGate role="buyer">
      <DashboardShell role="buyer">
        <LiveWorldBoundary>{children}</LiveWorldBoundary>
      </DashboardShell>
    </ReviewGate>
  )
}
