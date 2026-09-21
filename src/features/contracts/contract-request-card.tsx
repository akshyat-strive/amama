"use client"

import Link from "next/link"
import { FileSignatureIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { useUsers } from "@/features/admin/user-store"
import { CardShell } from "@/features/marketplace/chat-card-shell"
import { contractForDeal, createContract, useContracts } from "@/features/contracts/contract-store"
import { contractsHref } from "@/features/contracts/contract-chat-cards"
import type { ChatParty } from "@/features/marketplace/conversation-store"
import { useDeals, type Deal } from "@/features/marketplace/deal-store"

/**
 * The bridge between an agreed deal and paperwork nobody's started yet.
 * Posted the moment a buyer or seller asks for a term sheet, so it has to
 * work for three audiences from the same card: the two traders just see
 * they've asked and are waiting, and a KAM gets the exact same claim/
 * reassign choice `deals-view.tsx`'s own assignment row offers — right in
 * the thread instead of a separate queue screen. Reads the deal live, so
 * once anyone opens the contract this card flips from "asking" to "here's
 * who's got it" on its own, no separate resolve step needed.
 */
function ContractRequestCard({
  dealId,
  viewer,
}: {
  dealId: string
  viewer: ChatParty
  viewerName: string
}) {
  const deals = useDeals()
  const contracts = useContracts()
  const deal = deals.find((entry) => entry.id === dealId)
  if (!deal || !deal.contractRequestedAt) return null

  const contract = contractForDeal(contracts, deal.id)
  const requesterName = deal.contractRequestedBy === "seller" ? deal.sellerName : deal.buyerName

  if (contract) {
    return (
      <CardShell
        icon={FileSignatureIcon}
        tone="success"
        title="Term sheet request"
        subtitle={`Picked up by ${contract.kamName} — contract ${contract.reference} is open`}
        footer={
          <Link
            href={contractsHref(viewer, contract.id)}
            className="inline-flex h-9 items-center justify-center rounded-full bg-amama-deep px-4 text-[13px] font-semibold text-white transition-colors hover:bg-amama-deep-hover"
          >
            Open contract
          </Link>
        }
      />
    )
  }

  return (
    <CardShell
      icon={FileSignatureIcon}
      tone="warning"
      title="Term sheet requested"
      subtitle={`${requesterName} asked for this to become a contract — nobody's picked it up yet`}
      footer={
        viewer === "kam" ? (
          <AssignRow deal={deal} />
        ) : (
          <p className="text-[12px] text-muted-foreground">
            A member of the AMAMA team will pick this up shortly.
          </p>
        )
      }
    />
  )
}

/** Mounted only for the `kam` viewer, so the two admin-gated fetches this
 *  needs — `useCurrentAdmin`, `useUsers` — never fire for a buyer or
 *  seller reading the same thread. */
function AssignRow({ deal }: { deal: Deal }) {
  const admin = useCurrentAdmin()
  const users = useUsers()
  const contracts = useContracts()
  if (!admin) return null

  const workload = (userId: string) => contracts.filter((contract) => contract.kamId === userId).length

  return (
    <div className="flex flex-wrap items-center gap-2">
      {admin.can("deals.work") ? (
        <Button
          size="sm"
          onClick={() => createContract(deal, { id: admin.user.id, name: admin.user.name })}
        >
          Start the term sheet
        </Button>
      ) : null}
      {admin.can("deals.assign") ? (
        <Select
          onValueChange={(value) => {
            const user = users.find((entry) => entry.id === value)
            if (user) createContract(deal, user)
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Assign to…" />
          </SelectTrigger>
          <SelectContent>
            {users.length === 0 ? (
              <SelectItem value="none" disabled>
                Nobody has signed in yet
              </SelectItem>
            ) : (
              users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} — {workload(user.id)} open
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  )
}

export { ContractRequestCard }
