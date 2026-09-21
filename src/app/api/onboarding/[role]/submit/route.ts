import { z } from "zod"

import { apiErrorResponse, ApiError } from "@/lib/api/errors"
import { requireAppUserOfKind } from "@/features/identity/services/identity-service"
import { submitApplication } from "@/features/verification/services/verification-service"

const roleSchema = z.enum(["buyer", "seller"])

const dateParts = z.object({ day: z.number(), month: z.number(), year: z.number() }).nullable()
const documentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  required: z.boolean(),
  dataUrl: z.string(),
})

const buyerFields = z.object({
  fullName: z.string(),
  entityType: z.string(),
  dateOfBirth: dateParts,
  companyName: z.string(),
  country: z.string(),
  businessType: z.string(),
  importLicence: z.string(),
  sourcing: z.array(z.string()),
  annualVolume: z.string(),
  incoterm: z.string(),
})

const sellerFields = z.object({
  fullName: z.string(),
  entityType: z.string(),
  sellerSubType: z.string(),
  dateOfBirth: dateParts,
  farmName: z.string(),
  country: z.string(),
  region: z.string(),
  farmSize: z.string(),
  producerType: z.string(),
  produce: z.array(z.string()),
  certifications: z.array(z.string()),
})

const bodySchema = z.object({
  // Partial on purpose: a resubmission (only new documents, see
  // `resubmitDocuments` in `verification-context.tsx`) sends `{}` here
  // rather than repeating fields that haven't changed.
  fields: z.union([buyerFields.partial(), sellerFields.partial()]),
  documents: z.array(documentSchema),
})

export async function POST(request: Request, { params }: { params: Promise<{ role: string }> }) {
  try {
    const role = roleSchema.parse((await params).role)
    const appUser = await requireAppUserOfKind(role)
    const { fields, documents } = bodySchema.parse(await request.json())
    await submitApplication(appUser.id, role, fields, documents)
    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) return apiErrorResponse(new ApiError(400, "That application is missing something."))
    return apiErrorResponse(error)
  }
}
