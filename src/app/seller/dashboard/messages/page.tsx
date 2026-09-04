import { MessageCircleIcon } from "lucide-react"

import { ComingSoon } from "@/features/dashboard/coming-soon"

export default function Page() {
  return (
    <ComingSoon
      icon={MessageCircleIcon}
      title="Messages"
      description="Conversations with buyers will land here."
    />
  )
}
