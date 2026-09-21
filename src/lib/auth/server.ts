import { createNeonAuth } from "@neondatabase/auth/next/server"

/**
 * The one Neon Auth instance for the whole app — every role (buyer, seller,
 * admin/KAM) signs in through this same Managed Better Auth backend rather
 * than each getting its own credential store. `app_users`/`admin_profiles`/
 * `buyer_profiles`/`seller_profiles` (see `src/features/identity`) layer
 * this app's own roles and profile data on top of the user id this issues.
 */
const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
})

export { auth }
