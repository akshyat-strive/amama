"use client"

import { useRouter } from "next/navigation"
import { LogOutIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AdminPanel } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { signOut } from "@/features/admin/session-store"

/** Deliberately thin — there's no admin-wide preferences yet, just the one
 *  action that actually needs a settings-shaped home: ending the signed-in
 *  session. Every admin (including whoever holds Master Admin's role now)
 *  is a real session, so there's no special "has no account" case left. */
function AdminSettingsView() {
  const router = useRouter()
  const admin = useCurrentAdmin()
  if (!admin) return null

  const handleSignOut = () => {
    signOut()
    router.replace("/admin/login")
  }

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Settings</h1>

      <AdminPanel title="Session" className="mt-6">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <p className="text-[13px] text-muted-foreground">Sign out and clear this browser&apos;s session.</p>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOutIcon />
            Sign out
          </Button>
        </div>
      </AdminPanel>
    </div>
  )
}

export { AdminSettingsView }
