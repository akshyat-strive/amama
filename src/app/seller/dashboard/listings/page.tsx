import { SproutIcon } from "lucide-react"

import { ComingSoon } from "@/features/dashboard/coming-soon"

export default function Page() {
  return (
    <ComingSoon
      icon={SproutIcon}
      title="Listings"
      description="Add your harvest and manage what's currently listed for sale."
    />
  )
}
