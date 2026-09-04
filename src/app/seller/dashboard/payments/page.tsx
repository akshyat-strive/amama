import { WalletIcon } from "lucide-react"

import { ComingSoon } from "@/features/dashboard/coming-soon"

export default function Page() {
  return (
    <ComingSoon
      icon={WalletIcon}
      title="Payments"
      description="Track payouts and the payment terms you've agreed to."
    />
  )
}
