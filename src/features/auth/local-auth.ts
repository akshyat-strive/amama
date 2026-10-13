"use client"

import { DEMO_PASSWORD, SEED_STAFF } from "@/features/admin/staff-seed"
import { createPersistentStore } from "@/features/local-db/persistent-store"
import { SEED_BUYER_PROFILES, SEED_SELLER_PROFILES } from "@/features/verification/kyc-seed"

export type AccountKind = "admin" | "buyer" | "seller"

/**
 * A sign-in, kept in this browser. Passwords are stored as typed — this
 * is a client demo with no server to hash against, and every seeded
 * account shares `DEMO_PASSWORD` anyway.
 */
export type Account = {
  /** The email, lower-cased — every other store keys people by it. */
  id: string
  kind: AccountKind
  email: string
  password: string
  name: string
  createdAt: string
}

export type Session = { accountId: string; kind: AccountKind; at: string }

const SEEDED_AT = "2026-06-01T09:00:00.000Z"

function seedAccounts(): Account[] {
  const account = (kind: AccountKind, email: string, name: string): Account => ({
    id: email,
    kind,
    email,
    password: DEMO_PASSWORD,
    name,
    createdAt: SEEDED_AT,
  })
  return [
    ...SEED_STAFF.map((member) => account("admin", member.email, member.name)),
    ...SEED_BUYER_PROFILES.map((buyer) => account("buyer", buyer.email, buyer.fullName)),
    ...SEED_SELLER_PROFILES.map((seller) => account("seller", seller.email, seller.fullName)),
  ]
}

const accountsStore = createPersistentStore<Account[]>("amama.auth.accounts", seedAccounts, [])
const sessionStore = createPersistentStore<Session | null>("amama.auth.session", () => null, null)

const normalise = (email: string) => email.trim().toLowerCase()

type Result = { ok: true; account: Account } | { ok: false; error: string; reason: "no-account" | "wrong-kind" | "wrong-password" | "exists" }

const KIND_LABEL: Record<AccountKind, string> = { admin: "a team", buyer: "a buyer", seller: "a seller" }

function findAccount(email: string) {
  return accountsStore.get().find((account) => account.id === normalise(email)) ?? null
}

function startSession(account: Account) {
  sessionStore.set({ accountId: account.id, kind: account.kind, at: new Date().toISOString() })
}

/** Checks the email and password against this browser's accounts and,
 *  if they match, starts a session. */
function signIn(email: string, password: string, kind: AccountKind): Result {
  const account = findAccount(email)
  if (!account) return { ok: false, reason: "no-account", error: "There's no account with that email." }
  if (account.kind !== kind) {
    return { ok: false, reason: "wrong-kind", error: `That email belongs to ${KIND_LABEL[account.kind]} account.` }
  }
  if (account.password !== password) return { ok: false, reason: "wrong-password", error: "That password isn't right." }
  startSession(account)
  return { ok: true, account }
}

/** Creates an account without signing into it — Team adding a colleague. */
function createAccount(input: { kind: AccountKind; email: string; password: string; name: string }): Result {
  if (findAccount(input.email)) return { ok: false, reason: "exists", error: "An account with that email already exists — log in instead." }
  const account: Account = {
    id: normalise(input.email),
    kind: input.kind,
    email: normalise(input.email),
    password: input.password,
    name: input.name.trim() || normalise(input.email).split("@")[0],
    createdAt: new Date().toISOString(),
  }
  accountsStore.set((accounts) => [...accounts, account])
  return { ok: true, account }
}

/** Creates an account and signs straight into it. */
function signUp(input: { kind: AccountKind; email: string; password: string; name: string }): Result {
  const result = createAccount(input)
  if (result.ok) startSession(result.account)
  return result
}

function signOut() {
  sessionStore.set(null)
}

function removeAccount(email: string) {
  accountsStore.set((accounts) => accounts.filter((account) => account.id !== normalise(email)))
}

function renameAccount(email: string, name: string) {
  accountsStore.set((accounts) => accounts.map((account) => (account.id === normalise(email) ? { ...account, name } : account)))
}

/** The signed-in session, or null. Check `useSessionLoaded()` before
 *  treating null as "signed out" — the server render can't see storage. */
function useSession(): Session | null {
  return sessionStore.use()
}

const useSessionLoaded = sessionStore.useLoaded

function getSession() {
  return sessionStore.get()
}

export { signIn, signUp, createAccount, signOut, findAccount, removeAccount, renameAccount, useSession, useSessionLoaded, getSession, normalise }
