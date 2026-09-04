import type { Metadata } from "next"

import { LoginScreen } from "@/features/auth/login-screen"

export const metadata: Metadata = { title: "Log in" }

export default function SellerLoginPage() {
  return <LoginScreen role="seller" />
}
