import { redirect } from "next/navigation"

/** Shipments now live under Orders. */
export default function Page() {
  redirect("/seller/dashboard/orders?view=shipments")
}
