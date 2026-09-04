import { SearchIcon } from "lucide-react"

import { ComingSoon } from "@/features/dashboard/coming-soon"

export default function Page() {
  return (
    <ComingSoon
      icon={SearchIcon}
      title="Sourcing"
      description="Growers matched to the crops you're sourcing will show up here."
    />
  )
}
