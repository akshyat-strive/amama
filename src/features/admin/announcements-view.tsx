"use client"

import { StaffChatThread } from "@/features/admin/staff-chat-thread"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { useUsers } from "@/features/admin/user-store"
import {
  STAFF_ANNOUNCEMENTS_CHANNEL_ID,
  sendStaffMessage,
  useStaffChannel,
  type StaffChatSender,
} from "@/features/admin/staff-chat-store"

/**
 * Its own page rather than a channel inside `ChatView` — a broadcast feed
 * is something you check, not a thread you pick out of an inbox, and
 * pulling it out means it doesn't get lost among DMs and conversations.
 * Posting is gated behind `announcements.post`; anyone else gets a
 * read-only feed.
 */
function AnnouncementsView() {
  const admin = useCurrentAdmin()
  const users = useUsers()
  const messages = useStaffChannel(STAFF_ANNOUNCEMENTS_CHANNEL_ID)
  if (!admin) return null

  const sender: StaffChatSender = { id: admin.user.id, name: admin.user.name, role: admin.role.name }
  const canPost = admin.can("announcements.post")
  const mentionCandidates = users.map((user) => ({ id: user.id, name: user.name }))

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Announcements</h1>

      <div className="mt-6 overflow-hidden rounded-[20px] border border-border bg-card lg:h-[calc(100vh-220px)]">
        <StaffChatThread
          messages={messages}
          currentSenderId={sender.id}
          mentionCandidates={mentionCandidates}
          readOnly={!canPost}
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
