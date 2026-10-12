import { InternalShell } from "@/features/internal/internal-shell"
import { LiveWorldBoundary } from "@/features/tradechain/live-world-boundary"

export default function InternalConsoleLayout({ children }: LayoutProps<"/internal">) {
  return (
    <InternalShell>
      <LiveWorldBoundary>{children}</LiveWorldBoundary>
    </InternalShell>
  )
}
