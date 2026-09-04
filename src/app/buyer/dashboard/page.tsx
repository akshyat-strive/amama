"use client"

import { SearchIcon } from "lucide-react"

import { DashboardOverview } from "@/features/dashboard/overview"

export default function BuyerDashboardPage() {
  return <DashboardOverview role="buyer" emptyIcon={SearchIcon} />
}
