"use client"

import * as React from "react"
import { MegaphoneIcon, MessagesSquareIcon, UsersIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useKamIdentity } from "@/features/admin/kam-identity"
import { useKamRoster } from "@/features/admin/kam-roster-store"
import { StaffChatThread } from "@/features/admin/staff-chat-thread"
import {
  MASTER_ADMIN_MENTION_CANDIDATE,
  STAFF_ANNOUNCEMENTS_CHANNEL_ID,
  STAFF_GROUP_CHANNEL_ID,
  sendStaffMessage,
  staffDmChannelId,
  useStaffChannel,
  type StaffChatSender,
} from "@/features/admin/staff-chat-store"

type Channel = {
  id: string
  label: string
  description: string
  icon: LucideIcon
  readOnly: boolean
}

/**
 * Role-parametrized like `AdminShell` itself — a KAM gets 3 fixed rows (a
 * DM with Master Admin, the shared Team group, read-only Announcements); Master
 * Admin gets Team + Announcements (their composer, since they're the only
 * broadcaster) plus one DM row per roster KAM. Every "channel kind" is really
 * just a `channelId` convention in one flat store (see `staff-chat-store.ts`);
 * the composer's read-only state is the only thing that differs by role.
 */
function StaffChatView({ role }: { role: "kam" | "master" }) {
  const identity = useKamIdentity()
  const roster = useKamRoster()
  const [selectedChannelId, setSelectedChannelId] = React.useState<string | null>(null)

  const sender: StaffChatSender =
    role === "master"
      ? { id: MASTER_ADMIN_MENTION_CANDIDATE.id, name: MASTER_ADMIN_MENTION_CANDIDATE.name, role: "master" }
      : { id: identity?.id ?? "kam", name: identity?.name ?? "KAM", role: "kam" }

  const channels: Channel[] =
    role === "kam"
      ? [
          {
            id: staffDmChannelId(sender.id),
            label: "Master Admin",
            description: "Direct message",
            icon: MessagesSquareIcon,
            readOnly: false,
          },
          { id: STAFF_GROUP_CHANNEL_ID, label: "Team", description: "Every KAM", icon: UsersIcon, readOnly: false },
          {
            id: STAFF_ANNOUNCEMENTS_CHANNEL_ID,
            label: "Announcements",
            description: "Read-only",
            icon: MegaphoneIcon,
            readOnly: true,
          },
        ]
      : [
          { id: STAFF_GROUP_CHANNEL_ID, label: "Team", description: "Every KAM", icon: UsersIcon, readOnly: false },
          {
            id: STAFF_ANNOUNCEMENTS_CHANNEL_ID,
            label: "Announcements",
            description: "Broadcast to every KAM",
            icon: MegaphoneIcon,
            readOnly: false,
          },
          ...roster.map((kam) => ({
            id: staffDmChannelId(kam.id),
            label: kam.name,
            description: "Direct message",
            icon: MessagesSquareIcon,
            readOnly: false,
          })),
        ]

  const selected = channels.find((channel) => channel.id === selectedChannelId) ?? channels[0]
  const messages = useStaffChannel(selected.id)
  const mentionCandidates = React.useMemo(
    () => [MASTER_ADMIN_MENTION_CANDIDATE, ...roster.map((kam) => ({ id: kam.id, name: kam.name }))],
    [roster]
  )

  return (
    <div>
      <h1 className="text-[19px] font-bold tracking-tight">Team chat</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Direct messages, the shared Team channel, and announcements — all in one place.
      </p>

      <div className="mt-6 grid gap-4 overflow-hidden rounded-3xl border border-border bg-card lg:grid-cols-[260px_1fr] lg:h-[calc(100vh-260px)]">
        <ul className="flex flex-col gap-1 overflow-y-auto border-b border-border p-2 lg:border-b-0 lg:border-e">
          {channels.map((channel) => {
            const active = channel.id === selected.id
            const Icon = channel.icon
            return (
              <li key={channel.id}>
                <button
                  type="button"
                  onClick={() => setSelectedChannelId(channel.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition-colors",
                    active ? "bg-amama-deep text-white" : "text-foreground hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full",
                      active ? "bg-white/15" : "bg-muted"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{channel.label}</span>
                    <span className={cn("block truncate text-[11px]", active ? "text-white/70" : "text-muted-foreground")}>
                      {channel.description}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <StaffChatThread
          header={
            <div>
              <p className="text-[14px] font-semibold text-foreground">{selected.label}</p>
              <p className="text-[12px] text-muted-foreground">{selected.description}</p>
            </div>
          }
          messages={messages}
          currentSenderId={sender.id}
          mentionCandidates={mentionCandidates}
          readOnly={selected.readOnly}
          placeholder={`Message ${selected.label}…`}
          onSend={(text, mentions) => sendStaffMessage(selected.id, sender, text, mentions)}
          emptyState={
            <p className="text-[13px] text-muted-foreground">
              {selected.readOnly ? "No announcements yet." : "No messages yet — say hello."}
            </p>
          }
          className="min-h-[420px] lg:min-h-0"
        />
      </div>
    </div>
  )
}

export { StaffChatView }
