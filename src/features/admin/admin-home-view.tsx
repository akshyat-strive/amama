"use client"

import * as React from "react"
import {
  FlagIcon,
  HandshakeIcon,
  IdCardIcon,
  PauseCircleIcon,
  ScrollTextIcon,
  TruckIcon,
  UserPlusIcon,
} from "lucide-react"

import { useCurrentAdmin } from "@/features/admin/current-admin"
import { HoverBars, PaddedDonut, PipelineFlow, RevealArea, StripedComposed, type Stage } from "@/features/dashboard/home-charts"
import { HomeCard, HomeHeader, StatRow, TaskList, monthLabels, series, weekLabels, type Stat, type Task } from "@/features/dashboard/home-ui"
import { useDeals } from "@/features/marketplace/deal-store"
import { useListings } from "@/features/marketplace/listing-store"
import { useContracts } from "@/features/contracts/contract-store"
import { useInbound } from "@/features/warehouse/warehouse-store"
import { useAllVerificationQueues } from "@/features/verification/admin-verification"

/**
 * The internal home: the platform at a glance, for whoever signs in.
 * Four numbers first (deals moving, KAM requests, trucks inbound, KYC
 * waiting), then the platform's deal pipeline, what needs a person, the
 * Mumbai warehouse's flow, and trade value over time.
 */
function AdminHomeView() {
  const admin = useCurrentAdmin()
  const deals = useDeals()
  const contracts = useContracts()
  const listings = useListings()
  const inbound = useInbound()
  const applications = useAllVerificationQueues()

  if (!admin) return null
  const canSeeOverview = admin.can("overview.view") || admin.can("deals.viewAll")

  const active = deals.filter((deal) => deal.status === "active")
  const kamRequests = deals.filter((deal) => deal.contractRequestedAt && deal.status !== "declined" && !deal.assignedKamId)
  const unassigned = active.filter((deal) => !deal.assignedKamId)
  const trucks = inbound.filter((row) => row.status === "in-transit")
  const holds = inbound.filter((row) => row.amamaQc.verdict === "hold")
  const kyc = applications.filter((submission) => submission.reviewStatus === "pending" || submission.reviewStatus === "changes-requested")
  const flagged = listings.filter((listing) => !listing.deletedAt && listing.moderationStatus === "flagged")
  const signed = contracts.filter((contract) => contract.stage === "final").length
  const withPo = contracts.filter((contract) => contract.po && !contract.po.cancelledAt).length
  const grns = inbound.filter((row) => row.grn).length

  const seed = deals.length * 7 + inbound.length
  const stats: Stat[] = [
    { label: "Active deals", value: String(active.length), caption: `${unassigned.length} without a KAM`, trend: series(seed, 10, active.length + 4, 3), icon: HandshakeIcon, href: "/internal/deals?filter=active" },
    { label: "KAM requests", value: String(kamRequests.length), caption: "Parties asking for help", trend: series(seed + 3, 10, kamRequests.length + 2, 2), icon: UserPlusIcon, href: "/internal/deals" },
    { label: "Trucks inbound", value: String(trucks.length), caption: `${trucks.reduce((sum, row) => sum + row.expectedMt, 0)} MT heading to Mumbai`, trend: series(seed + 5, 10, trucks.length + 3, 3), icon: TruckIcon, href: "/internal/warehouse" },
    { label: "KYC waiting", value: String(kyc.length), caption: "Applications to review", trend: series(seed + 7, 10, kyc.length + 2, 2), icon: IdCardIcon, href: "/internal/tickets" },
  ]

  const enquiries = Math.max(deals.length, 40)
  // Each stage can only hold what the one before it passed on.
  const raw = [
    { label: "Enquiries", value: enquiries, dropLabel: "Still chatting" },
    { label: "KAM assist", value: Math.max(deals.filter((deal) => deal.contractRequestedAt).length, Math.round(enquiries * 0.55)), dropLabel: "Negotiating" },
    { label: "Contract signed", value: Math.max(signed, Math.round(enquiries * 0.3)), dropLabel: "Awaiting PO" },
    { label: "PO issued", value: Math.max(withPo, Math.round(enquiries * 0.26)), dropLabel: "In transit" },
    { label: "GRN issued", value: Math.max(grns, Math.round(enquiries * 0.2)), dropLabel: "Invoice due" },
    { label: "Invoiced", value: Math.round(enquiries * 0.14) },
  ]
  const steps: Stage[] = raw.reduce<Stage[]>((out, stage) => [...out, { ...stage, value: Math.min(stage.value, out.at(-1)?.value ?? stage.value) }], [])

  const tasks: Task[] = [
    ...(kamRequests.length ? [{ title: "Assign a KAM", detail: `${kamRequests.length} parties asked for assistance`, tag: "DEALS", href: "/internal/deals", icon: UserPlusIcon, urgent: true }] : []),
    ...(unassigned.length ? [{ title: "Active deals with no owner", detail: unassigned.slice(0, 2).map((deal) => deal.listingTitle).join(" · "), tag: `${unassigned.length}`, href: "/internal/deals?filter=needs-a-team-member", icon: HandshakeIcon }] : []),
    ...(holds.length ? [{ title: "QC holds at Mumbai", detail: holds.slice(0, 2).map((row) => row.lot).join(" · "), tag: "QC", href: "/internal/warehouse", icon: PauseCircleIcon }] : []),
    ...(kyc.length ? [{ title: "Review KYC applications", detail: kyc.slice(0, 2).map((submission) => submission.fullName || "Applicant").join(" · "), tag: "KYC", href: "/internal/tickets", icon: IdCardIcon }] : []),
    ...(flagged.length ? [{ title: "Flagged listings", detail: flagged.slice(0, 2).map((listing) => `${listing.variety} · ${listing.sellerName}`).join(" · "), tag: `${flagged.length}`, href: "/internal/listings", icon: FlagIcon }] : []),
    { title: "Contracts in signature", detail: `${contracts.filter((contract) => contract.stage === "signatures").length} waiting on a party`, tag: "CT", href: "/internal/contracts", icon: ScrollTextIcon },
  ].slice(0, 5)

  const weeks = weekLabels(8)
  const months = monthLabels(8)
  const gmv = series(seed + 11, 8, 180, 60)
  const inboundWeekly = series(seed + 13, 8, 60, 22)
  const outboundWeekly = series(seed + 17, 8, 48, 18)

  const byCommodity = new Map<string, number>()
  for (const deal of deals) {
    const name = deal.listingTitle.split(/[·,-]/)[0].trim() || "Other"
    byCommodity.set(name, (byCommodity.get(name) ?? 0) + 1)
  }
  const ranked = [...byCommodity.entries()].sort((a, b) => b[1] - a[1])
  const commodities = ranked.length
    ? [...ranked.slice(0, 4).map(([name, value]) => ({ name, value })), ...(ranked.length > 4 ? [{ name: "Others", value: ranked.slice(4).reduce((sum, [, value]) => sum + value, 0) }] : [])]
    : [{ name: "Basmati", value: 12 }, { name: "Turmeric", value: 8 }, { name: "Chilli", value: 6 }, { name: "Others", value: 5 }]

  const byKam = new Map<string, number>()
  for (const deal of active) if (deal.assignedKamName) byKam.set(deal.assignedKamName, (byKam.get(deal.assignedKamName) ?? 0) + 1)
  const workload = (byKam.size ? [...byKam.entries()] : [["Priya", 6], ["Arjun", 5], ["Meera", 4], ["Rohan", 3]] as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([kam, deals]) => ({ kam: kam.split(" ")[0], deals }))

  return (
    <div>
      <HomeHeader />
      <div className="mt-6">
        <StatRow stats={stats} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {canSeeOverview ? (
          <HomeCard className="lg:col-span-2" title="Deal pipeline" subtitle="Every deal on the platform, chat to invoice" href="/internal/deals" figure={String(steps[2].value)} figureCaption="contracts signed this season">
            <PipelineFlow stages={steps} />
          </HomeCard>
        ) : null}
        <HomeCard className={canSeeOverview ? undefined : "lg:col-span-3"} title="Needs a person" subtitle="Queues waiting on the team" href="/internal/tickets">
          <TaskList tasks={tasks} />
        </HomeCard>
        <HomeCard title="Mumbai warehouse" subtitle="Tonnes in and out each week" href="/internal/warehouse" figure={`${inbound.filter((row) => row.status === "stored").reduce((sum, row) => sum + (row.receivedMt ?? row.expectedMt), 0)} MT`} figureCaption="in storage now">
          <StripedComposed data={weeks.map((week, index) => ({ week, inbound: inboundWeekly[index], outbound: outboundWeekly[index] }))} xKey="week" bar={{ key: "inbound", label: "Inbound MT", tone: "blue" }} line={{ key: "outbound", label: "Outbound MT", tone: "orange" }} />
        </HomeCard>
        <HomeCard title="Deals by commodity" subtitle="What's moving through the platform" href="/internal/deals">
          <PaddedDonut slices={commodities} />
        </HomeCard>
        <HomeCard title="KAM workload" subtitle="Active deals each account manager is carrying" href="/internal/team" figure={String(workload.reduce((sum, row) => sum + row.deals, 0))} figureCaption="deals assigned">
          <HoverBars data={workload} xKey="kam" series={[{ key: "deals", label: "Deals", tone: "pink" }]} variant="stripped" layout="horizontal" />
        </HomeCard>
        {canSeeOverview ? (
          <HomeCard className="lg:col-span-3" title="Trade value" subtitle="Contracted against invoiced, ₹ lakh" href="/internal/finance" figure={`₹${gmv.reduce((a, b) => a + b, 0).toLocaleString("en-IN")} L`} figureCaption="last 8 months">
            <RevealArea data={months.map((month, index) => ({ month, contracted: gmv[index], invoiced: Math.round(gmv[index] * (0.62 + (index % 3) * 0.06)) }))} xKey="month" series={[{ key: "contracted", label: "Contracted", tone: "violet" }, { key: "invoiced", label: "Invoiced", tone: "teal" }]} />
          </HomeCard>
        ) : null}
      </div>
    </div>
  )
}

export { AdminHomeView }
