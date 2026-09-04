"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  WheelPicker,
  WheelPickerGroup,
  type WheelPickerOption,
} from "@/components/ui/wheel-picker"

export type DateParts = { day: number; month: number; year: number }

/** Field order varies by locale; trade docs outside the US read D/M/Y. */
export type DateOrder = "DMY" | "MDY" | "YMD"

function daysInMonth(month: number, year: number) {
  // Day 0 of the next month is the last day of this one — leap years included.
  return new Date(year, month, 0).getDate()
}

function monthOptions(locale: string): WheelPickerOption[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: "long" })
  return Array.from({ length: 12 }, (_, index) => {
    const label = formatter.format(new Date(2000, index, 1))
    return { value: index + 1, label }
  })
}

function range(from: number, to: number): WheelPickerOption[] {
  const step = from <= to ? 1 : -1
  const length = Math.abs(to - from) + 1
  return Array.from({ length }, (_, i) => {
    const value = from + i * step
    return { value, label: String(value) }
  })
}

type DateOfBirthPickerProps = {
  value: DateParts
  onValueChange: (value: DateParts) => void
  /** Youngest permitted age. Trade accounts are adults-only. */
  minAge?: number
  /** Oldest plausible age, bounding the year column. */
  maxAge?: number
  order?: DateOrder
  locale?: string
  className?: string
}

function DateOfBirthPicker({
  value,
  onValueChange,
  minAge = 18,
  maxAge = 100,
  order = "DMY",
  locale = "en",
  className,
}: DateOfBirthPickerProps) {
  const thisYear = new Date().getFullYear()
  const newestYear = thisYear - minAge
  const oldestYear = thisYear - maxAge

  const months = React.useMemo(() => monthOptions(locale), [locale])
  // Newest first: a 20-something reaches their year in a flick rather than
  // scrolling through eight decades.
  const years = React.useMemo(
    () => range(newestYear, oldestYear),
    [newestYear, oldestYear]
  )
  const days = React.useMemo(
    () => range(1, daysInMonth(value.month, value.year)),
    [value.month, value.year]
  )

  /** Keep the day legal when the month or year shrinks under it. */
  const commit = (next: DateParts) => {
    const cap = daysInMonth(next.month, next.year)
    onValueChange({ ...next, day: Math.min(next.day, cap) })
  }

  const columns: Record<DateOrder, React.ReactNode[]> = {
    DMY: [dayColumn(), monthColumn(), yearColumn()],
    MDY: [monthColumn(), dayColumn(), yearColumn()],
    YMD: [yearColumn(), monthColumn(), dayColumn()],
  }

  function dayColumn() {
    return (
      <WheelPicker
        key="day"
        label="Day"
        options={days}
        value={value.day}
        onValueChange={(day) => commit({ ...value, day })}
      />
    )
  }

  function monthColumn() {
    return (
      <WheelPicker
        key="month"
        grow
        label="Month"
        options={months}
        value={value.month}
        onValueChange={(month) => commit({ ...value, month })}
      />
    )
  }

  function yearColumn() {
    return (
      <WheelPicker
        key="year"
        label="Year"
        options={years}
        value={value.year}
        onValueChange={(year) => commit({ ...value, year })}
      />
    )
  }

  const readable = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
  }).format(new Date(value.year, value.month - 1, value.day))

  return (
    <div className={cn("w-full", className)}>
      <WheelPickerGroup>{columns[order]}</WheelPickerGroup>
      {/* One calm announcement of the whole date, so screen reader users are
          not left stitching three spinbuttons together. */}
      <p aria-live="polite" className="sr-only">
        Date of birth: {readable}
      </p>
    </div>
  )
}

export { DateOfBirthPicker, daysInMonth }
