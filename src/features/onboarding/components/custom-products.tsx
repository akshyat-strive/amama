"use client"

import * as React from "react"
import { PlusIcon, XIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { productLabel, slugify } from "@/features/marketplace/catalog"

/**
 * The catalog can never list every crop someone trades. Anything typed
 * here is stored as a slugified id — the same convention a seller's custom
 * listing already uses — so a buyer's "Moringa" and a seller's "moringa"
 * listing meet in the marketplace without any mapping table.
 */
function CustomProducts({
  custom,
  onAdd,
  onRemove,
  placeholder = "Add a product that isn't listed",
}: {
  /** The custom product ids already picked. */
  custom: string[]
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  placeholder?: string
}) {
  const [name, setName] = React.useState("")
  const id = slugify(name)
  const canAdd = name.trim().length >= 2 && !custom.includes(id)

  const add = () => {
    if (!canAdd) return
    onAdd(id)
    setName("")
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          add()
        }}
      >
        <label className="sr-only" htmlFor="custom-product">
          {placeholder}
        </label>
        <Input
          id="custom-product"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={placeholder}
          className="h-11 rounded-2xl"
        />
        <button
          type="submit"
          disabled={!canAdd}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-2xl border border-border bg-card px-4 text-[14px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40"
        >
          <PlusIcon aria-hidden className="size-4" />
          Add
        </button>
      </form>
      {custom.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Your own products">
          {custom.map((entry) => (
            <li key={entry}>
              <span className="inline-flex h-9 items-center gap-1 rounded-full border border-amama-deep bg-amama-subtle ps-3.5 pe-1 text-[13.5px] font-medium text-amama-deep">
                {productLabel(entry)}
                <button
                  type="button"
                  onClick={() => onRemove(entry)}
                  aria-label={`Remove ${productLabel(entry)}`}
                  className="grid size-7 place-items-center rounded-full hover:bg-amama-deep/10"
                >
                  <XIcon aria-hidden className="size-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export { CustomProducts }
