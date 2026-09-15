"use client"

import * as React from "react"

const STORAGE_KEY = "amama.admin.staffChat"

export type StaffChatSender = { id: string; name: string; role: "kam" | "master" }

export type StaffChatMessage = {
  id: string
  channelId: string
  from: StaffChatSender
  text: string
  mentions: string[]
  at: string
}

export const MASTER_ADMIN_MENTION_CANDIDATE = { id: "master-admin", name: "Master Admin" }
export const STAFF_GROUP_CHANNEL_ID = "group"
export const STAFF_ANNOUNCEMENTS_CHANNEL_ID = "announcements"

function staffDmChannelId(kamId: string) {
  return `dm:${kamId}`
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

export {
  useStaffChannel,
  parseMentions,
  sendStaffMessage,
  staffDmChannelId,
}
