import { cn } from "@/lib/utils"

/**
 * Flat brand illustrations drawn on the amama green (#00D084).
 *
 * Deliberately built from tokens rather than flat hex so they hold up in dark
 * mode, and marked `aria-hidden` — every screen that uses one states the same
 * thing in its headline, so announcing the art would only be noise.
 */

type IllustrationProps = { className?: string }

const frame = "h-auto w-full"

function Sun() {
  return (
    <>
      <circle cx="152" cy="34" r="14" className="fill-amama" opacity="0.35" />
      <circle cx="152" cy="34" r="8" className="fill-amama" />
    </>
  )
}

/** Producer side: a farmer figure standing in planted rows. */
function FarmerIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 180 140"
      role="presentation"
      aria-hidden
      className={cn(frame, className)}
    >
      <Sun />
      {/* Field bands */}
      <path
        d="M0 108h180v10H0z"
        className="fill-amama"
        opacity="0.18"
      />
      <path d="M0 118h180v22H0z" className="fill-amama" opacity="0.28" />
      {/* Crop rows */}
      {[18, 42, 138, 162].map((x) => (
        <g key={x} className="stroke-amama" strokeWidth="2.5" strokeLinecap="round">
          <path d={`M${x} 108v-14`} />
          <path d={`M${x} 100c-5-2-7-6-7-10 4 0 7 2 7 6`} fill="none" />
          <path d={`M${x} 100c5-2 7-6 7-10-4 0-7 2-7 6`} fill="none" />
        </g>
      ))}
      {/* Figure */}
      <g>
        {/* Hat */}
        <path
          d="M74 46h22c0-8-5-13-11-13s-11 5-11 13z"
          className="fill-amama"
        />
        <path
          d="M66 47h38a2 2 0 0 1 0 4H66a2 2 0 0 1 0-4z"
          className="fill-amama"
        />
        {/* Head */}
        <circle cx="85" cy="58" r="8" className="fill-foreground" opacity="0.85" />
        {/* Body */}
        <path
          d="M73 70h24a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H73a4 4 0 0 1-4-4V74a4 4 0 0 1 4-4z"
          className="fill-amama"
        />
        {/* Legs */}
        <path
          d="M76 100h6v10h-6zM88 100h6v10h-6z"
          className="fill-foreground"
          opacity="0.85"
        />
        {/* Basket of produce */}
        <path
          d="M104 84h20l-3 14h-14z"
          className="fill-foreground"
          opacity="0.15"
        />
        <circle cx="110" cy="86" r="4" className="fill-amama" />
        <circle cx="118" cy="86" r="4" className="fill-amama" opacity="0.7" />
      </g>
    </svg>
  )
}

/** Buyer side: a globe with a container crate and shipping route. */
function BuyerIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 180 140"
      role="presentation"
      aria-hidden
      className={cn(frame, className)}
    >
      <Sun />
      {/* Globe */}
      <circle cx="66" cy="72" r="38" className="fill-amama" opacity="0.18" />
      <circle
        cx="66"
        cy="72"
        r="38"
        fill="none"
        className="stroke-amama"
        strokeWidth="2.5"
      />
      <ellipse
        cx="66"
        cy="72"
        rx="16"
        ry="38"
        fill="none"
        className="stroke-amama"
        strokeWidth="2"
        opacity="0.8"
      />
      <path
        d="M28 72h76M34 52h64M34 92h64"
        fill="none"
        className="stroke-amama"
        strokeWidth="2"
        opacity="0.8"
      />
      {/* Trade route */}
      <path
        d="M96 56c22-14 44-6 56 12"
        fill="none"
        className="stroke-amama"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="5 6"
      />
      {/* Container crate */}
      <g>
        <path
          d="M116 78h44a3 3 0 0 1 3 3v24a3 3 0 0 1-3 3h-44a3 3 0 0 1-3-3V81a3 3 0 0 1 3-3z"
          className="fill-amama"
        />
        <path
          d="M124 78v30M138 78v30M152 78v30"
          className="stroke-background"
          strokeWidth="2.5"
          opacity="0.55"
        />
      </g>
      {/* Ground */}
      <path
        d="M8 118h164a2 2 0 0 1 0 4H8a2 2 0 0 1 0-4z"
        className="fill-foreground"
        opacity="0.12"
      />
    </svg>
  )
}

/** Completion: a badge check with a light burst. */
function SuccessIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 180 140"
      role="presentation"
      aria-hidden
      className={cn(frame, className)}
    >
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <rect
          key={angle}
          x="88"
          y="14"
          width="4"
          height="12"
          rx="2"
          className="fill-amama"
          opacity="0.5"
          transform={`rotate(${angle} 90 70)`}
        />
      ))}
      <circle cx="90" cy="70" r="40" className="fill-amama" opacity="0.18" />
      <circle cx="90" cy="70" r="30" className="fill-amama" />
      <path
        d="M77 70l9 9 18-18"
        fill="none"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export { FarmerIllustration, BuyerIllustration, SuccessIllustration }
