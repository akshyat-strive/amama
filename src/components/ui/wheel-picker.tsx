"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export const WHEEL_ITEM_HEIGHT = 44
/** Must stay odd so one row sits dead-centre. */
export const WHEEL_VISIBLE_ITEMS = 5
const WHEEL_PADDING =
  ((WHEEL_VISIBLE_ITEMS - 1) / 2) * WHEEL_ITEM_HEIGHT
/** Degrees of barrel rotation per row away from centre. */
const DEGREES_PER_ITEM = 20
/** Rows either side of centre that get live 3D styling. */
const STYLED_WINDOW = 5

export type WheelPickerOption = {
  value: number
  label: string
  /** Rendered to screen readers instead of `label` when the two differ. */
  srLabel?: string
}

type WheelPickerProps = {
  options: WheelPickerOption[]
  value: number
  onValueChange: (value: number) => void
  /** Accessible name for the column, e.g. "Day". */
  label: string
  className?: string
  /** Widen a column that holds longer labels (months). */
  grow?: boolean
}

/**
 * One cylinder of an iOS-style rolling picker.
 *
 * Scrolling is native — the browser gives us momentum on touch, wheel on
 * desktop and `scroll-snap` alignment for free. The barrel illusion is layered
 * on top: each row within a small window of the centre gets a `rotateX` plus
 * scale/opacity falloff, recomputed inside a rAF on scroll. Rows outside that
 * window are parked once and left alone, so a 100-year column stays cheap.
 *
 * Accessibility: the column is a `spinbutton`, so a screen reader announces
 * "Day, 14" and arrow keys step values without touching the pointer at all.
 */
function WheelPicker({
  options,
  value,
  onValueChange,
  label,
  className,
  grow,
}: WheelPickerProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const itemRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const frameRef = React.useRef<number | null>(null)
  const settleRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const styledRange = React.useRef<[number, number]>([0, -1])
  /** Guards the scroll handler while we are the ones moving the scroller. */
  const programmaticRef = React.useRef(false)
  const lastHapticIndex = React.useRef<number | null>(null)

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  )
  const [activeIndex, setActiveIndex] = React.useState(selectedIndex)

  const paintFrame = React.useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const centre = scroller.scrollTop / WHEEL_ITEM_HEIGHT
    const first = Math.max(0, Math.floor(centre) - STYLED_WINDOW)
    const last = Math.min(
      options.length - 1,
      Math.ceil(centre) + STYLED_WINDOW
    )

    // Park rows that just left the live window.
    const [prevFirst, prevLast] = styledRange.current
    for (let i = prevFirst; i <= prevLast; i++) {
      if (i < first || i > last) {
        const node = itemRefs.current[i]
        if (node) {
          node.style.transform = ""
          node.style.opacity = "0"
        }
      }
    }

    for (let i = first; i <= last; i++) {
      const node = itemRefs.current[i]
      if (!node) continue
      const distance = i - centre
      const magnitude = Math.abs(distance)
      const angle = Math.max(-70, Math.min(70, -distance * DEGREES_PER_ITEM))
      node.style.transform = `rotateX(${angle.toFixed(2)}deg) scale(${(
        1 - Math.min(1, magnitude / 3) * 0.16
      ).toFixed(3)})`
      node.style.opacity = `${Math.max(
        0,
        1 - Math.min(1, magnitude / 2.6) * 0.8
      ).toFixed(3)}`
    }
    styledRange.current = [first, last]

    const nearest = Math.round(centre)
    if (nearest !== lastHapticIndex.current) {
      lastHapticIndex.current = nearest
      setActiveIndex(Math.max(0, Math.min(options.length - 1, nearest)))
      // A short tick per row makes the barrel feel physical on Android.
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.vibrate === "function" &&
        window.matchMedia("(pointer: coarse)").matches
      ) {
        try {
          navigator.vibrate(6)
        } catch {
          // Vibration is a nicety; never let it break scrolling.
        }
      }
    }
  }, [options.length])

  const commitNearest = React.useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const index = Math.max(
      0,
      Math.min(
        options.length - 1,
        Math.round(scroller.scrollTop / WHEEL_ITEM_HEIGHT)
      )
    )
    // Land exactly on the row. Scroll snapping normally does this, but a
    // momentum flick that ends outside the snap tolerance — or an animation
    // cut short — can otherwise leave the barrel resting between two values.
    const target = index * WHEEL_ITEM_HEIGHT
    if (Math.abs(scroller.scrollTop - target) > 0.5) {
      scroller.scrollTop = target
    }
    const next = options[index]
    if (next && next.value !== value) onValueChange(next.value)
  }, [onValueChange, options, value])

  const handleScroll = React.useCallback(() => {
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null
        paintFrame()
      })
    }
    if (programmaticRef.current) return
    if (settleRef.current) clearTimeout(settleRef.current)
    settleRef.current = setTimeout(commitNearest, 120)
  }, [commitNearest, paintFrame])

  const scrollToIndex = React.useCallback(
    (index: number, smooth: boolean) => {
      const scroller = scrollerRef.current
      if (!scroller) return
      const target = index * WHEEL_ITEM_HEIGHT
      programmaticRef.current = true
      scroller.scrollTo({ top: target, behavior: smooth ? "smooth" : "auto" })
      // Release the guard once the smooth scroll has had time to land, then
      // confirm it actually did. A smooth scroll that is interrupted — by a
      // background tab pausing rAF, or a gesture arriving mid-animation —
      // stops wherever it was, which would leave the row visibly off-centre.
      window.setTimeout(
        () => {
          programmaticRef.current = false
          const node = scrollerRef.current
          if (node && Math.abs(node.scrollTop - target) > 0.5) {
            node.scrollTop = target
          }
        },
        smooth ? 320 : 0
      )
    },
    []
  )

  // Park the column on the selected row on mount, and whenever the value is
  // changed from outside (e.g. day clamped from 31 → 28 when Feb is picked).
  React.useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const target = selectedIndex * WHEEL_ITEM_HEIGHT
    if (Math.abs(scroller.scrollTop - target) < 1) {
      paintFrame()
      return
    }
    const mounted = styledRange.current[1] >= styledRange.current[0]
    scrollToIndex(selectedIndex, mounted)
    setActiveIndex(selectedIndex)
    lastHapticIndex.current = selectedIndex
    paintFrame()
  }, [paintFrame, scrollToIndex, selectedIndex])

  React.useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      if (settleRef.current) clearTimeout(settleRef.current)
    }
  }, [])

  const step = (delta: number) => {
    const index = Math.max(
      0,
      Math.min(options.length - 1, selectedIndex + delta)
    )
    const next = options[index]
    if (next && next.value !== value) onValueChange(next.value)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault()
        step(-1)
        break
      case "ArrowDown":
        event.preventDefault()
        step(1)
        break
      case "PageUp":
        event.preventDefault()
        step(-5)
        break
      case "PageDown":
        event.preventDefault()
        step(5)
        break
      case "Home":
        event.preventDefault()
        step(-selectedIndex)
        break
      case "End":
        event.preventDefault()
        step(options.length - 1 - selectedIndex)
        break
    }
  }

  const selected = options[selectedIndex]

  return (
    <div
      ref={scrollerRef}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={options[0]?.value}
      aria-valuemax={options[options.length - 1]?.value}
      aria-valuenow={selected?.value}
      aria-valuetext={selected?.srLabel ?? selected?.label}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative h-[220px] snap-y snap-mandatory overflow-y-scroll outline-none",
        "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        "[perspective:1000px] [perspective-origin:center]",
        "rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/40",
        grow ? "flex-[1.4]" : "flex-1",
        className
      )}
      style={{
        scrollPaddingBlock: WHEEL_PADDING,
        // Fade the barrel out at both ends instead of hard-clipping it.
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 26%, black 74%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 26%, black 74%, transparent 100%)",
      }}
    >
      <div style={{ height: WHEEL_PADDING }} aria-hidden />
      {options.map((option, index) => (
        <div
          key={option.value}
          ref={(node) => {
            itemRefs.current[index] = node
          }}
          className={cn(
            "flex snap-center items-center justify-center",
            "text-[19px] tabular-nums transition-[color,font-weight] duration-150",
            "[backface-visibility:hidden] [transform-origin:center_center]",
            "motion-reduce:!transform-none motion-reduce:!opacity-100",
            index === activeIndex
              ? "font-semibold text-foreground"
              : "font-normal text-muted-foreground"
          )}
          style={{ height: WHEEL_ITEM_HEIGHT }}
        >
          {option.label}
        </div>
      ))}
      <div style={{ height: WHEEL_PADDING }} aria-hidden />
    </div>
  )
}

/**
 * Frames a row of `WheelPicker` columns and draws the single selection band
 * across all of them, the way a native picker does.
 */
function WheelPickerGroup({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative isolate w-full rounded-3xl border border-border bg-card px-2 py-1",
        className
      )}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-2 top-1/2 -z-10 -translate-y-1/2 rounded-2xl bg-muted"
        style={{ height: WHEEL_ITEM_HEIGHT }}
      />
      <div className="flex items-stretch gap-1">{children}</div>
    </div>
  )
}

export { WheelPicker, WheelPickerGroup }
