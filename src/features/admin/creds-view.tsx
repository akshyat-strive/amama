"use client"

import Link from "next/link"
import { InfoIcon } from "lucide-react"

import { AdminPanel } from "@/features/admin/admin-ui"
import { useDemoDirectory } from "@/features/admin/demo-directory"
import { DEMO_PASSWORD } from "@/features/admin/user-store"

/**
 * Public on purpose — its whole job is helping you get *into* `/internal`,
 * so it can't sit behind the same login it's meant to unlock. Every
 * account listed here is a real Managed Better Auth credential, but this
 * is still a demo: every one of them shares the same known
 * `DEMO_PASSWORD`, which is the only reason it's safe to print here.
 */
function CredsView() {
  const users = useDemoDirectory()

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-[28px] font-bold tracking-tight">Demo credentials</h1>

      <AdminPanel title="Every seeded account" subtitle={`${users.length} accounts`} className="mt-6">
        <div className="flex flex-col gap-2 border-b border-border px-5 py-4">
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            Prototype only — every account below is real, but shares the same demo password. Use any of them at{" "}
            <Link href="/internal/login" className="font-medium text-amama-deep underline underline-offset-4">
              /internal/login
            </Link>
            , or just quick-login from there.
          </p>
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            <span className="font-mono text-foreground">buyer@amama.in</span> and{" "}
            <span className="font-mono text-foreground">seller@amama.in</span> are pre-verified demo accounts, already
            mid-deal — use the &quot;Continue as demo buyer/seller&quot; button on{" "}
            <Link href="/buyer/login" className="font-medium text-amama-deep underline underline-offset-4">
              /buyer/login
            </Link>{" "}
            or{" "}
            <Link href="/seller/login" className="font-medium text-amama-deep underline underline-offset-4">
              /seller/login
            </Link>{" "}
            to jump straight to their dashboard, no onboarding required.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-start text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <th className="px-5 py-3 text-start">Name</th>
                <th className="px-5 py-3 text-start">Email</th>
                <th className="px-5 py-3 text-start">Password</th>
                <th className="px-5 py-3 text-start">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => {
                return (
                  <tr key={user.id}>
                    <td className="px-5 py-3 font-medium text-foreground">{user.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-5 py-3 font-mono text-muted-foreground">{DEMO_PASSWORD}</td>
                    <td className="px-5 py-3 text-muted-foreground">{user.roleName}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  )
}

export { CredsView }
