import type { Metadata } from "next"

export const metadata: Metadata = {
  title: { template: "%s | amama for buyers", default: "amama for buyers" },
}

/**
 * Shell for every `/buyer/*` route.
 *
 * Deliberately chrome-less for now: `/buyer/login` is a full-bleed editorial
 * split-screen, and a horizontal topbar here would eat into the "full height
 * image" half of that design. Once `/buyer/dashboard` exists, its own nested
 * `layout.tsx` is where the topbar + sidebar + right sidebar belong — nesting
 * a dashboard chrome shell under this one, not replacing it.
 */
export default function BuyerLayout({ children }: LayoutProps<"/buyer">) {
  return children
}
