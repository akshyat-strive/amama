"use client"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { InputGroupAddon } from "@/components/ui/input-group"
import { useI18n } from "@/features/i18n/i18n-context"
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
  placeholder,
}: {
  id?: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}) {
  const { t } = useI18n()
  const selected = countries.find((country) => country.code === value) ?? null

  return (
    <Combobox
      items={countries}
      value={selected}
      onValueChange={(item: Country | null) => onValueChange(item?.code ?? "")}
      // The first matching item is highlighted as soon as the list opens or
      // the query changes, so Enter always commits something sensible
      // instead of requiring an arrow-key press first.
      autoHighlight
      // Plain country name only — this is what shows in the closed input,
      // and the flag has no business being part of the *text value* (it's
      // rendered as its own trailing addon below, outside the input).
      itemToStringLabel={(item: Country) => item.name}
      isItemEqualToValue={(a: Country, b: Country) => a.code === b.code}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder ?? t("onboarding.country.placeholder")}
        // The wrapped fields elsewhere in this flow have no focus ring — this
        // one shouldn't grow one either just because it's built on top of
        // shadcn's InputGroup, which rings by default on focus.
        className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 shadow-none has-[[data-slot=input-group-control]:focus-visible]:border-transparent has-[[data-slot=input-group-control]:focus-visible]:ring-0 [&_[data-slot=input-group-control]]:h-auto [&_[data-slot=input-group-control]]:p-0 [&_[data-slot=input-group-control]]:text-[15px]"
      >
        {/* The selected country's flag — a decorative echo of the text,
            never part of the input's own value, so copying or reading the
            field back never picks up an emoji glued to the name. Ordered
            after the built-in chevron/clear addon, so it sits at the very
            end. */}
        {selected ? (
          <InputGroupAddon align="inline-end" className="pe-0">
            <span aria-hidden className="text-base leading-none">
              {countryCodeToFlag(selected.code)}
            </span>
          </InputGroupAddon>
        ) : null}
      </ComboboxInput>
      <ComboboxContent>
        <ComboboxEmpty>{t("onboarding.country.empty")}</ComboboxEmpty>
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
