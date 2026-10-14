import { AmamaWordmark } from "@/components/brand/amama-wordmark"

/**
 * A MacBook drawn in CSS with the seller home inside it — a still of the
 * real layout (mist page, white cards, the four numbers, the pipeline),
 * not a screenshot, so it stays sharp at any size.
 */
function MacMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[980px] text-start" aria-hidden>
      {/* Lid */}
      <div className="relative rounded-[22px] bg-[#0f0f11] p-[1.6%] pt-[2.2%] ring-1 ring-black/40">
        <span className="absolute top-[0.9%] left-1/2 size-[0.7%] min-h-1 min-w-1 -translate-x-1/2 rounded-full bg-[#2a2a2e]" />
        <div className="overflow-hidden rounded-[10px] bg-[#f5f5f7]">
          <Screen />
        </div>
      </div>
      {/* Base */}
      <div className="relative mx-[-6%] h-[14px] rounded-b-[18px] bg-gradient-to-b from-[#d9d9de] to-[#a9a9b0] sm:h-[18px]">
        <span className="absolute top-0 left-1/2 h-[45%] w-[16%] -translate-x-1/2 rounded-b-[10px] bg-[#c4c4ca]" />
      </div>
    </div>
  )
}

function Screen() {
  const stats = [
    { label: "In our lots", value: "44 MT", tone: "#25b866", points: "0,22 12,18 24,20 36,12 48,14 60,6 72,9" },
    { label: "GRNs this month", value: "14", tone: "#8468e8", points: "0,20 12,16 24,18 36,10 48,16 60,9 72,12" },
    { label: "RFQs to quote", value: "3", tone: "#ea7e2c", points: "0,18 12,20 24,14 36,16 48,8 60,10 72,6" },
    { label: "Buyer enquiries", value: "23", tone: "#3b7be8", points: "0,22 12,19 24,16 36,17 48,11 60,9 72,4" },
  ]
  return (
    <div className="flex aspect-[16/10] w-full text-[#1d1d1f]">
      {/* Sidebar */}
      <div className="flex w-[17%] flex-col gap-[3%] p-[1.6%]">
        <div className="flex items-center gap-1.5 px-[6%] py-[5%] text-[#0b7a43]">
          <AmamaWordmark className="h-[7px] sm:h-[9px]" />
        </div>
        {["Home", "Messages", "Listings", "Buyers", "RFQs", "Contracts", "Orders", "Payments"].map((item, index) => (
          <div key={item} className={`rounded-[6px] px-[8%] py-[4%] text-[6px] sm:text-[8px] ${index === 0 ? "bg-[#25d366] font-semibold text-[#0b1f12]" : "text-[#1d1d1f]/70"}`}>
            {item}
          </div>
        ))}
      </div>
      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col gap-[2%] p-[1.6%] ps-0">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-tight sm:text-[15px]">Home</p>
          <div className="h-[10px] w-[34%] rounded-full bg-white sm:h-[16px]" />
        </div>
        <div className="grid grid-cols-4 gap-[1.6%]">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[8px] bg-white p-[6%]">
              <p className="truncate text-[5px] text-[#6e6e73] sm:text-[7px]">{stat.label}</p>
              <p className="text-[9px] font-semibold tracking-tight sm:text-[13px]">{stat.value}</p>
              <svg viewBox="0 0 72 26" className="mt-[4%] h-auto w-full">
                <polyline points={`${stat.points} 72,26 0,26`} fill={stat.tone} fillOpacity="0.14" stroke="none" />
                <polyline points={stat.points} fill="none" stroke={stat.tone} strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-[1.6%]">
          <div className="col-span-2 rounded-[10px] bg-white p-[3%]">
            <p className="text-[6px] font-semibold sm:text-[9px]">Deal pipeline</p>
            <svg viewBox="0 0 300 120" className="mt-[2%] h-auto w-full">
              {[
                ["#25b866", 0, 70, 60, 34],
                ["#3b7be8", 60, 52, 120, 40],
                ["#8468e8", 120, 48, 180, 46],
                ["#ea7e2c", 180, 50, 240, 52],
                ["#e04f86", 240, 54, 290, 56],
              ].map(([color, x1, y1, x2, y2], index) => (
                <g key={index}>
                  <path
                    d={`M${x1},${y1} C${Number(x1) + 30},${y1} ${Number(x2) - 30},${y2} ${x2},${y2} L${x2},${Number(y2) + 30 - index * 4} C${Number(x2) - 30},${Number(y2) + 30 - index * 4} ${Number(x1) + 30},${Number(y1) + 40 - index * 4} ${x1},${Number(y1) + 40 - index * 4} Z`}
                    fill={String(color)}
                    fillOpacity="0.22"
                  />
                  <rect x={Number(x2) - 3} y={Number(y2)} width="6" height={30 - index * 4} rx="2" fill={String(color)} />
                </g>
              ))}
              <rect x="-3" y="70" width="6" height="40" rx="2" fill="#25b866" />
            </svg>
          </div>
          <div className="flex flex-col gap-[4%] rounded-[10px] bg-white p-[4%]">
            <p className="text-[6px] font-semibold sm:text-[9px]">Up next</p>
            {["Sign contract", "Acknowledge PO", "Quote on an RFQ", "Raise invoice"].map((task, index) => (
              <div key={task} className="flex items-center gap-[6%] border-b border-[#ececf0] pb-[4%] last:border-0">
                <span className={`size-[10px] shrink-0 rounded-[3px] sm:size-[14px] ${index === 0 ? "bg-[#1d1d1f]" : "bg-[#f5f5f7]"}`} />
                <span className="truncate text-[5px] sm:text-[7.5px]">{task}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-[1.6%]">
          <div className="rounded-[10px] bg-white p-[4%]">
            <p className="text-[6px] font-semibold sm:text-[9px]">Received at Mumbai</p>
            <svg viewBox="0 0 120 60" className="mt-[4%] h-auto w-full">
              <defs>
                <pattern id="mock-stripe" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="4" height="4" fill="#3b7be8" fillOpacity="0.25" />
                  <line x1="0" y1="0" x2="0" y2="4" stroke="#3b7be8" strokeWidth="2" />
                </pattern>
              </defs>
              {[30, 42, 26, 48, 36, 52, 40, 58].map((height, index) => (
                <rect key={index} x={4 + index * 14.5} y={60 - height} width="9" height={height} rx="2.5" fill="url(#mock-stripe)" />
              ))}
              <polyline points="8,34 22,26 37,38 51,20 66,30 80,16 95,24 109,10" fill="none" stroke="#ea7e2c" strokeWidth="1.4" strokeDasharray="3 2" />
            </svg>
          </div>
          <div className="rounded-[10px] bg-white p-[4%]">
            <p className="text-[6px] font-semibold sm:text-[9px]">Enquiries by product</p>
            <svg viewBox="0 0 120 64" className="mt-[4%] h-auto w-full">
              {[
                ["#25b866", 52, 0.82],
                ["#3b7be8", 42, 0.64],
                ["#8468e8", 32, 0.5],
                ["#ea7e2c", 22, 0.34],
              ].map(([color, radius, share], index) => {
                const r = Number(radius)
                const angle = Math.PI * (1 - Number(share))
                return (
                  <g key={index} fill="none" strokeLinecap="round" strokeWidth="6">
                    <path d={`M${60 - r},60 A${r},${r} 0 0 1 ${60 + r},60`} stroke="#f0f0f3" />
                    <path d={`M${60 - r},60 A${r},${r} 0 0 1 ${(60 + r * Math.cos(angle)).toFixed(1)},${(60 - r * Math.sin(angle)).toFixed(1)}`} stroke={String(color)} />
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="rounded-[10px] bg-white p-[4%]">
            <p className="text-[6px] font-semibold sm:text-[9px]">Stock by grade</p>
            <svg viewBox="0 0 120 64" className="mt-[4%] h-auto w-full">
              {[
                ["#25b866", 0, 0.44],
                ["#3b7be8", 0.46, 0.74],
                ["#ea7e2c", 0.76, 0.9],
                ["#e04f86", 0.92, 0.98],
              ].map(([color, from, to], index) => {
                const a0 = Number(from) * Math.PI * 2 - Math.PI / 2
                const a1 = Number(to) * Math.PI * 2 - Math.PI / 2
                const point = (angle: number) => `${(60 + 26 * Math.cos(angle)).toFixed(1)},${(32 + 26 * Math.sin(angle)).toFixed(1)}`
                return <path key={index} d={`M${point(a0)} A26,26 0 ${Number(to) - Number(from) > 0.5 ? 1 : 0} 1 ${point(a1)}`} fill="none" stroke={String(color)} strokeWidth="9" strokeLinecap="round" />
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

export { MacMockup }
