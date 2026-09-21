import { defineConfig } from "drizzle-kit"

// drizzle-kit runs standalone (not through `next dev`), so it doesn't get
// `.env.local` loaded automatically the way the app itself does.
if (!process.env.DATABASE_URL_UNPOOLED) {
  process.loadEnvFile(".env.local")
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations need a direct (non-pooled) connection — see the
  // neon-postgres skill's pooled-vs-direct guidance.
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
  schemaFilter: ["public"],
})
