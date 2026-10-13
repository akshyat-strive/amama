"use client"

import * as React from "react"
import Link from "next/link"
import { PlusIcon, SproutIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ListingCard } from "@/features/marketplace/listing-card"
import { sellerIdentity } from "@/features/marketplace/identity"
import { useListings } from "@/features/marketplace/listing-store"
import { useWishlist } from "@/features/marketplace/wishlist-store"
import { WishlistSwitch } from "@/features/marketplace/wishlist-switch"
import { useOnboarding } from "@/features/onboarding/onboarding-context"

function ListingsView() {
  const { draft } = useOnboarding()
  const seller = sellerIdentity(draft.seller)

  const allListings = useListings()
  const myListings = React.useMemo(
    () => allListings.filter((listing) => listing.sellerId === seller.id && !listing.deletedAt),
    [allListings, seller.id]
  )
  const [wishlistOnly, setWishlistOnly] = React.useState(false)
  const wishlist = useWishlist(seller.id)
  const visible = wishlistOnly ? myListings.filter((listing) => wishlist.includes(listing.id)) : myListings

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[34px] font-semibold tracking-[-0.03em]">My listings</h1>
        <div className="flex shrink-0 items-center gap-2">
          <WishlistSwitch checked={wishlistOnly} onCheckedChange={setWishlistOnly} />
          <Link href="/seller/dashboard/listings/new" className={cn(buttonVariants({ size: "sm" }), "h-9 px-4")}>
            <PlusIcon />
            Add
          </Link>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-amama-subtle text-amama-deep">
            <SproutIcon className="size-5" strokeWidth={2.25} />
          </span>
          <h2 className="text-[17px] font-semibold">{wishlistOnly ? "Nothing saved" : "No listings yet"}</h2>
          <p className="max-w-xs text-[14px] leading-relaxed text-muted-foreground">
            {wishlistOnly
              ? "Save a listing from your catalog to follow up on it later."
              : "Add your first harvest and buyers searching your crops can find it."}
          </p>
          {wishlistOnly ? null : (
            <Link
              href="/seller/dashboard/listings/new"
              className={cn(buttonVariants({ size: "default" }), "mt-2")}
            >
              <PlusIcon />
              Add
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              ownerView
              href={`/seller/dashboard/listings/${listing.id}`}
              personId={seller.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export { ListingsView }
