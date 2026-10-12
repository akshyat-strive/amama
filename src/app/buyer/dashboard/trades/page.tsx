import { redirect } from "next/navigation"

/** Buyers follow their trades as orders now. */
export default function Page() {
  redirect("/buyer/dashboard/orders")
}
