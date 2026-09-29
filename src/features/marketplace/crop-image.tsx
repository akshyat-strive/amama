"use client"

import * as React from "react"
import Image from "next/image"
import { LeafIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { cropImageUrl } from "@/features/onboarding/steps"

/**
 * A crop photo that never shows a broken image or its alt text: a soft
 * shimmer holds the space while it loads, the photo fades in over it once
 * it arrives, and a quiet leaf placeholder takes its place if it fails.
 * Fills its (relatively positioned) parent.
 */
function CropImage({
  photo,
  width = 480,
  alt,
  sizes,
  priority = false,
  className,
}: {
  photo: string | null | undefined
  width?: number
  alt: string
  sizes: string
  priority?: boolean
  className?: string
}) {
  const [state, setState] = React.useState<"loading" | "loaded" | "failed">(photo ? "loading" : "failed")

  return (
    <>
      {state !== "loaded" ? (
        <span
          role={state === "failed" ? "img" : undefined}
          aria-label={state === "failed" ? alt : undefined}
          className={cn(
            "absolute inset-0 grid place-items-center bg-amama-subtle",
            state === "loading" && "animate-pulse"
          )}
        >
          <LeafIcon aria-hidden className="size-1/5 max-h-10 max-w-10 min-h-4 min-w-4 text-amama-deep/25" strokeWidth={1.5} />
        </span>
      ) : null}
      {photo && state !== "failed" ? (
        <Image
          src={cropImageUrl(photo, width)}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
          className={cn("object-cover transition-opacity duration-500", state === "loaded" ? "opacity-100" : "opacity-0", className)}
        />
      ) : null}
    </>
  )
}

export { CropImage }
