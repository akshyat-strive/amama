"use client"

import { createAuthClient } from "@neondatabase/auth/next"

/**
 * Browser-side Better Auth client. Takes no arguments — it talks to the
 * same-origin `/api/auth/[...path]` proxy in `src/app/api/auth`, which is
 * what actually holds `NEON_AUTH_BASE_URL`.
 */
const authClient = createAuthClient()

export { authClient }
