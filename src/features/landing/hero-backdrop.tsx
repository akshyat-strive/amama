/**
 * The hero's backdrop: a quiet isometric yard — two warehouses with dock doors,
 * stacks of containers, and trucks driving along a road — drawn in
 * pale tones with hairline edges so it reads as atmosphere, never as
 * content. The trucks move, each facing the way it drives.
 */

const C = Math.cos(Math.PI / 6)
const S = 0.5

type Pt = [number, number, number]
type Tones = { top: string; left: string; right: string }

function project([x, y, z]: Pt): [number, number] {
  return [(x - y) * C, (x + y) * S - z]
}

function pts(points: Pt[]) {
  return points
    .map(project)
    .map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`)
    .join(" ")
}

const WHITE: Tones = { top: "#ffffff", left: "#eeeef2", right: "#dedee3" }
const MIST: Tones = { top: "#f2f2f5", left: "#e4e4e9", right: "#d6d6dc" }
const GREY: Tones = { top: "#c9c9ce", left: "#b0b0b6", right: "#97979e" }
const INK: Tones = { top: "#6e6e73", left: "#58585d", right: "#46464a" }
const LIME: Tones = { top: "#7fe3a3", left: "#4fd17f", right: "#25b866" }

const PASTEL: Tones[] = [
  { top: "#cfe0ff", left: "#a9c6fb", right: "#8fb3f5" },
  { top: "#ffdcc0", left: "#fbc298", right: "#f5aa74" },
  { top: "#e1d8ff", left: "#c9bcfa", right: "#b6a7f5" },
  { top: "#cdf0da", left: "#a6e3bf", right: "#86d6a6" },
  { top: "#fbd0e0", left: "#f6adc7", right: "#f08fb2" },
]

type Box = { at: Pt; size: Pt; tones: Tones }

function Shape({ at: [x, y, z], size: [w, d, h], tones }: Box) {
  return (
    <g stroke="#1d1d1f" strokeOpacity="0.32" strokeWidth="0.55" strokeLinejoin="round">
      <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={tones.left} />
      <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={tones.right} />
      <polygon points={pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={tones.top} />
    </g>
  )
}

function order(boxes: Box[]) {
  return [...boxes].sort((a, b) => a.at[0] + a.size[0] / 2 + a.at[1] + a.size[1] / 2 + a.at[2] * 0.02 - (b.at[0] + b.size[0] / 2 + b.at[1] + b.size[1] / 2 + b.at[2] * 0.02))
}

/** A warehouse: a long white box with a pale roof, a lime band, and a row
 *  of roll-up dock doors on its long face. */
function Warehouse() {
  const W = 96
  const D = 58
  const H = 36
  const boxes: Box[] = [
    { at: [0, 0, 0], size: [W, D, H], tones: WHITE },
    { at: [-2, -2, H], size: [W + 4, D + 4, 3], tones: MIST },
    { at: [-2, D - 1, H - 7], size: [W + 4, 3, 5], tones: LIME },
  ]
  const doors = [0, 1, 2, 3]
  return (
    <g>
      {boxes.map((box, index) => (
        <Shape key={index} {...box} />
      ))}
      {/* dock doors on the long face (plane y = D) */}
      <g transform={`matrix(${C} ${S} 0 -1 ${(-D * C).toFixed(3)} ${(D * S).toFixed(3)})`}>
        {doors.map((index) => {
          const x = 8 + index * 21
          return (
            <g key={index}>
              <rect x={x} y="2" width="15" height="19" fill="#d3d3d8" stroke="#1d1d1f" strokeOpacity="0.35" strokeWidth="0.5" />
              {[7, 12, 17].map((z) => (
                <line key={z} x1={x} y1={z} x2={x + 15} y2={z} stroke="#1d1d1f" strokeOpacity="0.2" strokeWidth="0.5" />
              ))}
              <rect x={x - 1} y="21" width="17" height="1.6" fill="#25d366" fillOpacity="0.7" />
            </g>
          )
        })}
      </g>
    </g>
  )
}

/** A street lamp: a pole with a pale head, lit lime. */
function Lamp() {
  const boxes: Box[] = [
    { at: [0, 0, 0], size: [2, 2, 26], tones: GREY },
    { at: [-3, -1, 26], size: [8, 4, 2], tones: LIME },
  ]
  return (
    <g>
      {boxes.map((box, index) => (
        <Shape key={index} {...box} />
      ))}
    </g>
  )
}

/** A short stack of boxes. */
function Stack({ cols, rows, levels, seed }: { cols: number; rows: number; levels: number; seed: number }) {
  const boxes: Box[] = []
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++)
      for (let l = 0; l < levels; l++) {
        if (l > 0 && (c + r + l + seed) % 4 === 0) continue
        boxes.push({ at: [c * 27, r * 21, l * 10], size: [25, 19, 9.5], tones: PASTEL[(c * 2 + r + l + seed) % PASTEL.length] })
      }
  return (
    <g>
      {order(boxes).map((box, index) => (
        <Shape key={index} {...box} />
      ))}
    </g>
  )
}

/** A container truck. `nose` is the way it faces — and so the way it can
 *  drive: +1 along x, or −1. */
function Truck({ tone, nose = 1 }: { tone: number; nose?: 1 | -1 }) {
  const L = 62
  // Built nose-along-+x, then reflected along x for the other way.
  const at = (x: number, y: number, z: number, w: number, d: number, h: number, tones: Tones): Box => ({
    at: [nose === 1 ? x : L - x - w, y, z],
    size: [w, d, h],
    tones,
  })
  const boxes: Box[] = [
    at(0, 1, 0, 62, 16, 3, INK),
    at(2, 1.5, 3, 44, 15, 19, PASTEL[tone % PASTEL.length]),
    at(48, 2, 3, 14, 14, 15, WHITE),
    at(60, 3, 9, 2, 12, 6, GREY),
    at(6, 0, 0, 9, 2, 6, INK),
    at(34, 0, 0, 9, 2, 6, INK),
    at(6, 15, 0, 9, 2, 6, INK),
    at(34, 15, 0, 9, 2, 6, INK),
  ]
  return (
    <g>
      {order(boxes).map((box, index) => (
        <Shape key={index} {...box} />
      ))}
    </g>
  )
}

/** One side of the yard: stacks, a crane, and a road with a truck
 *  driving in towards the middle. Mirrored for the other side. */
function Side({ seed, delay }: { seed: number; delay: number }) {
  const run = 420
  const [rx, ry] = [run * C, run * S]
  const road: Box = { at: [0, 0, 0], size: [run + 140, 44, 2], tones: MIST }
  const start = project([12, 6, 2])
  const lane = project([12, 24, 2])
  return (
    <g>
      <g transform="translate(70 500) scale(1.25)">
        <Stack cols={3} rows={2} levels={3} seed={seed} />
      </g>
      <g transform="translate(290 380) scale(1.45)">
        <Warehouse />
      </g>
      <g transform="translate(20 575)">
        <Shape {...road} />
        {[90, 230, 370].map((x) => (
          <g key={x} transform={`translate(${project([x, -4, 2])[0].toFixed(1)} ${project([x, -4, 2])[1].toFixed(1)})`}>
            <Lamp />
          </g>
        ))}
        <polyline points={pts([[8, 22, 2], [run + 130, 22, 2]])} fill="none" stroke="#25d366" strokeWidth="1.2" strokeDasharray="6 9" strokeOpacity="0.8" className="route" />
        {/* a truck heading in, fading in and out at the ends of its run */}
        <g>
          <animateMotion dur="13s" begin={`${-delay}s`} repeatCount="indefinite" path={`M0,0 L${rx.toFixed(0)},${ry.toFixed(0)}`} calcMode="linear" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.82;1" dur="13s" begin={`${-delay}s`} repeatCount="indefinite" />
          <g transform={`translate(${start[0].toFixed(1)} ${start[1].toFixed(1)}) scale(1.1)`}>
            <Truck tone={seed} nose={1} />
          </g>
        </g>
        <g>
          <animateMotion dur="17s" begin={`${-delay - 7}s`} repeatCount="indefinite" path={`M${rx.toFixed(0)},${ry.toFixed(0)} L0,0`} calcMode="linear" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.82;1" dur="17s" begin={`${-delay - 7}s`} repeatCount="indefinite" />
          <g transform={`translate(${lane[0].toFixed(1)} ${lane[1].toFixed(1)}) scale(1.1)`}>
            <Truck tone={seed + 3} nose={-1} />
          </g>
        </g>
      </g>
    </g>
  )
}

function Scene() {
  return (
    <>
      <Side seed={1} delay={0} />
      <g transform="translate(1600 0) scale(-1 1)">
        <Side seed={3} delay={5} />
      </g>
    </>
  )
}

function HeroBackdrop() {
  return (
    <>
      {/* wide screens: both sides of the yard */}
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 hidden size-full sm:block" aria-hidden>
        <Scene />
      </svg>
      {/* phones: a tighter crop on one crane, its stacks and the road */}
      <svg viewBox="30 150 780 760" preserveAspectRatio="xMinYMax slice" className="absolute inset-0 size-full sm:hidden" aria-hidden>
        <Scene />
      </svg>
    </>
  )
}

export { HeroBackdrop }
