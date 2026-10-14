/* eslint-disable @next/next/no-img-element -- remote Unsplash photos, sized by CSS; next/image would need a remotePatterns entry for one page */
import Link from "next/link"
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  BuildingIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  CrownIcon,
  FileSignatureIcon,
  GemIcon,
  MapIcon,
  MessagesSquareIcon,
  PackageCheckIcon,
  ShieldCheckIcon,
  SproutIcon,
  StoreIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { AmamaWordmark } from "@/components/brand/amama-wordmark"
import { CorridorFigure } from "@/features/landing/corridor-figure"
import { MacMockup } from "@/features/landing/mac-mockup"
import { PixelHalftone } from "@/features/landing/pixel-halftone"
import { WAREHOUSE_STAGES, WarehouseFigure } from "@/features/landing/warehouse-figure"
import "@/features/landing/landing.css"

/** The three doors into the CRM — each signs in differently. */
const ENTRIES = {
  buyer: { href: "/buyer/login", label: "Start buying" },
  seller: { href: "/seller/login", label: "Start selling" },
  team: { href: "/internal/login", label: "Team sign in" },
}

function photo(id: string, width: number) {
  return `https://images.unsplash.com/${id}?w=${width}&q=75&fit=crop&auto=format`
}

/* ── small pieces ──────────────────────────────────────────────────────── */

function Wrap({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1080px] px-[22px]", className)}>{children}</div>
}

function PrimaryLink({ href, children, size = "md" }: { href: string; children: React.ReactNode; size?: "md" | "lg" }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center justify-center gap-2 rounded-full bg-[#1d1d1f] text-white transition-[background-color,transform] duration-200 hover:bg-black active:scale-[0.97]",
        size === "lg" ? "h-14 px-8 text-[17px]" : "h-11 px-6 text-[15px]"
      )}
    >
      {children}
      <ArrowRightIcon aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
    </Link>
  )
}

function GhostLink({ href, children, size = "md" }: { href: string; children: React.ReactNode; size?: "md" | "lg" }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full text-[#1d1d1f] shadow-[inset_0_0_0_1.5px_#1d1d1f] transition-[background-color,color,transform] duration-200 hover:bg-[#1d1d1f] hover:text-white active:scale-[0.97]",
        size === "lg" ? "h-14 px-8 text-[17px]" : "h-11 px-6 text-[15px]"
      )}
    >
      {children}
    </Link>
  )
}

function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1 text-[17px] text-[#1d1d1f] hover:underline hover:underline-offset-4">
      {children}
      <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">›</span>
    </Link>
  )
}

/** A section title in two tones: the claim in charcoal, the reason in
 *  secondary charcoal. */
function Title({ id, lead, rest, className }: { id?: string; lead: string; rest?: string; className?: string }) {
  return (
    <h2 id={id} className={cn("head text-[36px] leading-[1.08] tracking-[-0.028em] text-balance sm:text-[48px] lg:text-[56px]", className)}>
      {lead}
      {rest ? <span className="text-[#6e6e73]"> {rest}</span> : null}
    </h2>
  )
}

/* ── nav ───────────────────────────────────────────────────────────────── */

function Nav() {
  return (
    <header className="sticky top-0 z-50 h-[52px] border-b border-black/[0.08] bg-white/80 backdrop-blur-xl backdrop-saturate-[1.8]">
      <Wrap className="flex h-full items-center gap-6">
        <Link href="/" aria-label="amama home" className="me-auto text-[#1d1d1f]">
          <AmamaWordmark className="h-[15px]" />
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-6 text-[12.5px] text-[#1d1d1f]/80 md:flex">
          <a href="#how" className="hover:text-[#1d1d1f]">How it works</a>
          <a href="#platform" className="hover:text-[#1d1d1f]">Platform</a>
          <a href="#start" className="hover:text-[#1d1d1f]">Who it&apos;s for</a>
          <a href="#plans" className="hover:text-[#1d1d1f]">Plans</a>
        </nav>
        <details className="group relative">
          <summary className="flex h-8 cursor-pointer list-none items-center gap-1 rounded-full px-3 text-[12.5px] text-[#1d1d1f] hover:bg-black/[0.05] [&::-webkit-details-marker]:hidden">
            Sign in
            <ChevronDownIcon aria-hidden className="size-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="absolute end-0 top-[calc(100%+10px)] w-[240px] rounded-[18px] bg-white/95 p-1.5 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_20px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            {[
              { ...ENTRIES.buyer, label: "Buyer", hint: "Source and track orders", icon: StoreIcon },
              { ...ENTRIES.seller, label: "Seller", hint: "List harvests, ship lots", icon: SproutIcon },
              { ...ENTRIES.team, label: "amama team", hint: "KAMs, ops and finance", icon: BuildingIcon },
            ].map((entry) => (
              <Link key={entry.href} href={entry.href} className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 hover:bg-[#f5f5f7]">
                <entry.icon aria-hidden className="size-4 text-[#6e6e73]" />
                <span>
                  <span className="block text-[14px] text-[#1d1d1f]">{entry.label}</span>
                  <span className="block text-[12px] text-[#6e6e73]">{entry.hint}</span>
                </span>
              </Link>
            ))}
          </div>
        </details>
        <Link href="#start" className="hidden h-8 items-center rounded-full bg-[#1d1d1f] px-3.5 text-[12.5px] text-white hover:bg-black sm:inline-flex">
          Get started
        </Link>
      </Wrap>
    </header>
  )
}

/* ── sections ──────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="overflow-hidden pb-[72px] pt-6 text-center sm:pt-10">
      {/* The warehouse fills the top of the hero; the claim and the way in
          sit centred beneath it. */}
      <Wrap>
        <figure className="mx-auto max-w-[800px]">
          <WarehouseFigure />
          <figcaption className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 text-start sm:hidden">
            {WAREHOUSE_STAGES.map((stage) => (
              <div key={stage.n}>
                <p className="text-[14px]">
                  <span className="text-[#6e6e73]">{stage.n} </span>
                  <span className="font-semibold">{stage.title}</span>
                </p>
                <p className="text-[12.5px] text-[#6e6e73]">{stage.detail}</p>
              </div>
            ))}
          </figcaption>
        </figure>
      </Wrap>

      <Wrap className="mt-12 sm:mt-16">
        <h1 id="hero-title" className="head mx-auto max-w-[900px] text-[44px] leading-[1.04] tracking-[-0.03em] text-balance sm:text-[64px] lg:text-[80px]">
          Farm to port to buyer.
          <span className="block text-[#6e6e73]">One ledger.</span>
        </h1>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <PrimaryLink href={ENTRIES.buyer.href} size="lg">
            {ENTRIES.buyer.label}
          </PrimaryLink>
          <GhostLink href={ENTRIES.seller.href} size="lg">
            {ENTRIES.seller.label}
          </GhostLink>
        </div>
        <p className="mt-5 text-[14px] text-[#6e6e73]">
          On the amama team? <Link href={ENTRIES.team.href} className="text-[#1d1d1f] underline-offset-4 hover:underline">Sign in here ›</Link>
        </p>
      </Wrap>
      <Wrap className="mt-[72px] sm:mt-[96px]">
        <MacMockup />
      </Wrap>
    </section>
  )
}

function Numbers() {
  const items = [
    { value: "16", label: "stages tracked on every trade" },
    { value: "2", label: "quality checks per lot — farm and Mumbai DC" },
    { value: "1", label: "ledger from PR to paid invoice" },
    { value: "0", label: "middlemen between grower and importer" },
  ]
  return (
    <section aria-label="amama in numbers" className="border-t border-[#d2d2d7]">
      <Wrap className="grid grid-cols-2 gap-x-6 gap-y-10 py-[64px] lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.label}>
            <p className="head text-[48px] leading-none tracking-[-0.03em]">{item.value}</p>
            <p className="mt-3 max-w-[220px] text-[15px] text-[#6e6e73]">{item.label}</p>
          </div>
        ))}
      </Wrap>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "List and match", text: "Sellers list harvests with grade and volume. Buyers browse, or send one RFQ to many growers." },
    { n: "02", title: "Talk, then bring in a KAM", text: "Negotiate in chat. When terms are close, ask for an account manager to join." },
    { n: "03", title: "Contract and PO", text: "The KAM runs the term sheet to a signed contract. The buyer issues the purchase order." },
    { n: "04", title: "Farm QC and pickup", text: "The grower checks each lot before it leaves. Trucks are tracked to Mumbai." },
    { n: "05", title: "GRN and our QC", text: "At the Mumbai DC every lot is weighed, checked again and booked in with a GRN." },
    { n: "06", title: "Ship, deliver, invoice", text: "Containers sail, documents clear, the buyer confirms delivery and the invoice settles." },
  ]
  return (
    <section id="how" aria-labelledby="how-title" className="bg-[#f5f5f7] py-[80px] sm:py-[112px] lg:py-[140px]">
      <Wrap>
        <Title id="how-title" lead="How it works." rest="Six steps, one thread." />
        <figure className="mt-16 rounded-[28px] bg-white px-6 py-8 sm:px-12 sm:py-12 lg:px-16 lg:py-14">
          <figcaption className="flex flex-wrap items-baseline justify-between gap-2 text-[13px] text-[#6e6e73]">
            <span>
              <span className="text-[#1d1d1f]">Fig. 1</span> The amama corridor
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-[#25d366]" /> One lot, in motion
            </span>
          </figcaption>
          {/* Left to right on wide screens; top to bottom on a phone, so
              the stops keep their size and their room. */}
          <div className="mx-auto mt-10 hidden max-w-[920px] sm:block">
            <CorridorFigure orientation="horizontal" />
          </div>
          <div className="mx-auto mt-8 max-w-[340px] sm:hidden">
            <CorridorFigure orientation="vertical" />
          </div>
        </figure>
        <ol className="mt-16 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <li key={step.n}>
              <p className="text-[13px] text-[#6e6e73] tabular-nums">{step.n}</p>
              <p className="head mt-2 text-[24px] leading-[1.17] tracking-[-0.015em]">{step.title}</p>
              <p className="mt-2 text-[15px] leading-[1.5] text-[#6e6e73]">{step.text}</p>
            </li>
          ))}
        </ol>
      </Wrap>
    </section>
  )
}

type Feature = { icon: LucideIcon; title: string; text: string }

function Platform() {
  const features: Feature[] = [
    { icon: StoreIcon, title: "Marketplace and RFQs", text: "Graded listings, side-by-side quotes, one request to many sellers." },
    { icon: MessagesSquareIcon, title: "Chat with a KAM on call", text: "Every deal starts as a conversation. An account manager joins when asked." },
    { icon: FileSignatureIcon, title: "Contracts that sign themselves off", text: "Term sheet, clauses, amendments and signatures, step by step." },
    { icon: ClipboardListIcon, title: "PR to invoice", text: "Purchase requests, POs, GRNs and invoices matched in one record." },
    { icon: MapIcon, title: "Live road maps", text: "Farm-to-warehouse routes with alternatives, every truck inbound." },
    { icon: ShieldCheckIcon, title: "KYC that keeps up", text: "Documents, expiries and requests tracked as tickets, never lost." },
  ]
  return (
    <section id="platform" aria-labelledby="platform-title" className="py-[80px] sm:py-[112px] lg:py-[140px]">
      <Wrap>
        <Title id="platform-title" lead="Everything a trade needs." rest="Nothing it doesn't." />

        <div className="mt-16 grid gap-5 lg:grid-cols-2">
          <PhotoCard
            src={photo("photo-1500382017468-9049fed747ef", 1200)}
            alt="A wheat field at sunset"
            title="Start at the field."
            text="Farm QC, harvest dates and grades travel with every lot."
          />
          <PhotoCard
            src={photo("photo-1586528116311-ad8dd3c8310d", 1200)}
            alt="Pallets of boxed goods in a warehouse"
            title="Land at our Mumbai DC."
            text="Weighed, checked again, and booked in with a GRN."
          />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-[28px] bg-[#f5f5f7] p-8">
              <span className="grid size-11 place-items-center rounded-full bg-white">
                <feature.icon aria-hidden className="size-5 text-[#1d1d1f]" strokeWidth={1.75} />
              </span>
              <p className="head mt-8 text-[21px] leading-[1.2] tracking-[-0.015em]">{feature.title}</p>
              <p className="mt-2 text-[15px] leading-[1.5] text-[#6e6e73]">{feature.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <PhotoCard
            src={photo("photo-1605745341112-85968b19335b", 1400)}
            alt="A container ship at sea"
            title="Every container. Live."
            text="Vessel, ETA and documents, without the email chase."
            tall
          />
          <div className="relative isolate flex flex-col justify-between overflow-hidden rounded-[28px] bg-[#1d1d1f] p-8 text-white sm:p-10">
            <PixelHalftone color="rgba(37,211,102,0.45)" shape="top-right" seed={3} className="-z-10" />
            <PackageCheckIcon aria-hidden className="size-7 text-[#25d366]" strokeWidth={1.75} />
            <div className="mt-16">
              <p className="head text-[32px] leading-[1.1] tracking-[-0.02em]">
                Two checks.
                <span className="block text-white/55">No surprises.</span>
              </p>
              <p className="mt-3 max-w-[340px] text-[15px] leading-[1.5] text-white/70">
                The grower&apos;s QC at the farm and ours at the DC, side by side on every lot — before a container is ever booked.
              </p>
            </div>
          </div>
        </div>
      </Wrap>
    </section>
  )
}

function PhotoCard({ src, alt, title, text, tall = false }: { src: string; alt: string; title: string; text: string; tall?: boolean }) {
  return (
    <figure className={cn("relative overflow-hidden rounded-[28px] bg-[#f5f5f7]", tall ? "aspect-[4/3] lg:aspect-auto lg:min-h-[460px]" : "aspect-[4/3] sm:aspect-[16/11]")}>
      <img src={src} alt={alt} loading="lazy" className="absolute inset-0 size-full object-cover" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
      <figcaption className="absolute inset-x-0 bottom-0 p-8 text-white">
        <p className="head text-[28px] leading-[1.12] tracking-[-0.02em]">{title}</p>
        <p className="mt-1.5 max-w-[380px] text-[15px] text-white/80">{text}</p>
      </figcaption>
    </figure>
  )
}

function Audiences() {
  const audiences = [
    {
      icon: StoreIcon,
      who: "For importers",
      title: "Buy direct, with cover.",
      points: ["Graded listings from verified growers", "RFQs answered side by side", "A KAM on your contract", "Arrivals tracked to your door"],
      entry: ENTRIES.buyer,
      primary: true,
    },
    {
      icon: SproutIcon,
      who: "For growers and exporters",
      title: "Sell further, get paid.",
      points: ["List a harvest in minutes", "Quote RFQs from abroad", "Your lots safe at our Mumbai DC", "Payouts as gates clear"],
      entry: ENTRIES.seller,
      primary: false,
    },
    {
      icon: BuildingIcon,
      who: "For the amama team",
      title: "Run the desk.",
      points: ["Deals, contracts and KYC queues", "Warehouse inbound and outbound", "Logistics, finance and claims", "Every role, its own view"],
      entry: ENTRIES.team,
      primary: false,
    },
  ]
  return (
    <section id="start" aria-labelledby="start-title" className="bg-[#f5f5f7] py-[80px] sm:py-[112px] lg:py-[140px]">
      <Wrap>
        <Title id="start-title" lead="Three ways in." rest="Pick yours." />
        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {audiences.map((audience) => (
            <div key={audience.who} className="flex flex-col rounded-[28px] bg-white p-8 sm:p-10">
              <audience.icon aria-hidden className="size-7 text-[#1d1d1f]" strokeWidth={1.5} />
              <p className="mt-8 text-[14px] text-[#6e6e73]">{audience.who}</p>
              <p className="head mt-1 text-[28px] leading-[1.12] tracking-[-0.02em]">{audience.title}</p>
              <ul className="mt-6 flex-1">
                {audience.points.map((point) => (
                  <li key={point} className="flex gap-2.5 border-t border-[#e8e8ed] py-3 text-[15px] text-[#1d1d1f] first:border-0">
                    <BadgeCheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-[#6e6e73]" strokeWidth={1.75} />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                {audience.primary ? <PrimaryLink href={audience.entry.href}>{audience.entry.label}</PrimaryLink> : <GhostLink href={audience.entry.href}>{audience.entry.label}</GhostLink>}
              </div>
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  )
}

function Plans() {
  return (
    <section id="plans" aria-labelledby="plans-title" className="py-[80px] sm:py-[112px] lg:py-[140px]">
      <Wrap>
        <Title id="plans-title" lead="Plans." rest="Unlocked once your KYC is updated." />
        <div className="mx-auto mt-16 grid max-w-[920px] gap-5 lg:grid-cols-2">
          <div className="relative isolate flex flex-col overflow-hidden rounded-[28px] bg-[#1d1d1f] p-8 text-white sm:p-10">
            <PixelHalftone color="rgba(255,255,255,0.2)" shape="top-right" seed={5} strength={0.75} className="-z-10" />
            <p className="flex items-center gap-1.5 text-[14px] text-white/60">
              <GemIcon aria-hidden className="size-4" strokeWidth={1.75} /> amama Pro
            </p>
            <p className="head mt-1 text-[40px] leading-none tracking-[-0.03em]">Pro</p>
            <p className="mt-3 text-[15px] text-white/65">Trade directly, with more on tap.</p>
            <ul className="mt-8 flex-1">
              {[
                "Buyers and sellers connect one to one",
                "Faster account manager response",
                "Unlimited RFQs and listings",
                "Advanced deal and shipment analytics",
                "Priority document review",
              ].map((point) => (
                <PlanPoint key={point} dark>
                  {point}
                </PlanPoint>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="#start" className="inline-flex h-11 items-center rounded-full bg-white px-6 text-[15px] text-[#1d1d1f] transition-[background-color,transform] hover:bg-white/90 active:scale-[0.97]">
                Choose Pro
              </Link>
            </div>
          </div>

          <div className="relative isolate flex flex-col overflow-hidden rounded-[28px] bg-[#f3e7c9] p-8 text-[#3b2a06] sm:p-10">
            <PixelHalftone color="rgba(176,124,20,0.3)" shape="top-right" seed={9} strength={0.75} className="-z-10" />
            <p className="flex items-center gap-1.5 text-[14px] text-[#3b2a06]/65">
              <CrownIcon aria-hidden className="size-4" strokeWidth={1.75} /> amama Gold
            </p>
            <p className="head mt-1 text-[40px] leading-none tracking-[-0.03em]">Gold</p>
            <p className="mt-3 text-[15px] text-[#3b2a06]/70">Say what you need. We arrange it.</p>
            <ul className="mt-8 flex-1">
              {[
                "Priority KAM assistance",
                "Post a requirement and a need-by date — KAMs pool the demand and arrange the supply",
                "Dynamic lot sizing",
                "White-glove contract concierge",
                "Featured placement in RFQs and search",
                "Early access to new sellers and buyers",
              ].map((point) => (
                <PlanPoint key={point} gold>
                  {point}
                </PlanPoint>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="#start" className="inline-flex h-11 items-center rounded-full bg-[#3b2a06] px-6 text-[15px] text-[#f3e7c9] transition-[background-color,transform] hover:bg-[#2a1e04] active:scale-[0.97]">
                Choose Gold
              </Link>
            </div>
          </div>
        </div>
      </Wrap>
    </section>
  )
}

function PlanPoint({ children, dark = false, gold = false }: { children: React.ReactNode; dark?: boolean; gold?: boolean }) {
  return (
    <li className={cn("border-t py-3 text-[15px] first:border-0", dark ? "border-white/12 text-white/90" : gold ? "border-[#3b2a06]/12" : "border-[#e2e2e7] text-[#1d1d1f]")}>{children}</li>
  )
}

/**
 * The close: one last ask and the footer in a single section — the claim
 * and the three ways in on the left, the links on the right, a quiet line
 * of small print, and the amama wordmark across the full width, its
 * letters filled with a pixel halftone that settles into solid ink.
 */
function ClosingFooter() {
  const columns = [
    {
      title: "Explore",
      links: [
        { href: "#how", label: "How it works" },
        { href: "#platform", label: "Platform" },
        { href: "#start", label: "Who it's for" },
        { href: "#plans", label: "Plans" },
      ],
    },
    {
      title: "Sign in",
      links: [
        { href: ENTRIES.buyer.href, label: "Buyer" },
        { href: ENTRIES.seller.href, label: "Seller" },
        { href: ENTRIES.team.href, label: "amama team" },
      ],
    },
  ]
  return (
    <footer aria-labelledby="closing-title" className="overflow-hidden border-t border-[#d2d2d7] bg-white">
      <Wrap className="pt-[96px] sm:pt-[128px]">
        <div className="grid gap-16 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <Title id="closing-title" lead="Your next shipment," rest="already in motion." className="lg:text-[52px]" />
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <PrimaryLink href={ENTRIES.buyer.href}>{ENTRIES.buyer.label}</PrimaryLink>
              <GhostLink href={ENTRIES.seller.href}>{ENTRIES.seller.label}</GhostLink>
            </div>
            <div className="mt-6">
              <TextLink href={ENTRIES.team.href}>amama team sign in</TextLink>
            </div>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 lg:justify-self-end lg:gap-16">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="text-[13px] text-[#6e6e73]">{column.title}</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-[15px] text-[#1d1d1f] transition-colors hover:text-[#6e6e73]">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-24 flex flex-wrap items-center justify-between gap-3 border-t border-[#e8e8ed] pt-6 text-[12px] text-[#6e6e73]">
          <span>Cross-border produce trade · Mumbai DC</span>
          <span>Photos from Unsplash</span>
        </div>
      </Wrap>

      {/* The big wordmark — our own SVG, solid — over a pixel halftone
          that rises from the page's bottom edge behind it. */}
      <div aria-hidden className="relative isolate mt-16 overflow-hidden pt-10 pb-12 sm:pt-14 sm:pb-16">
        <PixelHalftone color="rgba(29,29,31,0.14)" shape="rise" cell={4} seed={11} className="-z-10" />
        <div className="mx-auto max-w-[1080px] px-[22px]">
          <AmamaWordmark className="mx-auto h-auto w-full max-w-[520px] text-[#1d1d1f]" />
        </div>
      </div>
    </footer>
  )
}

function LandingPage() {
  return (
    <div className="landing min-h-dvh">
      <Nav />
      <main>
        <Hero />
        <Numbers />
        <HowItWorks />
        <Platform />
        <Audiences />
        <Plans />
      </main>
      <ClosingFooter />
    </div>
  )
}

export { LandingPage }
