"use client"

import { useRouter } from "next/navigation"

import { invalidateCurrentAdmin } from "@/features/admin/current-admin"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { authClient } from "@/lib/auth/client"

type SignOutRole = "buyer" | "seller" | "admin"

/** Staff sign in at `/internal`, not `/admin` — the role literal and the
 *  URL segment are deliberately decoupled so renaming one never silently
 *  breaks the other. */
const LOGIN_SEGMENT: Record<SignOutRole, string> = {
  buyer: "buyer",
  seller: "seller",
  admin: "internal",
}

/**
 * One sign-out path for every role's topbar: end the session, clear
 * whatever client-side identity cache that role keeps — the onboarding
 * draft for a buyer/seller (so the next person signed in on this device
 * never sees a stale "Welcome back, …"), or the cached `/api/identity/me`
 * read for admin (`admin-settings-view.tsx`'s own sign-out already does
 * exactly this pairing) — then land back on that role's own login screen.
 */
function useSignOut(role: SignOutRole) {
  const router = useRouter()
  const { reset } = useOnboarding()

  return async () => {
    await authClient.signOut()
    if (role === "admin") {
      await invalidateCurrentAdmin()
    } else {
      reset()
    }
    router.replace(`/${LOGIN_SEGMENT[role]}/login`)
  }
}

export { useSignOut }
