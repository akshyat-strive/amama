import { PackageIcon } from "lucide-react"

import { ComingSoon } from "@/features/dashboard/coming-soon"

export default function Page() {
  return (
    <ComingSoon
      icon={PackageIcon}
      title="Orders"
      description="Buyer orders against your listings will show up here."
    />
  )
}
