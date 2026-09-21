"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { ChevronLeftIcon, MessageCircleIcon, ShieldCheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buildMessageThreads } from "@/features/dashboard/demo-data"
import { buyerIdentity, sellerIdentity } from "@/features/marketplace/identity"
import { ConversationThread, type ThreadMessage } from "@/features/marketplace/conversation-thread"
import { sendMessage, toThreadMessages, useConversations } from "@/features/marketplace/conversation-store"
import { latestDealForConversation, useDeals } from "@/features/marketplace/deal-store"
import { sendToKam, useKamThread } from "@/features/marketplace/kam-thread-store"
import { useListings } from "@/features/marketplace/listing-store"
import { ProposeDealDialog } from "@/features/marketplace/propose-deal-dialog"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import type { OnboardingRole } from "@/features/onboarding/types"

/** Same viewport-relative height as the admin console's own chat page —
 *  the topbar offset (80px) + the heading (42px) + its own margin (24px)
 *  + the content wrapper's bottom padding (12px) = 158px. */
const FULL_HEIGHT = "h-[calc(100dvh-158px)]"

/** Same bright-green "currently selected" treatment the sidebar and the
 *  admin console's own rows use — a selected thread should read as the
 *  same move everywhere in the app, not a lighter one-off tint just
 *  because this list happens to live on the buyer/seller side. */
const SELECTED_CLASS = "bg-amama text-amama-foreground border border-amama-foreground"

type UiThread = {
  id: string
  name: string
  preview: string
  isKam: boolean
  messages: ThreadMessage[]
}

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?"
}

/**
 * The inbox — every product conversation this account is party to, plus
 * the standing KAM channel — laid out the same way the admin console's
 * own Chat page is: a list card and a thread card, each in their own
 * bordered wrapper, with the same bold selected-row highlight and a
 * mobile master-detail split (list, or the open thread with a way back,
 * never both stacked). A single product's own page (reached from the
 * marketplace or the catalog) narrows this same view down to one
 * conversation; this is the wide-angle version across all of them.
 */
function MessagesView({ role }: { role: OnboardingRole }) {
  // `useSearchParams` opts a route out of static rendering unless it sits
  // under a boundary — same reasoning as `ContractsView`'s own split.
  return (
    <React.Suspense fallback={<MessagesSkeleton />}>
      <MessagesViewInner role={role} />
    </React.Suspense>
  )
}

function MessagesSkeleton() {
  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Messages</h1>
      <div className="mt-6 h-40 animate-pulse rounded-3xl bg-muted" />
    </div>
  )
}

function MessagesViewInner({ role }: { role: OnboardingRole }) {
  const { draft } = useOnboarding()
  const identity = role === "buyer" ? buyerIdentity(draft.buyer) : sellerIdentity(draft.seller)
  const searchParams = useSearchParams()

  const kamThreadMeta = React.useMemo(() => buildMessageThreads(role)[0], [role])
  const kamMessages = useKamThread(identity.id, role)

  const conversations = useConversations()
  const myConversations = React.useMemo(
    () =>
      conversations.filter((conversation) =>
        role === "buyer"
          ? conversation.buyerId === identity.id
          : conversation.sellerId === identity.id
      ),
    [conversations, identity.id, role]
  )

  const threads: UiThread[] = React.useMemo(() => {
    const kam: UiThread = {
      id: "kam",
      name: kamThreadMeta.name,
      preview: kamThreadMeta.preview,
      isKam: true,
      // "kam", not "them" — the same shield-icon treatment a KAM's own
      // interjections get inside a product conversation, so the one
      // channel that's *entirely* the account manager doesn't read as a
      // plainer, uncredited "them" than the messages they send elsewhere.
      messages: kamMessages.map((message) => ({
        from: message.from === "you" ? "me" : "kam",
        text: message.text,
      })),
    }
    const real: UiThread[] = myConversations.map((conversation) => {
      const otherName = role === "buyer" ? conversation.sellerName : conversation.buyerName
      // The preview has to come off the *filtered* list, not the raw one:
      // the newest message in a thread is often the KAM's private chase to
      // the other side, and reading it straight would leak into this
      // side's inbox the very thing the thread itself hides.
      const messages = toThreadMessages(conversation.messages, role)
      const last = messages[messages.length - 1]
      return {
        id: conversation.id,
        name: otherName,
        preview: last ? `${conversation.listingTitle} · ${last.text}` : conversation.listingTitle,
        isKam: false,
        messages,
      }
    })
    return [kam, ...real]
  }, [kamThreadMeta, kamMessages, myConversations, role])

  const requestedId = searchParams.get("conversation")
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const effectiveId =
    selectedId ?? (requestedId && threads.some((thread) => thread.id === requestedId)
      ? requestedId
      : threads[0]?.id)
  const active = threads.find((thread) => thread.id === effectiveId) ?? threads[0]
  // Whether a thread has actually been *picked* — separate from `active`
  // above (which always falls back to the first thread so desktop, which
  // shows both panes at once, never sits on an empty pane) because this,
  // not the fallback, is what decides which pane shows on mobile. Falling
  // back to the first thread for that too would open one the moment the
  // page loads, defeating the point of splitting the two panes.
  const threadOpenOnMobile = selectedId !== null && threads.some((thread) => thread.id === selectedId)

  const handleSend = (text: string) => {
    if (!active) return
    if (active.isKam) {
      sendToKam(identity.id, role, text)
    } else {
      sendMessage(active.id, role === "buyer" ? "buyer" : "seller", text)
    }
  }

  // The "+" menu's Proposal option needs the raw conversation (for the
  // buyer/seller ids the deal is logged under) and the listing it's
  // actually about — neither of which the KAM channel has, so it simply
  // doesn't get the option.
  const activeConversation = myConversations.find((conversation) => conversation.id === active?.id) ?? null
  const listings = useListings()
  const activeListing = activeConversation
    ? listings.find((listing) => listing.id === activeConversation.listingId) ?? null
    : null
  const deals = useDeals()
  const activeDeal = activeConversation ? latestDealForConversation(deals, activeConversation.id) : null
  // Same rule the product page's own deal footer follows — once a deal is
  // proposed or agreed, that's the one place to move it forward, not a
  // second proposal started from the inbox.
  const canPropose = !!activeListing && (!activeDeal || activeDeal.status === "declined")
  const [proposing, setProposing] = React.useState(false)

  const backButton = (
    <button
      type="button"
      onClick={() => setSelectedId(null)}
      aria-label="Back to message list"
      className="mr-1 -ml-1.5 grid size-8 shrink-0 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-muted lg:hidden"
    >
      <ChevronLeftIcon className="size-5 rtl:-scale-x-100" />
    </button>
  )

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Messages</h1>

      {/* Two genuinely separate cards, not one box split by an internal
          divider — on mobile only one of them is ever on screen at a time
          (the list, or the open thread with a way back), which a single
          shared box can't do cleanly. */}
      <div className={cn("mt-6 flex flex-col gap-4 lg:flex-row", FULL_HEIGHT)}>
        <div
          className={cn(
            "flex flex-col gap-1 overflow-y-auto rounded-[20px] border border-border bg-muted p-2 lg:flex lg:h-full lg:w-[300px] lg:shrink-0",
            threadOpenOnMobile && "hidden"
          )}
        >
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setSelectedId(thread.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-[14px] border px-3 py-2.5 text-start transition-colors",
                thread.id === active?.id ? SELECTED_CLASS : "border-transparent text-foreground hover:bg-card"
              )}
            >
              {thread.isKam ? (
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full",
                    thread.id === active?.id ? "bg-white/50" : "bg-amama-subtle text-amama-deep"
                  )}
                >
                  <ShieldCheckIcon className="size-4" />
                </span>
              ) : (
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full",
                    thread.id === active?.id ? "bg-white/50" : "bg-amama-deep text-[12px] font-semibold text-white"
                  )}
                >
                  {thread.id === active?.id ? <MessageCircleIcon className="size-4" /> : initial(thread.name)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{thread.name}</span>
                <span
                  className={cn(
                    "block truncate text-[12px]",
                    thread.id === active?.id ? "text-amama-foreground/70" : "text-muted-foreground"
                  )}
                >
                  {thread.preview}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div
          className={cn(
            "flex-1 overflow-hidden rounded-[20px] border border-border lg:flex lg:h-full",
            !threadOpenOnMobile && "hidden lg:flex"
          )}
        >
          <ConversationThread
            header={
              active ? (
                <div className="flex items-center">
                  {backButton}
                  {active.isKam ? (
                    <span className="mr-2.5 grid size-7 shrink-0 place-items-center rounded-full bg-amama-subtle text-amama-deep">
                      <ShieldCheckIcon className="size-3.5" />
                    </span>
                  ) : null}
                  <p className="truncate text-[14px] font-semibold text-foreground">{active.name}</p>
                </div>
              ) : null
            }
            messages={active?.messages ?? null}
            onSend={handleSend}
            viewer={role}
            viewerName={identity.name}
            conversationId={active && !active.isKam ? active.id : undefined}
            composerParties={
              activeConversation
                ? [
                    {
                      party: role === "buyer" ? "seller" : "buyer",
                      name: role === "buyer" ? activeConversation.sellerName : activeConversation.buyerName,
                    },
                  ]
                : []
            }
            onProposeDeal={canPropose ? () => setProposing(true) : undefined}
            className="min-h-[420px] flex-1 bg-card lg:min-h-0"
          />
        </div>
      </div>

      {activeListing && activeConversation ? (
        <ProposeDealDialog
          open={proposing}
          onOpenChange={setProposing}
          listing={activeListing}
          conversation={activeConversation}
          role={role}
          myName={identity.name}
        />
      ) : null}
    </div>
  )
}

export { MessagesView }
