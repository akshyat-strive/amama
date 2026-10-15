import * as React from "react"

import { cn } from "@/lib/utils"

/** Warning is a small amber mark beside dark text on a neutral surface —
 *  never amber text on an amber tint, which is what read poorly. When amber
 *  has to be text on white it takes this darker shade (about 5.9:1). */
const AMBER_TEXT = "text-[#a35200] dark:text-status-warning"

function AmberDot({ className }: { className?: string }) {
  return <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full bg-status-warning", className)} />
}

/** A status chip that needs attention: neutral fill, dark text, amber dot. */
function WarnPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 text-[11.5px] font-semibold whitespace-nowrap text-foreground", className)}>
      <AmberDot />
      {children}
    </span>
  )
}

/** A note that needs reading: mist block, dark text, amber bar on the start edge. */
function AmberNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("rounded-xl rounded-s-sm border-s-[3px] border-s-status-warning bg-card px-3 py-2 text-[12.5px] text-foreground", className)}>
      {children}
    </p>
  )
}

export { AMBER_TEXT, AmberDot, AmberNote, WarnPill }
