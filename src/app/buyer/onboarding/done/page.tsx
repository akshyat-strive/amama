import { redirect } from "next/navigation"

/** Submitting KYC now lands straight in the dashboard, on the ticket. */
export default function DoneRedirect() {
  redirect("/buyer/dashboard")
}
