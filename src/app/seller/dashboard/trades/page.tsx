import { redirect } from "next/navigation"

/** Trades now live under Orders. */
export default function Page() {
  redirect("/seller/dashboard/orders")
}
