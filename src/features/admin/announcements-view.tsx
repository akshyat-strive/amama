"use client"

import { StaffChatThread } from "@/features/admin/staff-chat-thread"
import { useKamIdentity } from "@/features/admin/kam-identity"
import { useKamRoster } from "@/features/admin/kam-roster-store"
import {
  MASTER_ADMIN_MENTION_CANDIDATE,
  STAFF_ANNOUNCEMENTS_CHANNEL_ID,
  sendStaffMessage,
  useStaffChannel,
  type StaffChatSender,
} from "@/features/admin/staff-chat-store"

/**
 * Its own page rather than a channel inside `ChatView` — a broadcast feed
 * is something you check, not a thread you pick out of an inbox, and
 * pulling it out means it doesn't get lost among DMs and conversations.
 * Only Master Admin can post; a KAM gets a read-only feed.
 */
function AnnouncementsView({ role }: { role: "kam" | "master" }) {
  const identity = useKamIdentity()
  const roster = useKamRoster()
  const messages = useStaffChannel(STAFF_ANNOUNCEMENTS_CHANNEL_ID)

  const sender: StaffChatSender =
    role === "master"
      ? { id: MASTER_ADMIN_MENTION_CANDIDATE.id, name: MASTER_ADMIN_MENTION_CANDIDATE.name, role: "master" }
      : { id: identity?.id ?? "kam", name: identity?.name ?? "KAM", role: "kam" }

  const mentionCandidates = [MASTER_ADMIN_MENTION_CANDIDATE, ...roster.map((kam) => ({ id: kam.id, name: kam.name }))]

  return (
    <div>
      <h1 className="text-[19px] font-bold tracking-tight">Announcements</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {role === "master" ? "Broadcast to every KAM." : "Read-only — Master Admin posts here."}
      </p>

      <div className="mt-6 overflow-hidden rounded-[20px] border border-border bg-card lg:h-[calc(100vh-220px)]">
        <StaffChatThread
          messages={messages}
          currentSenderId={sender.id}
          mentionCandidates={mentionCandidates}
          readOnly={role === "kam"}
          placeholder="Post an announcement…"
          onSend={(text, mentions) => sendStaffMessage(STAFF_ANNOUNCEMENTS_CHANNEL_ID, sender, text, mentions)}
          emptyState={<p className="text-[13px] text-muted-foreground">No announcements yet.</p>}
          className="h-full"
        />
      </div>
    </div>
  )
}

export { AnnouncementsView }
