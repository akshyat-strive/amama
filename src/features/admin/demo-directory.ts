"use client"

import { createFetchStore } from "@/lib/api/fetch-store"

export type DemoDirectoryEntry = { id: string; name: string; email: string; roleId: string; roleName: string }

/** Public, pre-auth admin directory — for the two surfaces that need to
 *  list demo accounts before anyone is signed in (`/creds`, the login
 *  screen's quick-login list). `useUsers()`/`useRoles()` in
 *  `role-store.ts`/`user-store.ts` are the real, permission-gated data
 *  for use *inside* the console. */
const store = createFetchStore<DemoDirectoryEntry[]>("/api/admin/demo-directory", [])

function useDemoDirectory(): DemoDirectoryEntry[] {
  return store.useStore()
}

export { useDemoDirectory }
