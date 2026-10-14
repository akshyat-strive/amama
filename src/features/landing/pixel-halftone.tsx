"use client"

import * as React from "react"

/** 8×8 Bayer matrix — ordered dithering, the 8-bit look: square pixels
 *  on a tight grid, crosses and pluses appearing as the density shifts. */
const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
]

/** Where the pixels gather: a corner, a corner opposite, or both long
 *  edges with a clear band through the middle (the banner look). */
export type HalftoneShape = "top-left" | "top-right" | "bottom-right" | "edges" | "rise"

function hash(x: number, y: number, seed: number) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return n - Math.floor(n)
}

/** Smooth value noise, for soft blotches in the density. */
function noise(x: number, y: number, seed: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi, seed)
  const b = hash(xi + 1, yi, seed)
  const c = hash(xi, yi + 1, seed)
  const d = hash(xi + 1, yi + 1, seed)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

function density(shape: HalftoneShape, nx: number, ny: number, wobble: number) {
  if (shape === "edges") {
    const edge = Math.max(1 - ny / 0.3, 1 - (1 - ny) / 0.3, 0)
    return Math.min(1, edge * edge * 1.15 * (1 + wobble))
  }
  // Light at the top, solid at the bottom — for filling letterforms.
  if (shape === "rise") return Math.min(1, Math.pow(ny, 1.1) * 1.15 * (1 + wobble * 0.6) + 0.04)
  const d = shape === "top-left" ? Math.hypot(nx * 0.8, ny) : shape === "top-right" ? Math.hypot((1 - nx) * 0.8, ny) : Math.hypot((1 - nx) * 0.8, 1 - ny)
  // Kept to its corner — the pixels sit away from the copy, never under it.
  const v = Math.max(0, 1 - d / 0.62)
  // The noise only shapes pixels that are already there, so nothing
  // strays into the empty part of the card.
  return Math.min(1, v * v * 1.25 * (1 + wobble))
}

/**
 * A pixel-dithered gradient that fills its parent (position it there).
 * Drawn once per size to a canvas at one cell per pixel and scaled up
 * with `image-rendering: pixelated`, so the squares stay crisp.
 */
function PixelHalftone({
  color,
  shape = "top-left",
  cell = 3,
  strength = 1,
  seed = 1,
  className,
}: {
  color: string
  shape?: HalftoneShape
  /** CSS pixels per dither pixel. */
  cell?: number
  /** Scales the overall density, 0–1.5. */
  strength?: number
  seed?: number
  className?: string
}) {
  const ref = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const width = Math.max(1, Math.ceil(rect.width / cell))
      const height = Math.max(1, Math.ceil(rect.height / cell))
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext("2d")
      if (!context) return
      context.clearRect(0, 0, width, height)
      context.fillStyle = color
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const wobble = (noise(x / 22, y / 9, seed) - 0.5) * 0.9
          const value = density(shape, x / width, y / height, wobble) * strength
          if (value > (BAYER[y % 8][x % 8] + 0.5) / 64) context.fillRect(x, y, 1, 1)
        }
      }
    }
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [color, shape, cell, strength, seed])

  return <canvas ref={ref} aria-hidden className={className} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated", pointerEvents: "none" }} />
}

export { PixelHalftone }
