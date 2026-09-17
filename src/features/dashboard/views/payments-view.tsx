"use client"

import * as React from "react"
import { CheckCircle2Icon, ClockIcon, HourglassIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Panel, StatCard } from "@/features/dashboard/dashboard-ui"
import {
  buildOrderBook,
  buildPayments,
  type PaymentStatus,
} from "@/features/dashboard/demo-data"
import { formatInr } from "@/features/marketplace/currency"
import { useOnboarding } from "@/features/onboarding/onboarding-context"

const statusMeta: Record<
  PaymentStatus,
  { label: string; icon: typeof CheckCircle2Icon; className: string }
> = {
  paid: { label: "Paid", icon: CheckCircle2Icon, className: "bg-amama-subtle text-amama-deep" },
  processing: {
    label: "Processing",
    icon: HourglassIcon,
    className: "bg-status-info/10 text-status-info",
  },
  pending: {
    label: "Pending",
    icon: ClockIcon,
    className: "bg-status-warning/10 text-status-warning",
  },
}

function PaymentsView() {
  const { draft } = useOnboarding()
  const seller = draft.seller

  const payments = React.useMemo(() => {
    const orders = buildOrderBook({
      crops: seller.produce,
      country: seller.country,
      role: "seller",
      counterparty: seller.farmName || "Your farm",
    })
    return buildPayments(orders)
  }, [seller.produce, seller.country, seller.farmName])

  const paid = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amountUsd, 0)
  const outstanding = payments
    .filter((p) => p.status !== "paid")
    .reduce((sum, p) => sum + p.amountUsd, 0)

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Payments</h1>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <StatCard label="Paid out" value={formatInr(paid)} caption="Season to date" />
        <StatCard
          label="Outstanding"
          value={formatInr(outstanding)}
          caption="Processing or pending"
          tone="warning"
        />
      </div>

      <Panel title="Payment history" className="mt-4" subtitle="Newest first">
        <ul className="divide-y divide-border">
          {payments.map((payment) => {
            const meta = statusMeta[payment.status]
            const Icon = meta.icon
            return (
              <li
                key={payment.orderId}
                className="flex items-center gap-3 px-5 py-4"
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full",
                    meta.className
                  )}
                >
                  <Icon className="size-4" strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-foreground">{payment.orderId}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {payment.crop} · {payment.counterparty}
                  </p>
                </div>
                <div className="shrink-0 text-end">
                  <p className="text-[14px] font-semibold text-foreground tabular-nums">
                    {formatInr(payment.amountUsd)}
                  </p>
                  <p className="text-[12px] text-muted-foreground">{meta.label}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </Panel>
    </div>
  )
}

export { PaymentsView }
