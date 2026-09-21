import type { Metadata } from "next"
import Link from "next/link"
import { BuildingIcon, SproutIcon, StoreIcon } from "lucide-react"

export const metadata: Metadata = { title: "amama" }

const roles = [
  {
    href: "/buyer/login",
    label: "Buyer",
    description: "Source produce direct from growers, negotiate, and track every shipment.",
    icon: StoreIcon,
  },
  {
    href: "/seller/login",
    label: "Seller",
    description: "List your harvest, quote RFQs, and manage orders through to delivery.",
    icon: SproutIcon,
  },
  {
    href: "/internal/login",
    label: "Amama Internal",
    description: "The team's own console — deals, contracts, logistics and finance.",
    icon: BuildingIcon,
  },
]

/** The one door into the app — a buyer, a seller and the internal team
 *  all sign in differently, so this asks which one you are instead of
 *  guessing (this used to redirect straight to `/buyer/login`, which
 *  silently locked out anyone arriving to sell or to work). */
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-3xl">
        <p className="text-center text-2xl font-bold tracking-tight text-amama-deep">amama</p>
        <h1 className="mt-4 text-center text-[28px] font-bold tracking-tight text-balance sm:text-[34px]">
          Who&apos;s signing in?
        </h1>
        <p className="mt-2 text-center text-[15px] text-muted-foreground">
          Choose how you&apos;d like to continue.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {roles.map((role) => (
            <Link
              key={role.href}
              href={role.href}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 text-start transition-colors hover:border-amama-deep/40 hover:bg-muted"
            >
              <span className="grid size-11 place-items-center rounded-full bg-amama-subtle text-amama-deep">
                <role.icon className="size-5" />
              </span>
              <div>
                <p className="text-[16px] font-bold text-foreground">{role.label}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{role.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
