"use client"

import * as React from "react"
import { MessageCircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { ConversationThread } from "@/features/marketplace/conversation-thread"
import { useConversations } from "@/features/marketplace/conversation-store"

const FULL_HEIGHT = "h-[calc(100dvh-92px)]"

/**
 * Read-only, on purpose — a KAM can see every product conversation to step
 * in if something looks wrong, but this isn't another inbox to reply from.
 * Same shell as the buyer/seller Messages tab (`ConversationThread`
 * full-height, list on the left) so it reads as the same product.
 */
function ConversationsView() {
  const conversations = useConversations()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const active = conversations.find((entry) => entry.id === selectedId) ?? conversations[0]

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-5 py-16 text-center">
        <MessageCircleIcon aria-hidden className="size-6 text-muted-foreground" />
        <p className="text-[15px] font-semibold">No conversations yet</p>
        <p className="max-w-sm text-[13px] text-muted-foreground">
          Every buyer/seller thread about a product shows up here.
        </p>
      </div>
    )
  }

  const messages = active
    ? active.messages.map((message) => ({
        from: message.from === "system" ? ("system" as const) : ("them" as const),
        text: message.from === "system" ? message.text : `${message.from === "buyer" ? active.buyerName : active.sellerName}: ${message.text}`,
        diff: message.diff,
      }))
    : null

  return (
    <div className={cn("overflow-hidden rounded-3xl border border-border bg-card", FULL_HEIGHT)}>
      <div className="grid h-full grid-cols-1 sm:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex h-full flex-col border-border sm:border-e">
          <div className="shrink-0 border-b border-border px-5 py-4">
            <h1 className="text-[15px] font-bold tracking-tight">Conversations</h1>
          </div>
          <ul className="flex-1 divide-y divide-border overflow-y-auto">
            {conversations.map((conversation) => {
              const last = conversation.messages[conversation.messages.length - 1]
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    aria-current={conversation.id === active?.id ? "true" : undefined}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 px-4 py-3.5 text-start transition-colors",
                      conversation.id === active?.id ? "bg-amama-subtle/50" : "hover:bg-muted/50"
                    )}
                  >
                    <span className="text-[13px] font-semibold text-foreground">
                      {conversation.buyerName} → {conversation.sellerName}
                    </span>
                    <span className="text-[12px] font-medium text-muted-foreground">
                      {conversation.listingTitle}
                    </span>
                    {last ? (
                      <span className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">
                        {last.text}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <ConversationThread
          header={
            active ? (
              <div>
                <p className="text-[14px] font-semibold text-foreground">
                  {active.buyerName} → {active.sellerName}
                </p>
                <p className="text-[12px] text-muted-foreground">{active.listingTitle}</p>
              </div>
            ) : null
          }
          messages={messages}
          onSend={() => {}}
          readOnly
        />
      </div>
    </div>
  )
}

export { ConversationsView }
