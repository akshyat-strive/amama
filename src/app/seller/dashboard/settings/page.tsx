import { SettingsIcon } from "lucide-react"

import { ComingSoon } from "@/features/dashboard/coming-soon"

export default function Page() {
  return (
    <ComingSoon
      icon={SettingsIcon}
      title="Settings"
      description="Manage your farm profile, certifications and payment details."
    />
  )
}
