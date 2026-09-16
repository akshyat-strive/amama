import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Admin-only counterparts to `dashboard-ui.tsx`'s `Panel`/`StatCard` — not a
 * fork out of neglect, but because that file is shared with the buyer/seller
 * dashboards, and this app's own visual signature (a bordered, hardcoded-
 * radius frame with a neutral header band separated from a white body) is
 * specific to the admin module's redesign. Changing `Panel` itself would
 * quietly restyle every buyer/seller page that uses it.
 *
 * The radius is intentionally a hardcoded pixel value, not a Tailwind scale
 * step (`rounded-2xl`/`rounded-3xl`) — same reasoning as the sidebar's own
 * `rounded-[24px]`/`rounded-[20px]`: a fixed value nests predictably against
 * other fixed values instead of drifting with whatever the scale happens to
 * define next to it.
 */
function AdminPanel({
  title,
  subtitle,
  children,
  className,
  action,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}) {
  return (
    <section className={cn("overflow-hidden rounded-[20px] border border-border bg-muted", className)}>
      <header className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      <div className="border-t border-border bg-card">{children}</div>
    </section>
  )
}

/** A headline number with its unit and a line of context — same shape as
 *  `StatCard`, just on the admin module's own hardcoded radius. */
function AdminStatCard({
  label,
  value,
  unit,
  caption,
  tone = "brand",
}: {
  label: string
  value: string
  unit?: string
  caption?: string
  tone?: "brand" | "warning" | "plain"
}) {
  return (
    <div className="rounded-[20px] border border-border bg-card px-4 py-4">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-[28px] leading-none font-semibold tracking-tight tabular-nums",
          tone === "brand" && "text-amama-deep",
          tone === "warning" && "text-status-warning",
          tone === "plain" && "text-foreground"
        )}
      >
        {value}
        {unit ? <span className="ms-1 align-baseline text-[13px] font-medium text-muted-foreground">{unit}</span> : null}
      </p>
      {caption ? <p className="mt-1.5 text-[12px] text-muted-foreground">{caption}</p> : null}
    </div>
  )
}

/** A plain bordered card for standalone list items (a listing, an
 *  application) that don't need a distinct header band — just the shared
 *  hardcoded radius so every admin surface nests consistently. */
function AdminCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <article className={cn("rounded-[20px] border border-border bg-card p-5", className)}>{children}</article>
}

/** The empty-state shape used across every admin queue/list. */
function AdminEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
  description?: string
}) {
  return (
    <div className="mt-6 flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-border px-5 py-16 text-center">
      <Icon aria-hidden className="size-6 text-muted-foreground" />
      <p className="text-[15px] font-semibold">{title}</p>
      {description ? <p className="max-w-sm text-[13px] text-muted-foreground">{description}</p> : null}
    </div>
  )
}

/** The "currently selected" treatment nav items and channel rows share —
 *  bright brand green with a matching border, not a solid deep fill, so
 *  a selected list row reads as the same move as a selected sidebar item. */
const ADMIN_SELECTED_CLASS = "bg-amama text-amama-foreground border border-amama-foreground"

export { AdminPanel, AdminStatCard, AdminCard, AdminEmptyState, ADMIN_SELECTED_CLASS }
