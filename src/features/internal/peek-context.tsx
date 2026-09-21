"use client"

import * as React from "react"

import type { EntityRef } from "@/features/tradechain/demo-world"

/**
 * One shared "what is open in the peek panel" state for the whole shell.
 *
 * It keeps a *stack*, not a single ref, because the panel's whole point is
 * that records lead to other records: a trade opens, you click one of its
 * lots, the lot opens, and Back has to return you to the trade rather than
 * closing the panel and losing your place.
 */
type PeekValue = {
  /** Top of the stack — what the panel is currently showing. */
  current: EntityRef | null
  /** True when there is somewhere to go back to. */
  canGoBack: boolean
  open: (ref: EntityRef) => void
  back: () => void
  close: () => void
}

const PeekContext = React.createContext<PeekValue | null>(null)

function PeekProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = React.useState<EntityRef[]>([])

  const open = React.useCallback((ref: EntityRef) => {
    setStack((previous) => {
      const top = previous[previous.length - 1]
      // Re-clicking the thing already on screen shouldn't grow the stack.
      if (top && top.kind === ref.kind && top.id === ref.id) return previous
      return [...previous, ref]
    })
  }, [])

  const back = React.useCallback(() => {
    setStack((previous) => previous.slice(0, -1))
  }, [])

  const close = React.useCallback(() => {
    setStack([])
  }, [])

  // Escape closes the panel outright rather than stepping back through the
  // stack — the stack is for deliberate navigation, Escape is for "get this
  // out of my way".
  React.useEffect(() => {
    if (stack.length === 0) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [stack.length, close])

  const value = React.useMemo<PeekValue>(
    () => ({
      current: stack[stack.length - 1] ?? null,
      canGoBack: stack.length > 1,
      open,
      back,
      close,
    }),
    [stack, open, back, close]
  )

  return <PeekContext.Provider value={value}>{children}</PeekContext.Provider>
}

/** Safe outside the provider — returns a no-op peek so a component can be
 *  rendered in isolation (or in a test) without blowing up. */
function usePeek(): PeekValue {
  const value = React.useContext(PeekContext)
  return (
    value ?? {
      current: null,
      canGoBack: false,
      open: () => {},
      back: () => {},
      close: () => {},
    }
  )
}

export { PeekProvider, usePeek }
