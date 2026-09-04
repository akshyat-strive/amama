"use client"

import { SproutIcon } from "lucide-react"

import { DashboardOverview } from "@/features/dashboard/overview"

export default function SellerDashboardPage() {
  return <DashboardOverview role="seller" emptyIcon={SproutIcon} />
}
