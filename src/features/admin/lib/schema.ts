import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { appUsers } from "@/features/identity/lib/schema"
import type { RolePermissions } from "@/features/admin/permissions"

/** Straight port of `role-store.ts` — same 4 system roles seeded once
 *  (`master-admin`/`master-kam`/`kam`/`compliance`), same
 *  `RolePermissions` shape, just `jsonb` instead of a `localStorage` blob. */
const roles = pgTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  permissions: jsonb("permissions").$type<RolePermissions>().notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

const adminProfiles = pgTable("admin_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  roleId: text("role_id")
    .notNull()
    .references(() => roles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by"),
})

/** Port of `staff-chat-store.ts` — one flat table for the group channel,
 *  the announcements feed, and every 1:1 DM, distinguished only by
 *  `channelId` (see `staffDmChannelId`'s sorted-pair convention). */
const staffChatMessages = pgTable("staff_chat_messages", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  fromId: text("from_id").notNull(),
  fromName: text("from_name").notNull(),
  fromRole: text("from_role").notNull(),
  text: text("text").notNull(),
  mentions: text("mentions").array().notNull().default([]),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
})

export { roles, adminProfiles, staffChatMessages }
