import { TermSheetDetailView } from "@/features/internal/views/term-sheets-view"

export default async function Page({
  params,
}: {
  params: Promise<{ termSheetId: string }>
}) {
  const { termSheetId } = await params
  return <TermSheetDetailView termSheetId={termSheetId} />
}
