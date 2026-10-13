"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { LifeBuoyIcon, PlusIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { findAccount, useSession } from "@/features/auth/local-auth"
import { raiseTicket } from "@/features/tickets/ticket-store"

const LABELS: Record<string, string> = {
  sourcing: "Marketplace",
  rfqs: "RFQs",
  "trade-desk": "Trades",
  kyc: "KYC",
  verification: "Verification",
  tickets: "Tickets",
}

const titleCase = (text: string) => LABELS[text] ?? text.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
const singular = (text: string) => (text.endsWith("ies") ? `${text.slice(0, -3)}y` : text.endsWith("s") ? text.slice(0, -1) : text)

/** What page this is and which records it's about, read off the URL —
 *  `/seller/dashboard/trades/TRD-0042` → "Trades", `{ trade: "TRD-0042" }`. */
function describePage(pathname: string, searchParams: URLSearchParams) {
  const segments = pathname.split("/").filter(Boolean)
  const base = segments.findIndex((segment) => segment === "dashboard" || segment === "internal")
  const rest = base >= 0 ? segments.slice(base + 1) : segments
  const refs: Record<string, string> = {}
  for (let index = 0; index + 1 < rest.length; index += 2) refs[singular(rest[index])] = decodeURIComponent(rest[index + 1])
  for (const key of ["conversation", "trade", "order", "status"]) {
    const value = searchParams.get(key)
    if (value) refs[key] = value
  }
  const pageTitle = rest.length > 0 ? titleCase(rest[0]) : "Home"
  return { pageTitle, refs }
}

/**
 * The small "raise a ticket" button every page's topbar carries. It opens
 * with the page already filled in — where you are, which record, your
 * role — as tags and metadata, so the person who picks it up doesn't have
 * to ask.
 */
function RaiseTicketButton({ role }: { role: "buyer" | "seller" | "admin" }) {
  return (
    <React.Suspense fallback={null}>
      <RaiseTicketInner role={role} />
    </React.Suspense>
  )
}

function RaiseTicketInner({ role }: { role: "buyer" | "seller" | "admin" }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const session = useSession()
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [tags, setTags] = React.useState<string[]>([])
  const [customTag, setCustomTag] = React.useState("")

  const page = describePage(pathname, new URLSearchParams(searchParams.toString()))
  const roleTag = role === "admin" ? "Internal" : role === "buyer" ? "Buyer" : "Seller"

  const start = () => {
    setTitle("")
    setDescription("")
    setTags([page.pageTitle, roleTag])
    setCustomTag("")
    setOpen(true)
  }

  const submit = () => {
    if (!session || !title.trim()) return
    const account = findAccount(session.accountId)
    const ticket = raiseTicket({
      kind: "support",
      title: title.trim(),
      description: description.trim(),
      tags,
      metadata: { page: pathname, pageTitle: page.pageTitle, refs: page.refs },
      raisedBy: { id: session.accountId, name: account?.name ?? session.accountId, kind: session.kind },
    })
    setOpen(false)
    const href = role === "admin" ? "/internal/tickets?type=requests" : `/${role}/dashboard/tickets`
    toast.success(`${ticket.id} raised`, { action: { label: "View", onClick: () => router.push(href) } })
  }

  const addTag = () => {
    const tag = customTag.trim()
    if (tag && !tags.includes(tag)) setTags([...tags, tag])
    setCustomTag("")
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={start}
              aria-label="Raise a ticket"
              className="grid size-9 shrink-0 place-items-center rounded-full text-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
            >
              <LifeBuoyIcon className="size-[18px]" />
            </button>
          }
        />
        <TooltipContent side="bottom">Raise a ticket</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise a ticket</DialogTitle>
            <DialogDescription>From {page.pageTitle}. The team sees which page and record it&apos;s about.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">
              What&apos;s wrong, in a line
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The ETA here doesn't match the carrier" autoFocus />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">
              Details <span className="sr-only">(optional)</span>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Anything that helps — what you expected, what you saw."
                className="rounded-xl border-input bg-background"
              />
            </label>

            <div>
              <p className="text-[13px] font-medium">Tags</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex h-7 items-center gap-0.5 rounded-full bg-amama-subtle ps-2.5 pe-1 text-[12.5px] font-medium text-amama-deep">
                    {tag}
                    <button type="button" aria-label={`Remove ${tag}`} onClick={() => setTags(tags.filter((entry) => entry !== tag))} className="grid size-5 place-items-center rounded-full hover:bg-amama-deep/10">
                      <XIcon className="size-3" />
                    </button>
                  </span>
                ))}
                <form
                  className="flex items-center gap-1"
                  onSubmit={(event) => {
                    event.preventDefault()
                    addTag()
                  }}
                >
                  <input
                    value={customTag}
                    onChange={(event) => setCustomTag(event.target.value)}
                    placeholder="Add tag"
                    aria-label="Add a tag"
                    className="h-7 w-24 rounded-full border border-input bg-background px-2.5 text-[12.5px] outline-none focus:border-amama-deep"
                  />
                  <button type="submit" aria-label="Add tag" className={cn("grid size-7 place-items-center rounded-full border border-input text-muted-foreground hover:text-foreground", !customTag.trim() && "opacity-40")}>
                    <PlusIcon className="size-3.5" />
                  </button>
                </form>
              </div>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-2xl bg-card px-4 py-3 text-[12.5px]">
              <dt className="text-muted-foreground">Page</dt>
              <dd className="truncate font-mono">{pathname}</dd>
              {Object.entries(page.refs).map(([key, value]) => (
                <React.Fragment key={key}>
                  <dt className="text-muted-foreground capitalize">{key}</dt>
                  <dd className="truncate">{value}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!title.trim()}>
              Raise ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export { RaiseTicketButton }
