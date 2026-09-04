import type { LucideIcon } from "lucide-react"

/** Placeholder body for a nav destination that's linked but not built yet. */
function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-amama-subtle text-amama-deep">
        <Icon className="size-5" strokeWidth={2.25} />
      </span>
      <h1 className="text-[19px] font-bold">{title}</h1>
      <p className="max-w-xs text-[14px] leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

export { ComingSoon }
