import { cn } from "@/lib/utils"
import { AMAMA_PATH } from "@/components/brand/amama-wordmark"

/**
 * One container, hanging from a crane's rope: four slings run from a
 * spreader beam up to a ring, and a single line carries it off the top of
 * the page. It sways on the rope with the container lagging a beat behind,
 * the way a real lift settles. Drawn isometric, ribbed side carrying the
 * amama wordmark, doors on the near end.
 */

const C = Math.cos(Math.PI / 6)
const S = 0.5

type Pt = [number, number, number]

function project([x, y, z]: Pt): [number, number] {
  return [(x - y) * C, (x + y) * S - z]
}

function pts(points: Pt[]) {
  return points
    .map(project)
    .map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`)
    .join(" ")
}

const L = 120
const D = 48
const H = 52

const BODY = { top: "#3f3f43", left: "#242427", right: "#18181a" }
const RIB = "#0e0e10"
const LIME = "#25d366"

/** A face laid out in its own plane, then mapped into the iso view:
 *  `side` is the long ribbed face (x, z); `end` is the door end (y, z). */
const SIDE = `matrix(${C} ${S} 0 -1 ${(-D * C).toFixed(3)} ${(D * S).toFixed(3)})`
const END = `matrix(${-C} ${S} 0 -1 ${(L * C).toFixed(3)} ${(L * S).toFixed(3)})`

function Box({ at: [x, y, z], size: [w, d, h], tones }: { at: Pt; size: Pt; tones: { top: string; left: string; right: string } }) {
  return (
    <g stroke="#000" strokeOpacity="0.5" strokeWidth="0.5" strokeLinejoin="round">
      <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={tones.left} />
      <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={tones.right} />
      <polygon points={pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={tones.top} />
    </g>
  )
}

const STEEL = { top: "#8e8e93", left: "#6e6e73", right: "#4d4d52" }

function HangingContainer({ className }: { className?: string }) {
  // Where the lift hangs from, in iso space: above the container's centre.
  const centre: Pt = [L / 2, D / 2, H]
  const ring: Pt = [centre[0], centre[1], H + 78]
  const [ringX, ringY] = project(ring)
  const ropeTop = ringY - 140

  const slingFrom: Pt[] = [
    [8, 4, H + 6],
    [L - 8, 4, H + 6],
    [L - 8, D - 4, H + 6],
    [8, D - 4, H + 6],
  ]

  const corners = [
    ...[0, L].flatMap((x) => [0, D].flatMap((y) => [0, H + 8].map((z) => project([x, y, z] as Pt)))),
    project(ring),
  ]
  const xs = corners.map(([px]) => px)
  const ys = corners.map(([, py]) => py)
  const minX = Math.min(...xs) - 6
  const width = Math.max(...xs) + 6 - minX
  const height = Math.max(...ys) + 8 - ropeTop

  const ribs = Array.from({ length: 17 }, (_, index) => 7 + index * ((L - 14) / 16))
  const k = 74 / 5053

  return (
    <svg viewBox={`${minX.toFixed(0)} ${ropeTop.toFixed(0)} ${width.toFixed(0)} ${height.toFixed(0)}`} className={cn("overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id="hang-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* The whole rig swings from the top of the rope. */}
      <g className="hang-sway" style={{ transformOrigin: `${ringX.toFixed(1)}px ${ropeTop.toFixed(1)}px` }}>
        <line x1={ringX} y1={ropeTop} x2={ringX} y2={ringY - 5} stroke="#1d1d1f" strokeWidth="1.4" />
        {/* hook and ring */}
        <circle cx={ringX} cy={ringY} r="5" fill="none" stroke="#1d1d1f" strokeWidth="1.6" />
        <path d={`M${ringX - 3.2},${ringY + 4.2} q3.2,6 6.4,0`} fill="none" stroke="#1d1d1f" strokeWidth="1.6" strokeLinecap="round" />

        {/* The container lags the rope a little, around the ring. */}
        <g className="hang-lag" style={{ transformOrigin: `${ringX.toFixed(1)}px ${ringY.toFixed(1)}px` }}>
          {/* slings */}
          <g stroke="#1d1d1f" strokeOpacity="0.8" strokeWidth="0.9" strokeLinecap="round">
            {slingFrom.map((from, index) => {
              const [x1, y1] = project(from)
              return <line key={index} x1={x1} y1={y1} x2={ringX} y2={ringY + 4} />
            })}
          </g>

          {/* container body */}
          <g stroke="#000" strokeOpacity="0.55" strokeWidth="0.6" strokeLinejoin="round">
            <polygon points={pts([[0, D, 0], [L, D, 0], [L, D, H], [0, D, H]])} fill={BODY.left} />
            <polygon points={pts([[L, 0, 0], [L, D, 0], [L, D, H], [L, 0, H]])} fill={BODY.right} />
            <polygon points={pts([[0, 0, H], [L, 0, H], [L, D, H], [0, D, H]])} fill={BODY.top} />
          </g>

          {/* roof: two seams */}
          <g stroke={RIB} strokeOpacity="0.5" strokeWidth="0.7" fill="none">
            <polyline points={pts([[0, D / 3, H], [L, D / 3, H]])} />
            <polyline points={pts([[0, (2 * D) / 3, H], [L, (2 * D) / 3, H]])} />
          </g>

          {/* long side: ribs, rails, wordmark, castings */}
          <g transform={SIDE}>
            <g stroke={RIB} strokeOpacity="0.55" strokeWidth="1.1">
              {ribs.map((x) => (
                <line key={x} x1={x} y1="6" x2={x} y2={H - 6} />
              ))}
            </g>
            <rect x="0" y="0" width={L} height="3.4" fill={RIB} fillOpacity="0.55" />
            <rect x="0" y={H - 3.4} width={L} height="3.4" fill={RIB} fillOpacity="0.55" />
            <rect x="0" y="0" width={L} height={H} fill="url(#hang-sheen)" />
            <g transform={`translate(${(L - 74) / 2} ${H / 2 + 5}) scale(${k} ${-k})`}>
              <path d={AMAMA_PATH} fill="#fff" />
            </g>
            {/* a lime stripe under the name */}
            <rect x={(L - 74) / 2} y={H / 2 - 9} width="74" height="1.6" fill={LIME} />
            {[
              [0, 0],
              [L - 6, 0],
              [0, H - 6],
              [L - 6, H - 6],
            ].map(([cx, cy]) => (
              <rect key={`${cx}-${cy}`} x={cx} y={cy} width="6" height="6" fill="#0a0a0b" />
            ))}
          </g>

          {/* door end: two leaves, lock rods, handles, plate */}
          <g transform={END}>
            <rect x="0" y="0" width={D} height="3.4" fill={RIB} fillOpacity="0.6" />
            <rect x="0" y={H - 3.4} width={D} height="3.4" fill={RIB} fillOpacity="0.6" />
            <line x1={D / 2} y1="3.4" x2={D / 2} y2={H - 3.4} stroke={RIB} strokeWidth="1.2" />
            <g stroke="#9a9aa0" strokeOpacity="0.85" strokeWidth="1.1" strokeLinecap="round">
              {[D * 0.14, D * 0.36, D * 0.64, D * 0.86].map((y) => (
                <line key={y} x1={y} y1="6.5" x2={y} y2={H - 6.5} />
              ))}
            </g>
            <g fill="#c9c9ce">
              {[D * 0.36, D * 0.64].map((y) => (
                <rect key={y} x={y - 1.6} y={H / 2 - 1.5} width="3.2" height="3" rx="0.8" />
              ))}
            </g>
            <rect x={D - 17} y="9" width="12" height="7" rx="1" fill="#f5f5f7" fillOpacity="0.9" />
            <g stroke="#6e6e73" strokeWidth="0.5">
              <line x1={D - 15.5} y1="11.2" x2={D - 6.5} y2="11.2" />
              <line x1={D - 15.5} y1="13.2" x2={D - 9.5} y2="13.2" />
            </g>
            {[
              [0, 0],
              [D - 6, 0],
              [0, H - 6],
              [D - 6, H - 6],
            ].map(([cx, cy]) => (
              <rect key={`${cx}-${cy}`} x={cx} y={cy} width="6" height="6" fill="#0a0a0b" />
            ))}
          </g>

          {/* spreader beam and twist-locks on the roof */}
          <Box at={[10, D / 2 - 3, H]} size={[L - 20, 6, 4]} tones={STEEL} />
          {[
            [4, 3],
            [L - 12, 3],
            [4, D - 11],
            [L - 12, D - 11],
          ].map(([x, y]) => (
            <Box key={`${x}-${y}`} at={[x, y, H]} size={[8, 8, 4]} tones={STEEL} />
          ))}
          {/* a hairline highlight along the roof edge */}
          <polyline points={pts([[0, D, H], [L, D, H], [L, 0, H]])} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.7" />
        </g>
      </g>
    </svg>
  )
}

export { HangingContainer }
