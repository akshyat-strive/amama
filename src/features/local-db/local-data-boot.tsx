"use client"

import { ensureSeedVersion } from "@/features/local-db/seed-version"

// Runs as soon as the client bundle loads — before any store reads its
// key — so an outdated seed generation is cleared first.
if (typeof window !== "undefined") ensureSeedVersion()

/** Mounted once in the root layout; renders nothing. */
function LocalDataBoot() {
  return null
}

export { LocalDataBoot }
