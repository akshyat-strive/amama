import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth/server"

/**
 * Three role-scoped login screens, not one — so this can't use
 * `auth.middleware({ loginUrl })` directly (it only redirects to a single
 * fixed URL). Instead it pre-builds one configured middleware per prefix
 * and dispatches to whichever one matches the request, reusing the
 * package's own cookie-refresh/redirect logic for each.
 */
const adminAuth = auth.middleware({ loginUrl: "/internal/login" })
const buyerAuth = auth.middleware({ loginUrl: "/buyer/login" })
const sellerAuth = auth.middleware({ loginUrl: "/seller/login" })

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/internal") && pathname !== "/internal/login") {
    return adminAuth(request)
  }
  if (pathname.startsWith("/buyer/dashboard")) {
    return buyerAuth(request)
  }
  if (pathname.startsWith("/seller/dashboard")) {
    return sellerAuth(request)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/internal/:path*", "/buyer/dashboard/:path*", "/seller/dashboard/:path*"],
}
