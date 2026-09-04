"use client"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  countries,
  countryCodeToFlag,
  type Country,
} from "@/features/onboarding/countries"

/**
 * A searchable country picker — with ~170 countries, nobody should have to
 * scroll to find theirs. Base UI's `Combobox` filters by `itemToStringLabel`
 * as you type; selection is tracked as the full `Country` object internally
 * and reduced to just the ISO code for the draft, via `isItemEqualToValue`.
 */
function CountryCombobox({
  id,
  value,
  onValueChange,
  placeholder = "Search for a country",
}: {
  id?: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}) {
  const selected = countries.find((country) => country.code === value) ?? null

  return (
    <Combobox
      items={countries}
      value={selected}
      onValueChange={(item: Country | null) => onValueChange(item?.code ?? "")}
      // Flag + name together as one string — this is what actually shows in
      // the closed input, so the flag needs to live here, not just on the
      // dropdown item (which only ever renders while the list is open).
      itemToStringLabel={(item: Country) =>
        `${countryCodeToFlag(item.code)} ${item.name}`
      }
      isItemEqualToValue={(a: Country, b: Country) => a.code === b.code}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        // The wrapped fields elsewhere in this flow have no focus ring — this
        // one shouldn't grow one either just because it's built on top of
        // shadcn's InputGroup, which rings by default on focus.
        className="h-auto w-full min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 shadow-none has-[[data-slot=input-group-control]:focus-visible]:border-transparent has-[[data-slot=input-group-control]:focus-visible]:ring-0 [&_[data-slot=input-group-control]]:h-auto [&_[data-slot=input-group-control]]:p-0 [&_[data-slot=input-group-control]]:text-[15px]"
      />
      <ComboboxContent>
        <ComboboxEmpty>No countries found.</ComboboxEmpty>
        <ComboboxList>
          {(country: Country) => (
            <ComboboxItem key={country.code} value={country}>
              <span aria-hidden>{countryCodeToFlag(country.code)}</span>
              {country.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export { CountryCombobox }
