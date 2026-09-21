import { ConversationDetailView } from "@/features/internal/views/conversations-view"

export default async function Page({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  return <ConversationDetailView conversationId={conversationId} />
}
