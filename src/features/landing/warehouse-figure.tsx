import { AMAMA_PATH } from "@/components/brand/amama-wordmark"

/**
 * The Mumbai DC, drawn isometric and cut away: trucks back in at the dock,
 * lots ride the conveyor to weighing and QC, a forklift takes them down
 * the aisle to the racks, and dispatch loads the container. Solid shaded
 * boxes in four tones with hairline edges, painted back to front. The
 * conveyor, the forklift and the QC screen all move.
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

type Tones = { top: string; left: string; right: string }

const WHITE: Tones = { top: "#ffffff", left: "#ececf0", right: "#dadade" }
const MIST: Tones = { top: "#f5f5f7", left: "#e6e6ea", right: "#d4d4d9" }
const FLOOR: Tones = { top: "#eeeef1", left: "#dcdce1", right: "#c9c9cf" }
const INK: Tones = { top: "#3a3a3d", left: "#2a2a2c", right: "#1d1d1f" }
const STEEL: Tones = { top: "#a7a7ad", left: "#85858b", right: "#66666c" }
const LIME: Tones = { top: "#25d366", left: "#1ebe5a", right: "#128c7e" }
const KRAFT: Tones = { top: "#ecd2a6", left: "#d8b985", right: "#c3a36f" }
const WOOD: Tones = { top: "#d2b080", left: "#b8946a", right: "#9e7b52" }
const BEAM: Tones = { top: "#7fb0ff", left: "#3b7be8", right: "#2f69cf" }

const CRATES: Tones[] = [
  KRAFT,
  { top: "#9cc2ff", left: "#5b95f5", right: "#3b7be8" },
  KRAFT,
  { top: "#ffc28f", left: "#f99a4f", right: "#ea7e2c" },
  { top: "#c8b8ff", left: "#9e86f4", right: "#8468e8" },
  KRAFT,
  { top: "#9ae6b4", left: "#4fcf82", right: "#25b866" },
  { top: "#f8a5c2", left: "#ef6f9f", right: "#e04f86" },
]

type Box = { at: Pt; size: Pt; tones: Tones }

function BoxShape({ at: [x, y, z], size: [w, d, h], tones }: Box) {
  return (
    <g stroke="#1d1d1f" strokeOpacity="0.5" strokeWidth="0.5" strokeLinejoin="round">
      <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={tones.left} />
      <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={tones.right} />
      <polygon points={pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={tones.top} />
    </g>
  )
}

function depth(box: Box) {
  return box.at[0] + box.size[0] / 2 + box.at[1] + box.size[1] / 2 + box.at[2] * 0.02
}

/** A pallet with a stack of cartons on it. */
function pallet(x: number, y: number, z: number, crate = 0, levels = 2): Box[] {
  const boxes: Box[] = [{ at: [x, y, z], size: [14, 14, 3], tones: WOOD }]
  for (let level = 0; level < levels; level++) {
    boxes.push({ at: [x + 1, y + 1, z + 3 + level * 8], size: [12, 12, 8], tones: CRATES[(crate + level * 3) % CRATES.length] })
  }
  return boxes
}

const FLOOR_W = 232
const FLOOR_D = 150
const WALL_H = 46
const AISLE = 66

/** A rack: three uprights, two beams, and cartons on the shelves. */
function rack(x: number, y: number, seed: number): Box[] {
  const length = 60
  const depthY = 14
  const boxes: Box[] = []
  for (const px of [0, length / 2 - 1.5, length - 3]) {
    boxes.push({ at: [x + px, y + depthY - 3, 4], size: [3, 3, 42], tones: INK })
    boxes.push({ at: [x + px, y, 4], size: [3, 3, 42], tones: INK })
  }
  for (const z of [10, 26, 42]) {
    boxes.push({ at: [x, y + depthY - 2, z], size: [length, 2, 2], tones: BEAM })
    boxes.push({ at: [x, y, z], size: [length, 2, 2], tones: BEAM })
  }
  for (const [row, z] of [10, 26].entries()) {
    for (let bay = 0; bay < 4; bay++) {
      if ((seed + bay * 3 + row * 5) % 7 === 0) continue
      boxes.push({ at: [x + 3 + bay * 14, y + 2, z + 2], size: [11, 10, 12], tones: CRATES[(seed + bay + row * 2) % CRATES.length] })
    }
  }
  return boxes
}

/** Walls in short segments so back-to-front order stays honest. */
function walls(): Box[] {
  const boxes: Box[] = []
  for (let x = 0; x < FLOOR_W; x += 29) {
    boxes.push({ at: [x, 0, 4], size: [Math.min(29, FLOOR_W - x), 4, WALL_H], tones: WHITE })
  }
  for (let y = 4; y < FLOOR_D; y += 23) {
    const h = Math.min(23, FLOOR_D - y)
    // the dock opening, where the truck backs in
    if (y + h > AISLE - 18 && y < AISLE + 18) continue
    boxes.push({ at: [0, y, 4], size: [4, h, WALL_H], tones: WHITE })
  }
  // lintel over the opening, and a lime door frame
  boxes.push({ at: [0, AISLE - 18, 4 + 32], size: [4, 36, WALL_H - 32], tones: WHITE })
  boxes.push({ at: [0, AISLE - 19, 4], size: [5, 2, 32], tones: LIME })
  boxes.push({ at: [0, AISLE + 17, 4], size: [5, 2, 32], tones: LIME })
  return boxes
}

type LabelSpec = { n: string; title: string; detail: string; at: Pt; row: 0 | 1 }

const LABELS: LabelSpec[] = [
  { n: "01", title: "Inbound", detail: "Trucks logged at the dock", at: [-24, AISLE, 30], row: 0 },
  { n: "02", title: "Weigh & QC", detail: "GRN issued on the spot", at: [124, AISLE, 30], row: 1 },
  { n: "03", title: "Storage", detail: "Every lot, by rack", at: [176, 22, 46], row: 0 },
  { n: "04", title: "Outbound", detail: "Containers loaded, tracked", at: [262, AISLE, 30], row: 1 },
]

function WarehouseFigure() {
  // Ground outside the walls, and the truck that's backing in.
  const apron: Box = { at: [-78, AISLE - 28, 0], size: [78, 56, 2], tones: MIST }
  const truck: Box[] = [
    { at: [-54, AISLE - 12, 2], size: [46, 24, 24], tones: WHITE },
    { at: [-70, AISLE - 11, 2], size: [16, 22, 16], tones: INK },
    { at: [-72, AISLE - 9, 12], size: [3, 18, 6], tones: STEEL },
  ]

  // The dispatch container, outside the right-hand side.
  const container: Box[] = [
    { at: [FLOOR_W + 4, AISLE - 18, 0], size: [76, 36, 2], tones: MIST },
    { at: [FLOOR_W + 8, AISLE - 12, 2], size: [66, 24, 34], tones: { top: "#9cc2ff", left: "#5b95f5", right: "#3b7be8" } },
  ]

  const body = ([
    ...pallet(12, AISLE - 22, 4, 0),
    ...pallet(12, AISLE + 8, 4, 3, 1),
    // conveyor
    { at: [44, AISLE - 7, 0], size: [52, 14, 6], tones: INK },
    { at: [44, AISLE - 5, 6], size: [52, 10, 2], tones: { top: "#58585c", left: "#444447", right: "#333336" } },
    // scale and the QC screen
    { at: [106, AISLE - 14, 0], size: [26, 28, 5], tones: STEEL },
    ...pallet(112, AISLE - 7, 5, 4),
    { at: [136, AISLE + 14, 0], size: [3, 3, 22], tones: INK },
    { at: [128, AISLE + 12, 20], size: [16, 3, 11], tones: LIME },
    // racks, two behind the aisle and two in front
    ...rack(158, 10, 1),
    ...rack(158, 30, 4),
    ...rack(158, 108, 6),
    // dispatch staging
    ...pallet(218, AISLE - 22, 4, 5),
    ...pallet(218, AISLE + 8, 4, 2),
  ] as Box[]).sort((a, b) => depth(a) - depth(b))

  // The things that move are layered so the racks beside them stay in
  // front of the aisle: the forklift sits between the back racks and front.
  const back = body.filter((box) => !(box.at[0] >= 150 && box.at[1] >= 100))
  const front = body.filter((box) => box.at[0] >= 150 && box.at[1] >= 100)

  const forkX = 140
  const forkY = AISLE - 5
  const fork = [
    { at: [forkX, forkY, 4], size: [16, 10, 8], tones: LIME },
    { at: [forkX + 3, forkY + 1, 12], size: [9, 8, 2], tones: INK },
    { at: [forkX + 16, forkY + 3, 4], size: [2, 4, 24], tones: INK },
    { at: [forkX + 18, forkY + 1, 5], size: [12, 2, 1.5], tones: STEEL },
    { at: [forkX + 18, forkY + 7, 5], size: [12, 2, 1.5], tones: STEEL },
    { at: [forkX + 19, forkY + 1.5, 7], size: [10, 7, 8], tones: CRATES[1] },
  ] as Box[]
  const forkTravel = 84
  const [forkDx, forkDy] = [forkTravel * C, forkTravel * S]

  const beltTravel = 44
  const [beltDx, beltDy] = [beltTravel * C, beltTravel * S]

  const corners = [...walls(), ...body, ...truck, ...container, apron].flatMap(({ at: [x, y, z], size: [w, d, h] }) =>
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
  const floorCorners = ([[0, 0, 0], [FLOOR_W, 0, 0], [0, FLOOR_D, 0], [FLOOR_W, FLOOR_D, 0]] as Pt[]).map(project)
  const all = [...corners, ...floorCorners]
  const xs = all.map(([px]) => px)
  const ys = all.map(([, py]) => py)
  const minX = Math.min(...xs) - 20
  const maxX = Math.max(...xs) + 20
  const sceneTop = Math.min(...ys)
  const minY = sceneTop - 76
  const maxY = Math.max(...ys) + 18

  const wallPlane = `matrix(${C} ${S} 0 -1 ${(-4 * C).toFixed(3)} ${(4 * S).toFixed(3)})`
  const k = 70 / 5053

  return (
    <svg
      viewBox={`${minX.toFixed(0)} ${minY.toFixed(0)} ${(maxX - minX).toFixed(0)} ${(maxY - minY).toFixed(0)}`}
      role="img"
      aria-labelledby="warehouse-title"
      className="h-auto w-full"
    >
      <title id="warehouse-title">
        The amama warehouse in Mumbai: trucks unload at the dock, lots ride the conveyor to weighing and quality control where a GRN is issued, a forklift carries them to the racks, and containers are loaded for dispatch.
      </title>

      {/* ground and floor */}
      <BoxShape {...apron} />
      <BoxShape at={[0, 0, 0]} size={[FLOOR_W, FLOOR_D, 4]} tones={FLOOR} />
      {/* the lot's route, marked on the floor */}
      <polyline
        className="route"
        points={pts([[-8, AISLE, 4], [FLOOR_W + 8, AISLE, 4]])}
        fill="none"
        stroke={LIME.top}
        strokeWidth="1.3"
        strokeDasharray="4 7"
        strokeLinecap="round"
      />

      {truck.map((box, index) => (
        <BoxShape key={`t${index}`} {...box} />
      ))}
      {walls().map((box, index) => (
        <BoxShape key={`w${index}`} {...box} />
      ))}
      {/* the name on the back wall */}
      <g transform={wallPlane}>
        <g transform={`translate(34 ${WALL_H / 2 + 8}) scale(${k} ${-k})`}>
          <path d={AMAMA_PATH} fill="#1d1d1f" fillOpacity="0.85" />
        </g>
        <rect x={34} y={WALL_H / 2 - 4} width="70" height="1.4" fill={LIME.top} />
      </g>

      {back.map((box, index) => (
        <BoxShape key={`b${index}`} {...box} />
      ))}

      {/* cartons riding the conveyor */}
      {[0, 1, 2].map((index) => (
        <g key={`belt${index}`}>
          <animateMotion dur="5.4s" begin={`${-index * 1.8}s`} repeatCount="indefinite" path={`M0,0 L${beltDx.toFixed(1)},${beltDy.toFixed(1)}`} />
          <BoxShape at={[46, AISLE - 4, 8]} size={[9, 8, 7]} tones={CRATES[(index * 2 + 1) % CRATES.length]} />
        </g>
      ))}

      {/* the forklift, up and down the aisle */}
      <g>
        <animateMotion dur="12s" repeatCount="indefinite" path={`M0,0 L${forkDx.toFixed(1)},${forkDy.toFixed(1)} L0,0`} />
        {fork.map((box, index) => (
          <BoxShape key={`f${index}`} {...box} />
        ))}
      </g>

      {front.map((box, index) => (
        <BoxShape key={`r${index}`} {...box} />
      ))}
      {container.map((box, index) => (
        <BoxShape key={`c${index}`} {...box} />
      ))}
      {/* ribs and a lime stripe on the container's long side */}
      <g transform={`matrix(${C} ${S} 0 -1 ${(-(AISLE + 12) * C).toFixed(3)} ${((AISLE + 12) * S).toFixed(3)})`}>
        <g stroke="#2f69cf" strokeOpacity="0.7" strokeWidth="1">
          {Array.from({ length: 15 }, (_, index) => FLOOR_W + 12 + index * 4.2).map((x) => (
            <line key={x} x1={x} y1="6" x2={x} y2="34" />
          ))}
        </g>
        <rect x={FLOOR_W + 8} y="2" width="66" height="2.6" fill="#1d1d1f" fillOpacity="0.35" />
        <rect x={FLOOR_W + 24} y="17" width="34" height="1.6" fill={LIME.top} />
      </g>

      {/* the QC screen: a live GRN */}
      {(() => {
        const [px, py] = project([136, AISLE + 11, 32])
        return (
          <g>
            <circle cx={px} cy={py} r="3" fill={LIME.top} fillOpacity="0.28">
              <animate attributeName="r" values="2.5;7;2.5" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx={px} cy={py} r="1.8" fill={LIME.top} stroke="#fff" strokeWidth="0.8" />
          </g>
        )
      })()}

      {/* labels, on two rows so neighbours never touch */}
      {LABELS.map((label, index) => {
        const [px, py] = project(label.at)
        const rowY = sceneTop - (label.row === 0 ? 58 : 24)
        return (
          <g key={label.n} className="iso-label wh-label" style={{ animationDelay: `${300 + index * 140}ms` }}>
            <circle cx={px} cy={py} r="1.8" fill="#1d1d1f" />
            <line x1={px} y1={py - 2} x2={px} y2={rowY + 13} stroke="#1d1d1f" strokeOpacity="0.32" strokeWidth="0.6" />
            <text x={px} y={rowY} textAnchor="middle" fontSize="9.5" fill="#1d1d1f">
              <tspan fill="#6e6e73">{label.n} </tspan>
              <tspan fontWeight="600">{label.title}</tspan>
            </text>
            <text x={px} y={rowY + 10} textAnchor="middle" fontSize="7.5" fill="#6e6e73">
              {label.detail}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export { LABELS as WAREHOUSE_STAGES, WarehouseFigure }
