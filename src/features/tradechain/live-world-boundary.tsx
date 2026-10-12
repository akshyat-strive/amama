"use client"

import * as React from "react"

import { useReplayGeneration } from "@/features/tradechain/live-world"

/**
 * Replays this browser's saved trade actions after hydration. The server
 * always renders the pristine seed; if there is a saved log, the page
 * below is remounted once against the replayed world. Screens that let
 * people act also subscribe with `useLiveWorld`, so later actions update
 * them in place without a remount.
 */
function LiveWorldBoundary({ children }: { children: React.ReactNode }) {
  const generation = useReplayGeneration()
  return <React.Fragment key={generation}>{children}</React.Fragment>
}

export { LiveWorldBoundary }
