"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeftIcon, BadgeCheckIcon, MessageCircleIcon, PackageSearchIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { cropLabels } from "@/features/dashboard/demo-data"
import { buyerIdentity } from "@/features/marketplace/identity"
import { ConversationThread } from "@/features/marketplace/conversation-thread"
import {
  conversationId,
  sendMessage,
  startConversation,
  toThreadMessages,
  useConversations,
} from "@/features/marketplace/conversation-store"
import { DealStatusFooter } from "@/features/marketplace/deal-status-footer"
import { latestDealForConversation, useDeals } from "@/features/marketplace/deal-store"
import { useListings } from "@/features/marketplace/listing-store"
import { ProductInfoPanel } from "@/features/marketplace/product-info-panel"
import { ProposeDealDialog } from "@/features/marketplace/propose-deal-dialog"
import { useOnboarding } from "@/features/onboarding/onboarding-context"

/** Same viewport-relative height on every full-height chat surface in the
 *  dashboard — the topbar offset (80px) plus the content wrapper's own
 *  top/bottom padding (12px, `pb-3`), matching the shell exactly so this
 *  panel's bottom edge lines up with the sidebar's. Only applied from `lg`
 *  up: below that the two panels stack and the page is allowed to scroll
 *  normally. */
const FULL_HEIGHT = "lg:h-[calc(100dvh-92px)]"

/**
 * A single product's own page — left is everything about it, right is the
 * one conversation this buyer has with that seller about exactly this
 * item. Contacting a seller now lands here rather than starting a
 * conversation straight from the card, so the product stays the anchor
 * for the whole exchange instead of getting lost in a generic inbox.
 *
 * Both panels sit inside one fixed-height row, each scrolling on its own —
 * the page itself never does. That's also why the "back" link lives inside
 * the info panel's own header rather than above the row: anything above
 * the row would eat into the height budget the row is sized against.
 *
 * That row layout only holds from `lg` up. Below it, the two panels stack
 * in normal page flow — and a product's info can run long enough that the
 * conversation would sit a full scroll away, which defeats the point of
 * landing a buyer here to talk to the seller. So below `lg` the
 * conversation isn't inline at all: a small dock pins to the bottom of the
 * screen instead, and tapping it morphs into the same conversation
 * full-screen — one shared `layoutId` between the collapsed dock and the
 * expanded sheet, so it reads as the same surface growing rather than one
 * view replacing another. Both ends of that morph share the same, modest
 * corner radius (never `rounded-full`) on purpose: animating toward a pill
 * shape means the radius has to race ahead of the box's own resize, which
 * is what makes a shape-morph look chaotic instead of smooth.
 */
function BuyerProductView({ listingId }: { listingId: string }) {
  const { draft } = useOnboarding()
  const buyer = buyerIdentity(draft.buyer)
  const listings = useListings()
  const listing = listings.find((entry) => entry.id === listingId && !entry.deletedAt)
  const [mobileChatOpen, setMobileChatOpen] = React.useState(false)

  const conversations = useConversations()
  const id = listing ? conversationId(buyer.id, listing.sellerId, listing.id) : null
  const conversation = conversations.find((entry) => entry.id === id) ?? null
  const deals = useDeals()
  const deal = id ? latestDealForConversation(deals, id) : null
  // Same rule the deal footer already follows — once a deal is proposed or
  // agreed, that's the one place to move it forward, not a second proposal
  // started from the composer.
  const canPropose = !!conversation && (!deal || deal.status === "declined")
  const [proposing, setProposing] = React.useState(false)

  if (!listing) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
        <PackageSearchIcon className="size-6 text-muted-foreground" />
        <p className="text-[15px] font-semibold">This listing isn&apos;t available anymore</p>
        <Link href="/buyer/dashboard/sourcing" className="text-[13px] font-medium text-amama-deep underline">
          Back to the marketplace
        </Link>
      </div>
    )
  }

  const cropLabel = cropLabels[listing.cropId] ?? listing.cropId
  const messages = conversation ? toThreadMessages(conversation.messages, "buyer") : []
  // Off the filtered list — the newest raw message may be the KAM's
  // private chase to the seller, which must not surface in the buyer's
  // dock preview.
  const lastMessage = messages[messages.length - 1] ?? null

  const conversationHeader = (
    <div>
      <p className="text-[14px] font-semibold text-foreground">{listing.sellerName}</p>
      <p className="text-[12px] text-muted-foreground">
        {cropLabel} — {listing.variety}
      </p>
    </div>
  )

  const handleSend = (text: string) => {
    if (conversation) {
      sendMessage(conversation.id, "buyer", text)
      return
    }
    startConversation({
      buyerId: buyer.id,
      buyerName: buyer.name,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      listingId: listing.id,
      listingTitle: `${cropLabel} — ${listing.variety}`,
      openingMessage: text,
    })
  }

  return (
    <div className={cn("flex flex-col gap-4 pb-20 lg:flex-row lg:overflow-hidden lg:pb-0", FULL_HEIGHT)}>
      {/* A grey "chrome" frame around the white content card, rather than a
          bordered card of its own — the header sits directly on the frame,
          plain text, the way a widget's own title bar does. */}
      <div className="flex flex-col rounded-3xl bg-muted lg:w-[380px] lg:shrink-0 lg:overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-2 p-3">
          <Link
            href="/buyer/dashboard/sourcing"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            Marketplace
          </Link>
          {/* A buyer only ever sees a positive verdict here, never
              "pending"/"flagged" — same rule the marketplace cards follow. */}
          {listing.moderationStatus === "verified" ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-amama-deep">
              <BadgeCheckIcon className="size-3" />
              Verified
            </span>
          ) : null}
        </div>
        <div className="rounded-[18px] bg-card shadow-sm [scrollbar-width:none] [-ms-overflow-style:none] lg:flex-1 lg:overflow-y-auto [&::-webkit-scrollbar]:hidden">
          <div className="p-4">
            <ProductInfoPanel listing={listing} />
          </div>
        </div>
        <DealStatusFooter
          deal={deal}
          conversation={conversation}
          listing={listing}
          role="buyer"
          myName={buyer.name}
          counterpartName={listing.sellerName}
        />
      </div>

      {/* Desktop: inline, side by side. */}
      <div
        className={cn(
          "hidden overflow-hidden rounded-3xl border border-border bg-card lg:block lg:flex-1",
          FULL_HEIGHT
        )}
      >
        <ConversationThread
          header={conversationHeader}
          messages={messages}
          onSend={handleSend}
          viewer="buyer"
          viewerName={buyer.name}
          placeholder={`Message ${listing.sellerName}…`}
          onProposeDeal={canPropose ? () => setProposing(true) : undefined}
        />
      </div>

      {/* Mobile/tablet: a collapsed dock pinned to the bottom, morphing into
          the same conversation full-screen on tap — never pushed down the
          page behind however long the product info runs. `z-20`, below the
          dashboard shell's own mobile nav drawer (`z-40`) and its backdrop
          (`z-30`) — opening the nav should cover this dock, not sit under
          it. The expanded sheet stays at `z-50`, above the drawer, since
          it's the page's own full-screen state either way. */}
      <AnimatePresence>
        {!mobileChatOpen ? (
          <motion.button
            key="dock"
            layoutId="buyer-chat-surface"
            type="button"
            onClick={() => setMobileChatOpen(true)}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-4 bottom-4 z-20 flex items-center gap-3 rounded-3xl border border-border bg-card px-4 py-3 text-start shadow-lg lg:hidden"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amama-deep text-[13px] font-semibold text-white">
              {listing.sellerName.charAt(0)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-foreground">
                {listing.sellerName}
              </span>
              <span className="block truncate text-[12px] text-muted-foreground">
                {lastMessage ? lastMessage.text : `Message ${listing.sellerName}…`}
              </span>
            </span>
            <MessageCircleIcon className="size-4 shrink-0 text-muted-foreground" />
          </motion.button>
        ) : (
          <motion.div
            key="sheet"
            layoutId="buyer-chat-surface"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-2 z-50 flex flex-col overflow-hidden rounded-3xl bg-card shadow-2xl lg:hidden"
          >
            <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-muted/40 px-4 py-3.5">
              <button
                type="button"
                onClick={() => setMobileChatOpen(false)}
                aria-label="Close conversation"
                className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
              {conversationHeader}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex-1 overflow-hidden"
            >
              <ConversationThread
                messages={messages}
                onSend={handleSend}
                viewer="buyer"
                viewerName={buyer.name}
                placeholder={`Message ${listing.sellerName}…`}
                onProposeDeal={canPropose ? () => setProposing(true) : undefined}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {conversation ? (
        <ProposeDealDialog
          open={proposing}
          onOpenChange={setProposing}
          listing={listing}
          conversation={conversation}
          role="buyer"
          myName={buyer.name}
        />
      ) : null}
    </div>
  )
}

export { BuyerProductView }
