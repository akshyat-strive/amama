import type { Metadata } from "next"

export const metadata: Metadata = {
  title: { template: "%s | amama for sellers", default: "amama for sellers" },
}

/** See `src/app/buyer/layout.tsx` for why this is intentionally chrome-less. */
export default function SellerLayout({ children }: LayoutProps<"/seller">) {
  return children
}
