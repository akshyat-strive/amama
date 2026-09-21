import { crops } from "@/features/onboarding/steps"

/** The crop's own representative photo, same lookup `BuyerMatchCard` and
 *  `ListingCard` use — used for the buyer's own RFQ rail thumbnail. The
 *  seller-side feed dropped photo cards for a plain list (an RFQ is a
 *  requirement to scan and compare, not a product to browse), so this is
 *  the one place left that still wants a crop image. */
function rfqCropPhoto(productCategory: string): string {
  return crops.find((crop) => crop.id === productCategory)?.photo ?? crops[0].photo
}

export { rfqCropPhoto }
