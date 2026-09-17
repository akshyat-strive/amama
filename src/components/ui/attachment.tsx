import * as React from "react"
import { FileIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A file reference shown as a small card — thumbnail, name, a type · size
 * caption — the same anatomy shadcn's own Attachment component uses
 * (ui.shadcn.com/docs/components/base/attachment), scaled down to sit
 * inline in a list row rather than a message composer's own strip, and
 * without any of the upload-progress states that component supports —
 * a document here is always already finished uploading by the time
 * anyone's reviewing it.
 */
function Attachment({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment"
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border border-border bg-card p-1.5 pe-3 text-start transition-colors",
        className
      )}
      {...props}
    />
  )
}

/** The thumbnail slot — an image crop when there's actually image content
 *  to show, a plain file glyph otherwise (a PDF, or a document whose
 *  content was never captured — see `PREVIEW_CAP_BYTES`). */
function AttachmentMedia({
  src,
  alt,
  className,
}: {
  src?: string
  alt: string
  className?: string
}) {
  return (
    <span
      data-slot="attachment-media"
      className={cn(
        "grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground",
        className
      )}
    >
      {src ? (
        // A local/base64 preview, not a remote asset — skips next/image's
        // optimizer entirely rather than fighting its remote-source
        // assumptions, same call `document-upload-card.tsx` makes.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <FileIcon className="size-4" />
      )}
    </span>
  )
}

function AttachmentContent({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="attachment-content"
      className={cn("flex min-w-0 flex-col items-start", className)}
      {...props}
    />
  )
}

function AttachmentTitle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="attachment-title"
      className={cn("max-w-[11rem] truncate text-[12px] font-medium text-foreground", className)}
      {...props}
    />
  )
}

function AttachmentDescription({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="attachment-description"
      className={cn("truncate text-[11px] text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Attachment, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentDescription }
