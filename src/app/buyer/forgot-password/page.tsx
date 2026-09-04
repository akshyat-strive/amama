import type { Metadata } from "next"

import { ForgotPasswordScreen } from "@/features/auth/forgot-password-screen"

export const metadata: Metadata = { title: "Reset password" }

export default function BuyerForgotPasswordPage() {
  return <ForgotPasswordScreen role="buyer" />
}
