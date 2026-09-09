"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { ShieldCheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buildMessageThreads } from "@/features/dashboard/demo-data"
import { buyerIdentity, sellerIdentity } from "@/features/marketplace/identity"
import { ConversationThread, type ThreadMessage } from "@/features/marketplace/conversation-thread"
import { sendMessage, toThreadMessages, useConversations } from "@/features/marketplace/conversation-store"
import { sendToKam, useKamThread } from "@/features/marketplace/kam-thread-store"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import type { OnboardingRole } from "@/features/onboarding/types"

/** Same viewport-relative height as every other full-height chat surface
 *  in the dashboard — the topbar offset (80px) plus the content wrapper's
 *  own bottom padding (12px, `pb-3`). */
const FULL_HEIGHT = "h-[calc(100dvh-92px)]"

type UiThread = {
  id: string
  name: string
  preview: string
  isKam: boolean
  messages: ThreadMessage[]
}

/**
 * The inbox — every product conversation this account is party to, plus
 * the standing KAM channel, in one Discord/Messages-style list-and-pane
 * layout that fills the viewport rather than sitting in a bounded card.
 * A single product's own page (reached from the marketplace or the
 * catalog) narrows this same view down to one conversation; this is the
 * wide-angle version across all of them.
 */
function MessagesView({ role }: { role: OnboardingRole }) {
  const { draft } = useOnboarding()
  const person = role === "buyer" ? draft.buyer : draft.seller
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
      messages: kamMessages.map((message) => ({
        from: message.from === "you" ? "me" : "them",
        text: message.text,
      })),
    }
    const real: UiThread[] = myConversations.map((conversation) => {
      const otherName = role === "buyer" ? conversation.sellerName : conversation.buyerName
      const last = conversation.messages[conversation.messages.length - 1]
      return {
        id: conversation.id,
        name: otherName,
        preview: last ? `${conversation.listingTitle} · ${last.text}` : conversation.listingTitle,
        isKam: false,
        messages: toThreadMessages(conversation.messages, role),
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

  const handleSend = (text: string) => {
    if (!active) return
    if (active.isKam) {
      sendToKam(identity.id, role, text)
    } else {
      sendMessage(active.id, role === "buyer" ? "buyer" : "seller", text)
    }
  }

  return (
    <div className={cn("overflow-hidden rounded-3xl border border-border bg-card", FULL_HEIGHT)}>
      <div className="grid h-full grid-cols-1 sm:grid-cols-[280px_minmax(0,1fr)]">
        <div className="flex h-full flex-col border-border sm:border-e">
          <div className="shrink-0 border-b border-border px-5 py-4">
            <h1 className="text-[17px] font-bold tracking-tight">Messages</h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {person.fullName.trim() || "Your account"}
            </p>
          </div>
          <ul className="flex-1 divide-y divide-border overflow-y-auto">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(thread.id)}
                  aria-current={thread.id === active?.id ? "true" : undefined}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-4 py-3.5 text-start transition-colors",
                    thread.id === active?.id ? "bg-amama-subtle/50" : "hover:bg-muted/50"
                  )}
                >
                  {thread.isKam ? (
                    <span
                      aria-hidden
                      className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-amama-subtle text-amama-deep"
                    >
                      <ShieldCheckIcon className="size-4" />
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[12px] font-semibold text-foreground/70"
                    >
                      {thread.name.charAt(0)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-foreground">
                      {thread.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                      {thread.preview}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <ConversationThread
          header={
            active ? (
              <div className="flex items-center gap-2.5">
                {active.isKam ? (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amama-subtle text-amama-deep">
                    <ShieldCheckIcon className="size-3.5" />
                  </span>
                ) : null}
                <p className="text-[14px] font-semibold text-foreground">{active.name}</p>
              </div>
            ) : null
          }
          messages={active?.messages ?? null}
          onSend={handleSend}
        />
      </div>
    </div>
  )
}

export { MessagesView }
