import { redirect } from "next/navigation"

/** A buyer's shipments live inside each order. */
export default function Page() {
  redirect("/buyer/dashboard/orders")
}
