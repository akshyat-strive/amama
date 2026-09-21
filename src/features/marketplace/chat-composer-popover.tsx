"use client"

import * as React from "react"
import { HandshakeIcon, PlusIcon, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ChatParty } from "@/features/marketplace/conversation-store"
import { createFormRequest, FORM_TEMPLATES, type FormTemplateId } from "@/features/marketplace/form-request-store"

type ComposerParty = { party: ChatParty; name: string }

/**
 * The chat composer's own "+" — a grid of illustrated tiles (one per form
 * template, plus "Proposal" where that's available) rather than a plain
 * dropdown list, because these are things you *send*, not settings you
 * *choose*: a picker you can recognize by shape reads faster than a list
 * of words. Any party can open this and send to any other — the KAM-only
 * gate that used to sit around "ask for details" lived in
 * `ContractAuthoring`, not here.
 */
function ChatComposerPopover({
  conversationId,
  viewer,
  viewerName,
  parties,
  onProposeDeal,
}: {
  conversationId: string
  viewer: ChatParty
  viewerName: string
  /** Who a form from here can target. A buyer/seller viewer gets exactly
   *  one fixed counterpart; a KAM viewer (who can address either side of
   *  a thread they're overseeing) gets both and picks per-send — that
   *  send also gets `visibleTo` sandboxing so the other side never sees
   *  it, same convention as a contract term-sheet request. */
  parties: ComposerParty[]
  /** Only meaningful where the caller has a listing to propose terms
   *  against — folded into the same grid as one more tile when present. */
  onProposeDeal?: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [composingId, setComposingId] = React.useState<FormTemplateId | null>(null)
  const template = FORM_TEMPLATES.find((entry) => entry.id === composingId) ?? null

  if (parties.length === 0 && !onProposeDeal) return null

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label="Add to message"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-foreground/70 transition-colors hover:bg-muted"
        >
          <PlusIcon className="size-4" />
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-[264px] p-3">
          {/* Categorised rather than one flat grid — a non-technical
              reader scans "what kind of thing is this" before "which
              specific one", so the picker groups by that first. */}
          {onProposeDeal ? (
            <div className={parties.length > 0 ? "pb-3" : undefined}>
              <p className="px-1 pb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Commercial
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <TemplateTile
                  icon={HandshakeIcon}
                  label="Proposal"
                  onClick={() => {
                    setOpen(false)
                    onProposeDeal()
                  }}
                />
              </div>
            </div>
          ) : null}
          {parties.length > 0 ? (
            <div>
              <p className="px-1 pb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Ask for information
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {FORM_TEMPLATES.map((entry) => (
                  <TemplateTile
                    key={entry.id}
                    icon={entry.icon}
                    label={entry.label}
                    onClick={() => {
                      setOpen(false)
                      setComposingId(entry.id)
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>

      {template ? (
        <ComposeDialog
          template={template}
          conversationId={conversationId}
          viewer={viewer}
          viewerName={viewerName}
          parties={parties}
          onOpenChange={(next) => {
            if (!next) setComposingId(null)
          }}
        />
      ) : null}
    </>
  )
}

function TemplateTile({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-2xl p-2 text-center transition-colors hover:bg-muted"
    >
      <span className="grid size-11 place-items-center rounded-2xl bg-muted text-foreground">
        <Icon className="size-5" strokeWidth={2} />
      </span>
      <span className="text-[10.5px] leading-tight font-medium text-foreground">{label}</span>
    </button>
  )
}

/** What the sender fills in before sending: a title (for "Custom
 *  question", this doubles as the actual question text), an optional
 *  note, and — only when addressing either side of a thread is possible
 *  (a KAM) — who it's for. The receiving party fills in the rest once it
 *  lands as a card. */
function ComposeDialog({
  template,
  conversationId,
  viewer,
  viewerName,
  parties,
  onOpenChange,
}: {
  template: (typeof FORM_TEMPLATES)[number]
  conversationId: string
  viewer: ChatParty
  viewerName: string
  parties: ComposerParty[]
  onOpenChange: (open: boolean) => void
}) {
  const isCustom = template.id === "custom"
  const [title, setTitle] = React.useState(isCustom ? "" : template.title)
  const [note, setNote] = React.useState("")
  const [targetParty, setTargetParty] = React.useState<ChatParty>(parties[0]?.party ?? "buyer")

  const target = parties.find((entry) => entry.party === targetParty) ?? parties[0] ?? null
  const needsPicker = parties.length > 1

  const send = () => {
    if (!title.trim() || !target) return
    createFormRequest({
      conversationId,
      templateId: template.id,
      title: isCustom ? "Quick question" : title.trim(),
      note: note.trim() || null,
      createdBy: viewer,
      createdByName: viewerName,
      targetParty: target.party,
      targetName: target.name,
      fields: isCustom ? [{ ...template.fields[0], label: title.trim() }] : template.fields,
      documents: template.documents,
      visibleTo: viewer === "kam" ? [target.party, "kam"] : undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send &ldquo;{template.label}&rdquo;</DialogTitle>
          <DialogDescription>
            {target
              ? `${target.name} gets a card in the thread and fills this in when ready.`
              : "Choose who this goes to."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {needsPicker ? (
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
              Ask
              <Select value={targetParty} onValueChange={(value) => value && setTargetParty(value as ChatParty)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {parties.map((entry) => (
                    <SelectItem key={entry.party} value={entry.party}>
                      {entry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          ) : null}

          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            {isCustom ? "Your question" : "Title"}
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={isCustom ? "e.g. What's the exact packaging spec?" : undefined}
              autoFocus
            />
          </label>

          {isCustom ? null : (
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
              Note (optional)
              <Textarea
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Anything that helps them fill this in correctly…"
              />
            </label>
          )}

          {!isCustom && (template.fields.length > 0 || template.documents.length > 0) ? (
            <div className="rounded-2xl bg-muted p-3 text-[12px] text-muted-foreground">
              {template.fields.length > 0 ? (
                <p>
                  {template.fields.length} {template.fields.length === 1 ? "question" : "questions"}:{" "}
                  {template.fields.map((field) => field.label).join(", ")}
                </p>
              ) : null}
              {template.documents.length > 0 ? (
                <p className={template.fields.length > 0 ? "mt-1" : undefined}>
                  {template.documents.length} {template.documents.length === 1 ? "document" : "documents"}:{" "}
                  {template.documents.map((document) => document.label).join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button disabled={!title.trim() || !target} onClick={send}>
            Send{target ? ` to ${target.name}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { ChatComposerPopover }
export type { ComposerParty }
