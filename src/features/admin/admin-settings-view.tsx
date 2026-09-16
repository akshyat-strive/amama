"use client"

import { useRouter } from "next/navigation"
import { LogOutIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AdminPanel } from "@/features/admin/admin-ui"
import { signOutKam } from "@/features/admin/kam-identity"
import type { AdminRole } from "@/features/admin/admin-nav-config"

/**
 * Deliberately thin — there's no admin-wide preferences yet, just the one
 * action that actually needs a settings-shaped home: ending a KAM's signed-
 * in session. Master Admin has no session to end (see `admin-shell.tsx`'s
 * `roleContent` — one fixed account, no sign-in gate), so that half is just
 * a note instead of a dead button.
 */
function AdminSettingsView({ role }: { role: AdminRole }) {
  const router = useRouter()

  const handleSignOut = () => {
    signOutKam()
    router.replace("/admin/kam/login")
  }

  return (
    <div>
      <h1 className="text-[24px] font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">
        {role === "kam" ? "Your session in this console." : "Master Admin has no account-level settings yet."}
      </p>

      {role === "kam" ? (
        <AdminPanel title="Session" className="mt-6">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <p className="text-[13px] text-muted-foreground">
              Sign out and clear this browser&apos;s KAM identity.
            </p>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOutIcon />
              Sign out
            </Button>
          </div>
        </AdminPanel>
      ) : null}
    </div>
  )
}

export { AdminSettingsView }
