/**
 * Fig. 1 — the amama corridor, drawn isometric: a farm in Nashik, the
 * truck to Mumbai, our DC where each lot is weighed and checked, the
 * container yard, the vessel, and the buyer's door. Solid shaded boxes in
 * four tones with hairline edges, painted back to front.
 *
 * Laid out left to right on wide screens and top to bottom on a phone —
 * the same stops, walked along the other iso diagonal — with room between
 * them either way.
 */

const C = Math.cos(Math.PI / 6)
const S = 0.5

type Pt = [number, number, number]
type Orientation = "horizontal" | "vertical"

function project([x, y, z]: Pt): [number, number] {
  return [(x - y) * C, (x + y) * S - z]
}

function poly(points: Pt[]) {
  return points
    .map(project)
    .map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`)
    .join(" ")
}

type Tones = { top: string; left: string; right: string }

const GREY: Tones = { top: "#ffffff", left: "#ebebef", right: "#d9d9de" }
const MIST: Tones = { top: "#f5f5f7", left: "#e6e6ea", right: "#d4d4d9" }
const FIELD: Tones = { top: "#e4f4e9", left: "#cfe8d8", right: "#b9dcc6" }
const INK: Tones = { top: "#3a3a3d", left: "#2a2a2c", right: "#1d1d1f" }
const LIME: Tones = { top: "#25d366", left: "#1ebe5a", right: "#128c7e" }

const CONTAINER: Tones[] = [
  { top: "#9cc2ff", left: "#5b95f5", right: "#3b7be8" },
  { top: "#ffc28f", left: "#f99a4f", right: "#ea7e2c" },
  { top: "#c8b8ff", left: "#9e86f4", right: "#8468e8" },
  { top: "#9ae6b4", left: "#4fcf82", right: "#25b866" },
  { top: "#f8a5c2", left: "#ef6f9f", right: "#e04f86" },
]

type Box = { at: Pt; size: Pt; tones: Tones }

function BoxShape({ at: [x, y, z], size: [w, d, h], tones }: Box) {
  const top: Pt[] = [
    [x, y, z + h],
    [x + w, y, z + h],
    [x + w, y + d, z + h],
    [x, y + d, z + h],
  ]
  const left: Pt[] = [
    [x, y + d, z],
    [x + w, y + d, z],
    [x + w, y + d, z + h],
    [x, y + d, z + h],
  ]
  const right: Pt[] = [
    [x + w, y, z],
    [x + w, y + d, z],
    [x + w, y + d, z + h],
    [x + w, y, z + h],
  ]
  return (
    <g stroke="#1d1d1f" strokeOpacity="0.5" strokeWidth="0.55" strokeLinejoin="round">
      <polygon points={poly(left)} fill={tones.left} />
      <polygon points={poly(right)} fill={tones.right} />
      <polygon points={poly(top)} fill={tones.top} />
    </g>
  )
}

/** One stop on the corridor, drawn around x = `anchor` before it's walked
 *  into place. */
type Stop = {
  anchor: number
  n: string
  title: string
  detail: string
  /** The point the label's leader line touches, in local coordinates. */
  pin: Pt
  boxes: Box[]
  /** A gentle loop — the vessel rides the swell, the DC breathes. */
  motion?: "bob" | "breathe"
}

const STOPS: Stop[] = [
  {
    anchor: 0,
    n: "01",
    title: "Farm",
    detail: "Nashik · farm QC",
    pin: [56, 40, 4],
    boxes: [
      { at: [0, 0, 0], size: [78, 70, 4], tones: FIELD },
      { at: [10, 8, 4], size: [16, 14, 13], tones: GREY },
    ],
  },
  {
    anchor: 104,
    n: "",
    title: "",
    detail: "",
    pin: [110, 34, 9],
    boxes: [
      { at: [104, 30, 0], size: [20, 11, 9], tones: INK },
      { at: [124, 30, 0], size: [7, 11, 7], tones: MIST },
    ],
  },
  {
    anchor: 150,
    n: "02",
    title: "Mumbai DC",
    detail: "GRN · amama QC",
    pin: [190, 34, 31],
    motion: "breathe",
    boxes: [
      { at: [150, 6, 0], size: [86, 62, 3], tones: MIST },
      { at: [158, 12, 3], size: [64, 44, 26], tones: GREY },
      { at: [158, 12, 29], size: [64, 6, 2], tones: LIME },
    ],
  },
  {
    anchor: 262,
    n: "03",
    title: "Port",
    detail: "Nhava Sheva",
    pin: [296, 36, 20],
    boxes: [
      { at: [262, 10, 0], size: [70, 54, 2], tones: MIST },
      ...[0, 1, 2].flatMap((col) =>
        [0, 1].flatMap((row) =>
          [0, 1].map((level) => ({
            at: [268 + col * 21, 16 + row * 22, 2 + level * 9] as Pt,
            size: [19, 9, 9] as Pt,
            tones: CONTAINER[(col * 2 + row + level * 3) % CONTAINER.length],
          }))
        )
      ),
    ],
  },
  {
    anchor: 356,
    n: "04",
    title: "Vessel",
    detail: "Tracked live",
    pin: [412, 34, 20],
    motion: "bob",
    boxes: [
      { at: [356, 14, 0], size: [118, 40, 12], tones: INK },
      ...[0, 1, 2, 3, 4].flatMap((col) =>
        [0, 1].map((row) => ({
          at: [364 + col * 19, 18 + row * 16, 12] as Pt,
          size: [17, 14, 8] as Pt,
          tones: CONTAINER[(col + row * 2) % CONTAINER.length],
        }))
      ),
      { at: [458, 22, 12], size: [12, 24, 16], tones: GREY },
    ],
  },
  {
    anchor: 500,
    n: "05",
    title: "Buyer",
    detail: "Jebel Ali · invoice",
    pin: [532, 32, 23],
    boxes: [
      { at: [500, 6, 0], size: [70, 60, 3], tones: MIST },
      { at: [510, 14, 3], size: [44, 38, 20], tones: GREY },
    ],
  },
]

/** The route on the ground, through each stop's near and far edge. */
const ROUTE: [number, Pt][] = [
  [0, [78, 36, 0]],
  [150, [150, 36, 0]],
  [150, [236, 36, 0]],
  [262, [262, 36, 0]],
  [262, [332, 36, 0]],
  [356, [356, 36, 0]],
  [356, [474, 36, 0]],
  [500, [500, 36, 0]],
]

/** Walks a local point to its place on screen. Horizontal walks the
 *  (1, −1) diagonal — flat on screen; vertical walks (1, 1) — straight
 *  down. `gap` spreads the stops apart. */
function walker(orientation: Orientation, gap: number) {
  const dy = orientation === "horizontal" ? -1 : 1
  return (anchor: number, [x, y, z]: Pt): Pt => [x - anchor + 0.55 * gap * anchor, y + dy * 0.55 * gap * anchor, z]
}

function Label({ at, n, title, detail, side }: { at: Pt; n: string; title: string; detail: string; side: "top" | "right" }) {
  const [px, py] = project(at)
  if (side === "right") {
    const x = px + 46
    return (
      <g>
        <circle cx={px} cy={py} r="1.8" fill="#1d1d1f" />
        <line x1={px + 3} y1={py} x2={x - 6} y2={py} stroke="#1d1d1f" strokeOpacity="0.35" strokeWidth="0.6" />
        <text x={x} y={py - 2} fontSize="9.5" fill="#1d1d1f">
          <tspan fill="#6e6e73">{n} </tspan>
          <tspan fontWeight="600">{title}</tspan>
        </text>
        <text x={x} y={py + 10} fontSize="8" fill="#6e6e73">
          {detail}
        </text>
      </g>
    )
  }
  const lift = 48
  return (
    <g>
      <circle cx={px} cy={py - 3} r="1.6" fill="#1d1d1f" />
      <line x1={px} y1={py - 6} x2={px} y2={py - lift + 13} stroke="#1d1d1f" strokeOpacity="0.35" strokeWidth="0.6" />
      <text x={px} y={py - lift - 3} textAnchor="middle" fontSize="8.5" fill="#1d1d1f">
        <tspan fill="#6e6e73">{n} </tspan>
        <tspan fontWeight="600">{title}</tspan>
      </text>
      <text x={px} y={py - lift + 8} textAnchor="middle" fontSize="7" fill="#6e6e73">
        {detail}
      </text>
    </g>
  )
}

/** Crop rows ruled across the field's top face. */
function Rows({ walk }: { walk: (anchor: number, point: Pt) => Pt }) {
  return (
    <g stroke="#25b866" strokeOpacity="0.7" strokeWidth="0.8" strokeLinecap="round">
      {Array.from({ length: 6 }).map((_, index) => {
        const offset = ((index + 1) * 70) / 7
        const [x1, y1] = project(walk(0, [6, offset, 4]))
        const [x2, y2] = project(walk(0, [72, offset, 4]))
        return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} />
      })}
    </g>
  )
}

function CorridorFigure({ orientation = "horizontal" }: { orientation?: Orientation }) {
  const vertical = orientation === "vertical"
  const walk = walker(orientation, vertical ? 1.6 : 1.3)
  // Stops never overlap, so painting stop by stop is enough: back to
  // front is left to right horizontally, top to bottom vertically.
  const stops = STOPS.map((stop) => ({
    ...stop,
    boxes: stop.boxes
      .map((box) => ({ ...box, at: walk(stop.anchor, box.at) }))
      .sort((a, b) => a.at[0] + a.at[1] + a.at[2] * 0.01 - (b.at[0] + b.at[1] + b.at[2] * 0.01)),
  }))
  const route = ROUTE.map(([anchor, point]) => project(walk(anchor, point)))
  const path = route.map(([px, py], index) => `${index === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ")

  const corners = stops.flatMap((stop) =>
    stop.boxes.flatMap(({ at: [x, y, z], size: [w, d, h] }) =>
      (
        [
          [x, y, z],
          [x + w, y, z],
          [x, y + d, z],
          [x + w, y + d, z],
          [x, y, z + h],
          [x + w, y + d, z + h],
        ] as Pt[]
      ).map(project)
    )
  )
  const xs = corners.map(([px]) => px)
  const ys = corners.map(([, py]) => py)
  const pad = vertical ? { left: 18, right: 150, top: 24, bottom: 24 } : { left: 28, right: 28, top: 82, bottom: 24 }
  const minX = Math.min(...xs) - pad.left
  const minY = Math.min(...ys) - pad.top
  const width = Math.max(...xs) + pad.right - minX
  const height = Math.max(...ys) + pad.bottom - minY

  return (
    <svg viewBox={`${minX.toFixed(0)} ${minY.toFixed(0)} ${width.toFixed(0)} ${height.toFixed(0)}`} role="img" aria-labelledby={`corridor-${orientation}`} className="h-auto w-full">
      <title id={`corridor-${orientation}`}>
        How goods move on amama: farm in Nashik, truck to the Mumbai DC for weighing and quality checks, the container yard at Nhava Sheva, the vessel, and the buyer in Jebel Ali.
      </title>
      <path d={path} fill="none" stroke="#1d1d1f" strokeOpacity="0.18" strokeWidth="1" />
      <path className="route" d={path} fill="none" stroke="#25d366" strokeWidth="1.4" strokeDasharray="4 8" strokeLinecap="round" />

      {stops.map((stop) => (
        <g key={stop.anchor} className={stop.motion === "bob" ? "iso-bob" : stop.motion === "breathe" ? "iso-breathe" : undefined}>
          {stop.boxes.map((box, index) => (
            <BoxShape key={index} {...box} />
          ))}
          {stop.anchor === 0 ? <Rows walk={walk} /> : null}
        </g>
      ))}

      {/* The lot itself, moving from field to buyer, with a soft ring. */}
      <circle r="6" fill="#25d366" fillOpacity="0.2">
        <animateMotion dur="10s" repeatCount="indefinite" path={path} />
        <animate attributeName="r" values="4;9;4" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle r="2.8" fill="#25d366" stroke="#fff" strokeWidth="1.2">
        <animateMotion dur="10s" repeatCount="indefinite" path={path} />
      </circle>

      {stops
        .filter((stop) => stop.title)
        .map((stop, index) => (
          <g key={stop.n} className="iso-label" style={{ animationDelay: `${300 + index * 140}ms` }}>
            <Label at={walk(stop.anchor, stop.pin)} n={stop.n} title={stop.title} detail={stop.detail} side={vertical ? "right" : "top"} />
          </g>
        ))}
    </svg>
  )
}

export { CorridorFigure }
