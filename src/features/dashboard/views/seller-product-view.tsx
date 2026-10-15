"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  PackageSearchIcon,
  PenLineIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ColumnCard, OnWhite, RecordCrumbs } from "@/components/ui/column-card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { productLabel } from "@/features/marketplace/catalog"
import { sellerIdentity } from "@/features/marketplace/identity"
import { ConversationThread } from "@/features/marketplace/conversation-thread"
import {
  logSystemMessage,
  sendMessage,
  toThreadMessages,
  useConversations,
} from "@/features/marketplace/conversation-store"
import { DealStatusFooter } from "@/features/marketplace/deal-status-footer"
import { latestDealForConversation, useDeals } from "@/features/marketplace/deal-store"
import {
  softDeleteListing,
  useListings,
  type ModerationStatus,
} from "@/features/marketplace/listing-store"
import { ProductInfoPanel } from "@/features/marketplace/product-info-panel"
import { ProposeDealDialog } from "@/features/marketplace/propose-deal-dialog"
import { useOnboarding } from "@/features/onboarding/onboarding-context"

/** The header's status pill, one entry per `ModerationStatus` — unlike the
 *  buyer's page, a seller sees all three, since it's their own listing's
 *  standing with the KAM, not something to soften. */
const moderationPill: Record<ModerationStatus, { label: string; className: string }> = {
  verified: { label: "Verified", className: "bg-amama-subtle text-amama-deep" },
  unverified: { label: "Pending review", className: "bg-status-warning/15 text-status-warning" },
  flagged: { label: "Flagged", className: "bg-destructive/10 text-destructive" },
}

/** Same viewport-relative height as every other full-height chat surface
 *  in the dashboard — the topbar offset (80px) plus the content wrapper's
 *  own bottom padding (12px, `pb-3`) — only from `lg` up: below that the
 *  panels stack and the page scrolls normally. */
const FULL_HEIGHT = "lg:h-[calc(100dvh-76px)]"

/**
 * The seller's side of a single product: who's asked about it, and the
 * conversation with whichever one is selected. There can be several
 * buyers for one listing (unlike the buyer's own product page, which only
 * ever has one seller to talk to) — so the right column is a small
 * master/detail of its own, sliding from the buyer list to a transcript
 * and back within the same panel rather than opening a new one.
 *
 * Both panels sit inside one fixed-height row, each scrolling on its own —
 * the page itself never does, and the "back" link lives inside the info
 * panel's own header for the same reason as the buyer's version.
 *
 * That row layout only holds from `lg` up, same as the buyer's page — below
 * it, the buyer list/conversation column collapses into a bottom dock
 * (showing whichever buyer is selected, or a plain "buyers" prompt when
 * none is) that morphs into the same view full-screen on tap, rather than
 * sitting behind however long the product info runs. One shared `layoutId`
 * between the dock and the sheet, both at the same modest corner radius
 * (never `rounded-full`) — see the note on the buyer page for why a pill
 * shape makes that particular animation look chaotic instead of smooth.
 */
function SellerProductView({ listingId }: { listingId: string }) {
  const router = useRouter()
  const { draft } = useOnboarding()
  const seller = sellerIdentity(draft.seller)
  const listings = useListings()
  const listing = listings.find((entry) => entry.id === listingId)

  const conversations = useConversations()
  const productConversations = React.useMemo(
    () => conversations.filter((entry) => entry.listingId === listingId && entry.sellerId === seller.id),
    [conversations, listingId, seller.id]
  )

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected = productConversations.find((entry) => entry.id === selectedId) ?? null
  const [mobileChatOpen, setMobileChatOpen] = React.useState(false)
  const deals = useDeals()
  const selectedDeal = selected ? latestDealForConversation(deals, selected.id) : null
  // Same rule the deal footer already follows — once a deal is proposed or
  // agreed, that's the one place to move it forward, not a second proposal
  // started from the composer.
  const canPropose = !!selected && (!selectedDeal || selectedDeal.status === "declined")
  const [proposing, setProposing] = React.useState(false)
  const [confirmingRemove, setConfirmingRemove] = React.useState(false)

  if (!listing) {
    return (
      <ColumnCard title="Listings">
        <div className="flex flex-col items-center gap-3 rounded-[20px] bg-card py-16 text-center">
          <PackageSearchIcon className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">This listing no longer exists</p>
          <Link href="/seller/dashboard/listings" className="text-[13px] font-medium text-amama-deep underline">
            Back to your catalog
          </Link>
        </div>
      </ColumnCard>
    )
  }

  const cropLabel = productLabel(listing.cropId)
  const messages = selected ? toThreadMessages(selected.messages, "seller") : null
  // Off the filtered list — the newest raw message may be the KAM's
  // private chase to the buyer, which must not surface in the seller's
  // dock preview.
  const lastMessage = messages?.[messages.length - 1] ?? null

  const handleRemove = () => {
    softDeleteListing(listing.id)
    if (productConversations.length > 0) {
      logSystemMessage(listing.id, `${seller.name} removed this listing`)
    }
    router.push("/seller/dashboard/listings")
  }

  // Shared between the desktop inline column and the mobile full-screen
  // overlay — same buyer list ↔ conversation slide track either way, just
  // a different frame around it.
  const buyersAndConversation = (
    <div
      className={cn(
        "flex h-full w-[200%] transition-transform duration-300 ease-out",
        selected ? "-translate-x-1/2" : "translate-x-0"
      )}
    >
      <div className="h-full w-1/2 shrink-0">
        <BuyerList cropLabel={cropLabel} conversations={productConversations} onSelect={setSelectedId} />
      </div>
      <div className="h-full w-1/2 shrink-0">
        <ConversationThread
          header={
            selected ? (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Back to buyers"
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ArrowLeftIcon className="size-4" />
                </button>
                <p className="text-[14px] font-semibold text-foreground">{selected.buyerName}</p>
              </div>
            ) : null
          }
          messages={messages}
          onSend={(text) => selected && sendMessage(selected.id, "seller", text)}
          viewer="seller"
          viewerName={seller.name}
          placeholder={selected ? `Message ${selected.buyerName}…` : undefined}
          emptyState={<p className="text-[13px] text-muted-foreground">Pick a buyer to reply.</p>}
          conversationId={selected?.id}
          composerParties={selected ? [{ party: "buyer", name: selected.buyerName }] : []}
          onProposeDeal={canPropose ? () => setProposing(true) : undefined}
        />
      </div>
    </div>
  )

  return (
    <div className={cn("flex flex-col gap-3 pb-20 lg:flex-row lg:overflow-hidden lg:pb-0", FULL_HEIGHT)}>
      <OnWhite>
        <aside className="flex flex-col overflow-hidden rounded-[24px] bg-background p-2 lg:w-[380px] lg:shrink-0">
          <header className="flex shrink-0 items-center gap-2.5 px-2 pt-1.5 pb-3">
            <Link
              href="/seller/dashboard/listings"
              aria-label="Back to listings"
              title="Listings"
              className="grid size-9 shrink-0 place-items-center rounded-xl text-foreground/75 transition-colors hover:bg-muted"
            >
              <ChevronLeftIcon aria-hidden className="size-5 rtl:-scale-x-100" />
            </Link>
            <div className="min-w-0 flex-1">
              <RecordCrumbs crumbs={[{ label: "Listings", href: "/seller/dashboard/listings" }]} />
              <h1 className="mt-1 truncate text-[20px] leading-tight font-semibold tracking-[-0.02em]">{cropLabel}</h1>
            </div>
            <span
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                moderationPill[listing.moderationStatus].className
              )}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {moderationPill[listing.moderationStatus].label}
            </span>
          </header>
          <div aria-hidden className="mx-3 h-px shrink-0 bg-border" />

          <div className="px-2 pt-3 pb-2 [scrollbar-width:none] lg:min-h-0 lg:flex-1 lg:overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <ProductInfoPanel listing={listing} showSeller={false} />
          </div>

          {selected ? (
            <div className="shrink-0 px-2 pt-1 pb-1">
              <DealStatusFooter
                deal={selectedDeal}
                conversation={selected}
                listing={listing}
                role="seller"
                myName={seller.name}
                counterpartName={selected.buyerName}
                className="pt-0"
              />
            </div>
          ) : !listing.deletedAt ? (
            <div className="flex shrink-0 items-center gap-2 px-1 pt-2 pb-1">
              <Button
                variant="outline"
                onClick={() => setConfirmingRemove(true)}
                className="h-10 rounded-xl px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2Icon className="size-4" />
                Remove
              </Button>
              <Link
                href={`/seller/dashboard/listings/${listing.id}/edit`}
                className={cn(buttonVariants(), "h-10 flex-1 rounded-xl")}
              >
                <PenLineIcon className="size-4" />
                Edit listing
              </Link>
            </div>
          ) : null}
        </aside>
      </OnWhite>

      <Dialog open={confirmingRemove} onOpenChange={setConfirmingRemove}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove this listing?</DialogTitle>
            <DialogDescription>
              Buyers won&apos;t find {cropLabel} in the marketplace any more. Existing conversations stay where they are.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingRemove(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Desktop: inline, side by side. */}
      <div
        className={cn(
          "relative hidden overflow-hidden rounded-[24px] bg-background lg:block lg:flex-1",
          FULL_HEIGHT
        )}
      >
        {buyersAndConversation}
      </div>

      {/* Mobile/tablet: a collapsed dock pinned to the bottom, morphing into
          the same buyer list/conversation full-screen on tap. `z-20`, below
          the mobile nav drawer (`z-40`) and its backdrop (`z-30`) — see the
          buyer page for why. */}
      <AnimatePresence>
        {!mobileChatOpen ? (
          <motion.button
            key="dock"
            layoutId="seller-chat-surface"
            type="button"
            onClick={() => setMobileChatOpen(true)}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-4 bottom-4 z-20 flex items-center gap-3 rounded-3xl bg-background px-4 py-3 text-start shadow-lg lg:hidden"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-[13px] font-bold text-foreground/70">
              {selected ? selected.buyerName.charAt(0) : <UsersIcon className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-foreground">
                {selected ? selected.buyerName : "Buyers"}
              </span>
              <span className="block truncate text-[12px] text-muted-foreground">
                {selected
                  ? lastMessage?.text
                  : productConversations.length > 0
                    ? `${productConversations.length} asked about ${cropLabel}`
                    : "No one's reached out yet"}
              </span>
            </span>
            <MessageCircleIcon className="size-4 shrink-0 text-muted-foreground" />
          </motion.button>
        ) : (
          <motion.div
            key="sheet"
            layoutId="seller-chat-surface"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-2 z-50 overflow-hidden rounded-3xl bg-card shadow-2xl lg:hidden"
          >
            {/* Floats over whichever header the slide track is already
                showing (the buyer list's own, or the conversation's own
                back+name) rather than adding a second, redundant title bar
                above it. */}
            <button
              type="button"
              onClick={() => setMobileChatOpen(false)}
              aria-label="Close"
              className="absolute end-3 top-3 z-10 grid size-8 shrink-0 place-items-center rounded-full bg-card text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="relative h-full overflow-hidden"
            >
              {buyersAndConversation}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {selected ? (
        <ProposeDealDialog
          open={proposing}
          onOpenChange={setProposing}
          listing={listing}
          conversation={selected}
          role="seller"
          myName={seller.name}
        />
      ) : null}
    </div>
  )
}

function BuyerList({
  cropLabel,
  conversations,
  onSelect,
}: {
  cropLabel: string
  conversations: ReturnType<typeof useConversations>
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-5 pt-4 pb-3">
        <p className="text-[17px] font-semibold tracking-[-0.02em] text-foreground">Buyers</p>
        <p className="text-[12.5px] text-muted-foreground">Everyone who&apos;s asked about {cropLabel}</p>
      </div>
      <div aria-hidden className="mx-5 h-px shrink-0 bg-border" />
      {conversations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <UsersIcon className="size-5 text-muted-foreground" />
          <p className="text-[13px] text-muted-foreground">No one&apos;s reached out yet.</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto p-2">
          {conversations.map((conversation) => {
            // Filtered, so a KAM's buyer-only message never previews here.
            const visible = toThreadMessages(conversation.messages, "seller")
            const last = visible[visible.length - 1]
            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  className="chat-row flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-start transition-colors [--row-inset:3.25rem] hover:bg-card"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[12px] font-bold text-foreground/70">
                    {conversation.buyerName.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-foreground">
                      {conversation.buyerName}
                    </span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {last?.text}
                    </span>
                  </span>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { SellerProductView }
