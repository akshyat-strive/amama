"use client"

import * as React from "react"
import Link from "next/link"
import { HeartIcon, PlusIcon, SproutIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ListingCard } from "@/features/marketplace/listing-card"
import { sellerIdentity } from "@/features/marketplace/identity"
import { useListings } from "@/features/marketplace/listing-store"
import { useWishlist } from "@/features/marketplace/wishlist-store"
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">Listings</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Your own catalog — what buyers see when they search for what you grow.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setWishlistOnly((value) => !value)}
            aria-pressed={wishlistOnly}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
              wishlistOnly
                ? "border-transparent bg-amama-deep text-white"
                : "border-border text-foreground hover:bg-muted"
            )}
          >
            <HeartIcon className={cn("size-3.5", wishlistOnly && "fill-white")} />
            Wishlist
          </button>
          <Link
            href="/seller/dashboard/listings/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <PlusIcon />
            Add listing
          </Link>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-amama-subtle text-amama-deep">
            <SproutIcon className="size-5" strokeWidth={2.25} />
          </span>
          <h2 className="text-[17px] font-bold">{wishlistOnly ? "Nothing saved" : "No listings yet"}</h2>
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
              Add a listing
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
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
