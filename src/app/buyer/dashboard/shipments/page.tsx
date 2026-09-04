import { ShipIcon } from "lucide-react"

import { ComingSoon } from "@/features/dashboard/coming-soon"

export default function Page() {
  return (
    <ComingSoon
      icon={ShipIcon}
      title="Shipments"
      description="Track every shipment from origin to port to your warehouse, in one place."
    />
  )
}
