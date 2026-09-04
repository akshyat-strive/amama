import { PackageIcon } from "lucide-react"

import { ComingSoon } from "@/features/dashboard/coming-soon"

export default function Page() {
  return (
    <ComingSoon
      icon={PackageIcon}
      title="Orders"
      description="Your purchase orders and their status will show up here once you place one."
    />
  )
}
