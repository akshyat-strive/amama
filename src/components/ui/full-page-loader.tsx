import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

/** The gap between "we don't know who's signed in yet" (a session fetch
 *  still in flight) and the real shell rendering — shown instead of a
 *  blank flash, so a slower network round-trip still reads as "loading"
 *  rather than "broken". */
function FullPageLoader({ className }: { className?: string }) {
  return (
    <div className={cn("grid min-h-dvh place-items-center bg-card", className)}>
      <Loader2Icon aria-hidden className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

export { FullPageLoader }
