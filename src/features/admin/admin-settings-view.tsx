"use client"

import { useRouter } from "next/navigation"
import { LogOutIcon, RotateCcwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AdminPanel } from "@/features/admin/admin-ui"
import { authClient } from "@/lib/auth/client"
import { invalidateCurrentAdmin, useCurrentAdmin } from "@/features/admin/current-admin"
import { resetAdminDemoData } from "@/features/admin/seed-data"

/** Deliberately thin — there's no admin-wide preferences yet, just the one
 *  action that actually needs a settings-shaped home: ending the signed-in
 *  session. Every admin (including whoever holds Master Admin's role now)
 *  is a real session, so there's no special "has no account" case left. */
function AdminSettingsView() {
  const router = useRouter()
  const admin = useCurrentAdmin()
  if (!admin) return null

  const handleSignOut = async () => {
    await authClient.signOut()
    await invalidateCurrentAdmin()
    router.replace("/internal/login")
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

      <AdminPanel title="Demo data" className="mt-4">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <p className="text-[13px] text-muted-foreground">
            Deals, shipments, contracts and conversations here are all local to this browser. If testing has
            assigned every deal or worked through every shipment, reset to get a fresh set back.
          </p>
          <Button variant="outline" size="sm" onClick={resetAdminDemoData}>
            <RotateCcwIcon />
            Reset demo data
          </Button>
        </div>
      </AdminPanel>
    </div>
  )
}

export { AdminSettingsView }
