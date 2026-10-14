"use client"

import * as React from "react"
import {
  ClipboardCheckIcon,
  ClipboardListIcon,
  FileSignatureIcon,
  FileTextIcon,
  MessagesSquareIcon,
  PackageCheckIcon,
  PackageIcon,
  ReceiptIcon,
  ShipIcon,
  SproutIcon,
  WarehouseIcon,
} from "lucide-react"

import { formatInr } from "@/features/marketplace/currency"
import { buildOrderBook } from "@/features/dashboard/demo-data"
import { HoverBars, PaddedDonut, PipelineFlow, RevealArea, SemiRadial, StripedComposed, type Stage } from "@/features/dashboard/home-charts"
import { HomeCard, HomeHeader, StatRow, TaskList, monthLabels, seedOf, series, weekLabels, type Stat, type Task } from "@/features/dashboard/home-ui"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import type { OnboardingRole } from "@/features/onboarding/types"

/**
 * A seller's home, in the order their eye goes after signing in: four
 * numbers (what's held, what's received, who's waiting on a price, who's
 * asking), then where their deals stand from first chat to invoice, what
 * to do next, what reached Mumbai, and how buyers are responding.
 */
function SellerHome({ seed, tonnes, lots }: { seed: number; tonnes: number; lots: number }) {
  const weeks = weekLabels(8)
  const received = series(seed + 5, 8, tonnes / 4 + 6, tonnes / 8 + 3)
  const views = series(seed + 9, 8, 140, 50)
  const enquiries = views.map((value, index) => Math.round(value / 9 + (index % 3)))

  const stats: Stat[] = [
    { label: "In our lots", value: `${tonnes} MT`, caption: `≈ ${formatInr(tonnes * 182_000)} held in amama warehouses`, trend: series(seed, 10, tonnes, tonnes / 3 + 4), icon: WarehouseIcon, href: "/seller/dashboard/orders?view=shipments" },
    { label: "GRNs this month", value: String(lots * 3 + 2), caption: "Goods received at Mumbai", trend: series(seed + 3, 10, lots * 3, 4), icon: ClipboardCheckIcon, href: "/seller/dashboard/orders" },
    { label: "RFQs to quote", value: String(Math.max(1, lots - 1)), caption: "Buyers waiting on your price", trend: series(seed + 7, 10, lots, 3), icon: ClipboardListIcon, href: "/seller/dashboard/rfqs" },
    { label: "Buyer enquiries", value: String(enquiries[enquiries.length - 1]), caption: "Chats this week", trend: enquiries, icon: MessagesSquareIcon, href: "/seller/dashboard/messages" },
  ]

  const steps: Stage[] = [
    { label: "Enquiries", value: 24 + (seed % 6), dropLabel: "Still chatting" },
    { label: "KAM assist", value: 12 + (seed % 3), dropLabel: "Negotiating" },
    { label: "Contract signed", value: 7, dropLabel: "Awaiting PO" },
    { label: "PO received", value: 6, dropLabel: "In transit" },
    { label: "GRN issued", value: 5, dropLabel: "Invoice due" },
    { label: "Invoiced", value: 3 },
  ]

  const tasks: Task[] = [
    { title: "Sign contract", detail: "Basmati 1121 · 120 MT · Al Noor Foods", tag: "CT-2041", href: "/seller/dashboard/contracts", icon: FileSignatureIcon, urgent: true },
    { title: "Acknowledge purchase order", detail: "Turmeric finger · 40 MT · FOB Nhava Sheva", tag: "PO-88213", href: "/seller/dashboard/orders", icon: FileTextIcon },
    { title: "Quote on an RFQ", detail: "Red chilli Teja · 60 MT · Dubai", tag: "RFQ-1187", href: "/seller/dashboard/rfqs", icon: ClipboardListIcon },
    { title: "Raise invoice", detail: "Goods received at Mumbai DC, QC passed", tag: "GRN-41820", href: "/seller/dashboard/orders", icon: ReceiptIcon },
    { title: "Farm QC before dispatch", detail: "Lot L-2207 leaves Friday", tag: "QC", href: "/seller/dashboard/orders", icon: SproutIcon },
  ]

  return (
    <>
      <HomeHeader />
      <div className="mt-6">
        <StatRow stats={stats} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <HomeCard className="lg:col-span-2" title="Deal pipeline" subtitle="From first chat to invoice" href="/seller/dashboard/contracts" figure={String(steps[2].value)} figureCaption="contracts signed this season">
          <PipelineFlow stages={steps} />
        </HomeCard>
        <HomeCard title="Up next" subtitle="What needs you today" href="/seller/dashboard/orders">
          <TaskList tasks={tasks} />
        </HomeCard>
        <HomeCard title="Received at Mumbai" subtitle="Tonnes accepted each week, and the GRNs behind them" href="/seller/dashboard/orders?view=shipments" figure={`${received.reduce((sum, value) => sum + value, 0)} MT`} figureCaption="last 8 weeks">
          <StripedComposed data={weeks.map((week, index) => ({ week, tonnes: received[index], grns: Math.max(1, Math.round(received[index] / 6)) }))} xKey="week" bar={{ key: "tonnes", label: "Tonnes", tone: "blue" }} line={{ key: "grns", label: "GRNs", tone: "orange" }} />
        </HomeCard>
        <HomeCard title="Enquiries by product" subtitle="Which listings buyers are asking about" href="/seller/dashboard/listings" figure={String(enquiries.reduce((a, b) => a + b, 0))} figureCaption="enquiries in 8 weeks">
          <SemiRadial slices={[{ name: "Basmati", value: 38 + (seed % 7) }, { name: "Turmeric", value: 27 }, { name: "Red chilli", value: 21 }, { name: "Cumin", value: 14 }]} />
        </HomeCard>
        <HomeCard title="Stock by grade" subtitle="What's sitting in our lots for you" href="/seller/dashboard/orders?view=shipments" figure={`${tonnes} MT`} figureCaption="in storage">
          <PaddedDonut slices={[{ name: "Grade A", value: Math.round(tonnes * 0.46) }, { name: "Grade B", value: Math.round(tonnes * 0.3) }, { name: "Premium", value: Math.round(tonnes * 0.16) }, { name: "Under QC", value: Math.max(1, Math.round(tonnes * 0.08)) }]} />
        </HomeCard>
        <HomeCard className="lg:col-span-3" title="Buyer interest" subtitle="Listing views and the chats they turn into" href="/seller/dashboard/listings" figure={`${Math.round((enquiries.reduce((a, b) => a + b, 0) / views.reduce((a, b) => a + b, 0)) * 100)}%`} figureCaption="of views become enquiries">
          <HoverBars data={weeks.map((week, index) => ({ week, views: Math.round(views[index] / 10), enquiries: enquiries[index] }))} xKey="week" series={[{ key: "views", label: "Views ÷ 10", tone: "violet" }, { key: "enquiries", label: "Enquiries", tone: "pink" }]} variant="gradient" />
        </HomeCard>
      </div>
    </>
  )
}

/**
 * A buyer's home: spend, open POs, what lands soon, what's waiting on
 * their signature — then the procurement pipeline from PR to paid
 * invoice, what to do next, monthly spend, and arrivals.
 */
function BuyerHome({ seed, tonnes, orders }: { seed: number; tonnes: number; orders: number }) {
  const months = monthLabels(6)
  const spend = series(seed + 4, 6, 42, 16)
  const weeks = weekLabels(6).map((_, index) => `W+${index + 1}`)
  const arriving = series(seed + 8, 6, tonnes / 5 + 8, tonnes / 10 + 4)

  const stats: Stat[] = [
    { label: "Spend this season", value: formatInr(tonnes * 214_000), caption: `${tonnes} MT contracted`, trend: series(seed, 10, tonnes, tonnes / 3 + 4), icon: ReceiptIcon, href: "/buyer/dashboard/orders" },
    { label: "Open POs", value: String(orders), caption: "Issued and not yet received", trend: series(seed + 3, 10, orders, 2), icon: PackageIcon, href: "/buyer/dashboard/orders" },
    { label: "Arriving in 14 days", value: `${arriving[0] + arriving[1]} MT`, caption: "Plan your warehouse slots", trend: series(seed + 7, 10, tonnes / 2, tonnes / 4 + 2), icon: ShipIcon, href: "/buyer/dashboard/orders?tab=eta" },
    { label: "Contracts to sign", value: String(Math.max(1, Math.round(orders / 2))), caption: "Term sheets agreed, awaiting you", trend: series(seed + 11, 10, orders / 2, 2), icon: FileSignatureIcon, href: "/buyer/dashboard/contracts" },
  ]

  const steps: Stage[] = [
    { label: "PR raised", value: 16 + (seed % 5), dropLabel: "Drafting RFQ" },
    { label: "RFQ sent", value: 12, dropLabel: "Awaiting quotes" },
    { label: "Contract signed", value: 7, dropLabel: "Comparing" },
    { label: "PO issued", value: 6, dropLabel: "Supplier confirming" },
    { label: "GRN received", value: 4, dropLabel: "On the water" },
    { label: "Invoice paid", value: 3 },
  ]

  const tasks: Task[] = [
    { title: "Compare quotes", detail: "Basmati 1121 · 4 sellers replied", tag: "RFQ-1172", href: "/buyer/dashboard/rfqs", icon: ClipboardListIcon, urgent: true },
    { title: "Sign contract", detail: "Turmeric finger · 40 MT · CIF Jebel Ali", tag: "CT-2038", href: "/buyer/dashboard/contracts", icon: FileSignatureIcon },
    { title: "Confirm goods received", detail: "Red chilli Teja · 18 MT landed", tag: "GRN-41766", href: "/buyer/dashboard/orders", icon: PackageCheckIcon },
    { title: "Approve invoice", detail: "Matched to PO and GRN", tag: "INV-30912", href: "/buyer/dashboard/orders", icon: ReceiptIcon },
  ]

  return (
    <>
      <HomeHeader />
      <div className="mt-6">
        <StatRow stats={stats} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <HomeCard className="lg:col-span-2" title="Procurement pipeline" subtitle="From requisition to paid invoice" href="/buyer/dashboard/orders" figure={String(steps[3].value)} figureCaption="purchase orders issued this season">
          <PipelineFlow stages={steps} />
        </HomeCard>
        <HomeCard title="Up next" subtitle="What needs you today" href="/buyer/dashboard/orders">
          <TaskList tasks={tasks} />
        </HomeCard>
        <HomeCard title="Spend" subtitle="Contracted value by month, ₹ lakh, and POs issued" href="/buyer/dashboard/orders" figure={`₹${spend.reduce((a, b) => a + b, 0)} L`} figureCaption="last 6 months">
          <StripedComposed data={months.map((month, index) => ({ month, spend: spend[index], pos: Math.max(1, Math.round(spend[index] / 9)) }))} xKey="month" bar={{ key: "spend", label: "Spend", tone: "violet" }} line={{ key: "pos", label: "POs", tone: "orange" }} />
        </HomeCard>
        <HomeCard title="Spend by supplier" subtitle="Where this season's money went" href="/buyer/dashboard/orders" figure={formatInr(tonnes * 214_000)} figureCaption="contracted">
          <PaddedDonut slices={[{ name: "Patil Agro", value: 34 }, { name: "Kaveri Farms", value: 26 }, { name: "Deccan Spice", value: 22 }, { name: "Others", value: 18 }]} />
        </HomeCard>
        <HomeCard title="Quotes per RFQ" subtitle="How many sellers answer each request" href="/buyer/dashboard/rfqs" figure={(3.6).toFixed(1)} figureCaption="quotes on average">
          <HoverBars data={["Basmati", "Turmeric", "Chilli", "Cumin", "Pepper"].map((product, index) => ({ product, quotes: [5, 4, 3, 4, 2][index] + (seed % 2) }))} xKey="product" series={[{ key: "quotes", label: "Quotes", tone: "amber" }]} variant="duotone" />
        </HomeCard>
        <HomeCard className="lg:col-span-3" title="Arrivals" subtitle="Tonnes landing in the weeks ahead" href="/buyer/dashboard/orders?tab=eta" figure={`${arriving.reduce((a, b) => a + b, 0)} MT`} figureCaption="next 6 weeks">
          <RevealArea data={weeks.map((week, index) => ({ week, arriving: arriving[index], planned: arriving[index] + 4 - (index % 3) * 3 }))} xKey="week" series={[{ key: "arriving", label: "Arriving", tone: "teal" }, { key: "planned", label: "Planned", tone: "blue" }]} />
        </HomeCard>
      </div>
    </>
  )
}

function DashboardOverview({ role }: { role: OnboardingRole }) {
  const { draft } = useOnboarding()
  const person = role === "buyer" ? draft.buyer : draft.seller

  const orders = React.useMemo(
    () =>
      buildOrderBook({
        crops: role === "buyer" ? draft.buyer.sourcing : draft.seller.produce,
        country: person.country,
        role,
        counterparty: role === "buyer" ? draft.buyer.companyName || "Your company" : draft.seller.farmName || "Your farm",
      }),
    [role, draft.buyer.sourcing, draft.seller.produce, person.country, draft.buyer.companyName, draft.seller.farmName]
  )
  const tonnes = orders.reduce((sum, order) => sum + order.tonnes, 0)
  const seed = seedOf(person.email || role) + tonnes

  return (
    <div>
      {role === "seller" ? (
        <SellerHome seed={seed} tonnes={orders.filter((order) => order.gatesCleared >= 3).reduce((sum, order) => sum + order.tonnes, 0)} lots={orders.length} />
      ) : (
        <BuyerHome seed={seed} tonnes={tonnes} orders={orders.length} />
      )}
    </div>
  )
}

export { DashboardOverview }
