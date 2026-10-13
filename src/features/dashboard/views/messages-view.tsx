"use client"

import * as React from "react"
import { HandshakeIcon, ShieldCheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ChatAvatar, ChatLayout, ChatListRow, useChatSelection } from "@/features/chat/chat-layout"
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

type UiThread = {
  id: string
  name: string
  preview: string
  isKam: boolean
  messages: ThreadMessage[]
}

/**
 * The inbox — every product conversation this account is party to, plus
 * the standing KAM channel — on the shared `ChatLayout`: the list beside
 * an empty placeholder, and the message window as a third card once a
 * conversation is open (one column with drill-down on a phone).
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
  return <div className="h-[calc(100dvh-92px)] w-full animate-pulse rounded-[20px] bg-card md:w-[380px]" />
}

function MessagesViewInner({ role }: { role: OnboardingRole }) {
  const { draft } = useOnboarding()
  const identity = role === "buyer" ? buyerIdentity(draft.buyer) : sellerIdentity(draft.seller)

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

  const { selectedId, select, clear } = useChatSelection()
  const active = threads.find((thread) => thread.id === selectedId) ?? null

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

  return (
    <>
      <ChatLayout
        open={!!active}
        onClose={clear}
        emptyDescription="Your conversations with sellers, buyers and your account manager open here."
        list={threads.map((thread) => (
          <ChatListRow
            key={thread.id}
            active={thread.id === active?.id}
            onClick={() => select(thread.id)}
            title={thread.name}
            preview={thread.preview}
            avatar={<ChatAvatar label={thread.name} icon={thread.isKam ? ShieldCheckIcon : undefined} active={thread.id === active?.id} tone={thread.isKam ? "olive" : "graphite"} />}
          />
        ))}
        windowHeader={
          active ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <ChatAvatar label={active.name} icon={active.isKam ? ShieldCheckIcon : undefined} tone={active.isKam ? "olive" : "graphite"} />
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-semibold">{active.name}</p>
                <p className="truncate text-[12px] text-muted-foreground">
                  {active.isKam ? "Your account manager" : activeConversation?.listingTitle}
                </p>
              </div>
            </div>
          ) : null
        }
        windowActions={
          canPropose ? (
            <Button size="sm" variant="secondary" onClick={() => setProposing(true)}>
              <HandshakeIcon />
              Propose deal
            </Button>
          ) : null
        }
        windowBody={
          active ? (
            <ConversationThread
              messages={active.messages}
              onSend={handleSend}
              viewer={role}
              viewerName={identity.name}
              conversationId={!active.isKam ? active.id : undefined}
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
              className="min-h-0 flex-1"
            />
          ) : null
        }
      />

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
    </>
  )
}

export { MessagesView }
