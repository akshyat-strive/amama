import Image from "next/image"

import { cn } from "@/lib/utils"

type EditorialImageProps = {
  src: string
  alt: string
  /** Unsplash is free to hotlink without credit, but crediting is good practice. */
  credit: { name: string; profileUrl: string }
  priority?: boolean
  className?: string
}

/**
 * Full-bleed photography panel for split-screen auth/marketing layouts —
 * the "big MNC" half, as opposed to the form half.
 */
function EditorialImage({
  src,
  alt,
  credit,
  priority,
  className,
}: EditorialImageProps) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10"
      />
      <a
        href={credit.profileUrl}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-4 end-4 rounded-full bg-black/30 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white"
      >
        Photo: {credit.name} / Unsplash
      </a>
    </div>
  )
}

export { EditorialImage }
