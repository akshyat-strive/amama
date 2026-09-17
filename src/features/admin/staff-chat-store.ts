"use client"

import * as React from "react"

const STORAGE_KEY = "amama.admin.staffChat"

/** `role` is directory metadata only (the sender's role NAME, e.g. "KAM",
 *  "Compliance") — nothing here ever branches on its value, only `.id`/
 *  `.name` are read when rendering a message. */
export type StaffChatSender = { id: string; name: string; role: string }

export type StaffChatMessage = {
  id: string
  channelId: string
  from: StaffChatSender
  text: string
  mentions: string[]
  at: string
}

export const STAFF_GROUP_CHANNEL_ID = "group"
export const STAFF_ANNOUNCEMENTS_CHANNEL_ID = "announcements"

/** Sorted-pair key so both sides of a DM land in the same channel — a
 *  single fixed "the other party's id" key breaks the moment a third admin
 *  exists, since Master's DM-with-Priya and Arjun's DM-with-Priya would
 *  otherwise collide on the same channel while Priya's own DM-with-Arjun
 *  lived somewhere else entirely. */
function staffDmChannelId(userIdA: string, userIdB: string) {
  return `dm:${[userIdA, userIdB].sort().join(":")}`
}

/*
 * Same external-store shape as every other feature store here. All three
 * "kinds" of channel (a 1:1 DM, the shared group, the announcements feed)
 * are just different `channelId` strings in one flat map — the difference
 * between them is entirely a UI concern (whether a KAM's composer shows
 * up on a given channel), not something the store itself needs to know.
 */
const emptySnapshot: Record<string, StaffChatMessage[]> = {}
let snapshot: Record<string, StaffChatMessage[]> = emptySnapshot
let restored = false
const listeners = new Set<() => void>()
const emptyChannel: StaffChatMessage[] = []

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) snapshot = JSON.parse(raw)
  } catch {
    // Private mode or blocked storage — carry on with nothing sent yet.
  }
}

function subscribe(listener: () => void) {
  restoreOnce()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  restoreOnce()
  return snapshot
}

function getServerSnapshot() {
  return emptySnapshot
}

function write(next: Record<string, StaffChatMessage[]>) {
  snapshot = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

function useStaffChannel(channelId: string): StaffChatMessage[] {
  const store = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return store[channelId] ?? emptyChannel
}

/** The whole store, keyed by channel — for a chat list that wants to show
 *  a last-message preview per row without a `useStaffChannel` call per
 *  row (hooks can't run inside a `.map`). */
function useStaffChatStore(): Record<string, StaffChatMessage[]> {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Which candidates' names actually appear as `@Name` in the text —
 *  longest name first, so "Priya Nair" matches before a shorter name that
 *  happens to be a prefix of it would. Pure and roster-independent: the
 *  caller (the chat view) supplies whichever candidates are relevant. */
function parseMentions(text: string, candidates: { id: string; name: string }[]): string[] {
  const sorted = [...candidates].sort((a, b) => b.name.length - a.name.length)
  const lowerText = text.toLowerCase()
  return sorted
    .filter((candidate) => lowerText.includes(`@${candidate.name.toLowerCase()}`))
    .map((candidate) => candidate.id)
}

function sendStaffMessage(
  channelId: string,
  from: StaffChatSender,
  text: string,
  mentions: string[] = []
): StaffChatMessage {
  restoreOnce()
  const message: StaffChatMessage = {
    id: `staffmsg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    channelId,
    from,
    text,
    mentions,
    at: new Date().toISOString(),
  }
  const existing = snapshot[channelId] ?? []
  write({ ...snapshot, [channelId]: [...existing, message] })
  return message
}

/** Seeds a fixed batch of channel messages, but only if the store is
 *  genuinely empty — see `seed-data.ts`. */
function seedStaffChatIfEmpty(byChannel: Record<string, StaffChatMessage[]>) {
  restoreOnce()
  if (Object.keys(snapshot).length > 0) return
  write(byChannel)
}

export {
  useStaffChannel,
  useStaffChatStore,
  parseMentions,
  sendStaffMessage,
  seedStaffChatIfEmpty,
  staffDmChannelId,
}
