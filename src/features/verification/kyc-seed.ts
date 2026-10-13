import { demoDraftFor, demoKashmirSellerDraft } from "@/features/auth/demo-accounts"
import { documentText, getRequiredDocuments } from "@/features/documents/documents"
import en from "@/features/i18n/translations/en"
import { seedFileId } from "@/features/local-db/file-store"
import { emptyBuyer, emptySeller, type BuyerDraft, type OnboardingRole, type SellerDraft } from "@/features/onboarding/types"
import type { DocumentReviewStatus, KycApplication, KycComment, KycDocument } from "@/features/verification/kyc-types"

const english = (path: string): string => {
  const value = path.split(".").reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], en)
  return typeof value === "string" ? value : path
}

/** A document's English label — what the seeded stand-in files show. */
export const documentLabel = (id: string) => documentText(id, english).label

/** Every seeded buyer and seller, as the profile their login restores. */
export const SEED_BUYER_PROFILES: BuyerDraft[] = [
  demoDraftFor("buyer").buyer,
  {
    ...emptyBuyer,
    email: "fatima@alwahafresh.example",
    fullName: "Fatima Al-Sayegh",
    entityType: "organization",
    companyName: "Al Waha Fresh Produce LLC",
    country: "AE",
    businessType: "wholesaler",
    importLicence: "IEC-AE-990214",
    sourcing: ["fresh-fruit", "vegetables"],
    incoterm: "fob",
  },
  {
    ...emptyBuyer,
    email: "chen.wei@goldenharbor.example",
    fullName: "Chen Wei",
    entityType: "organization",
    companyName: "Golden Harbor Trading Co.",
    country: "SG",
    businessType: "importerDistributor",
    importLicence: "SG-IMP-44210",
    sourcing: ["coffee", "cocoa", "nuts"],
    incoterm: "cfr",
  },
  {
    ...emptyBuyer,
    email: "klaus.richter@nordicspice.example",
    fullName: "Klaus Richter",
    entityType: "organization",
    companyName: "Nordic Spice Import GmbH",
    country: "DE",
    businessType: "foodManufacturer",
    importLicence: "DE-EORI-317788",
    sourcing: ["spices", "dried-fruit"],
    incoterm: "dap",
  },
]

export const SEED_SELLER_PROFILES: SellerDraft[] = [
  demoDraftFor("seller").seller,
  demoKashmirSellerDraft.seller,
  {
    ...emptySeller,
    email: "meena.iyer@nilgiritea.example",
    fullName: "Meena Iyer",
    entityType: "organization",
    sellerSubType: "producer",
    farmName: "Nilgiri Tea Collective",
    country: "IN",
    region: "Nilgiris, Tamil Nadu",
    farmSize: "between50And200Ha",
    producerType: "cooperative",
    produce: ["tea"],
    certifications: ["rainforest"],
    bio: "Four hundred smallholders above 1,800 m, hand-plucked two leaves and a bud, processed in our own factory the same day.",
  },
  {
    ...emptySeller,
    email: "suresh.patil@konkancashew.example",
    fullName: "Suresh Patil",
    entityType: "individual",
    sellerSubType: "producer",
    dateOfBirth: { day: 3, month: 11, year: 1978 },
    farmName: "Konkan Cashew Farms",
    country: "IN",
    region: "Sindhudurg, Maharashtra",
    farmSize: "between10And50Ha",
    producerType: "familyFarm",
    produce: ["cashew"],
  },
  {
    ...emptySeller,
    email: "harpreet.singh@punjabbasmati.example",
    fullName: "Harpreet Singh",
    entityType: "organization",
    sellerSubType: "trader",
    farmName: "Punjab Basmati Farms",
    country: "IN",
    region: "Amritsar, Punjab",
    producerType: "aggregator",
    produce: ["grains"],
    certifications: ["globalgap"],
  },
]

const STAFF = {
  priya: { kind: "staff" as const, id: "priya@amama.com", name: "Priya Nair", title: "Master KAM" },
  arjun: { kind: "staff" as const, id: "arjun@amama.com", name: "Arjun Mehta", title: "KAM" },
  rohit: { kind: "staff" as const, id: "rohit@amama.com", name: "Rohit Verma", title: "KAM" },
}

const system = { kind: "system" as const, id: "system", name: "amama" }

type Seed = {
  role: OnboardingRole
  email: string
  submittedAt: string
  assigneeId: string | null
  /** Every document's status unless `documents` says otherwise. */
  defaultStatus: DocumentReviewStatus
  documents?: Record<string, (document: KycDocument) => KycDocument>
  extraDocuments?: KycDocument[]
  comments?: Omit<KycComment, "id">[]
  approvedBy?: (typeof STAFF)[keyof typeof STAFF]
  approvedAt?: string
}

const hoursAfter = (iso: string, hours: number) => new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString()

function buildApplication(seed: Seed): KycApplication {
  const buyer = SEED_BUYER_PROFILES.find((profile) => profile.email === seed.email)
  const seller = SEED_SELLER_PROFILES.find((profile) => profile.email === seed.email)
  const person = (seed.role === "buyer" ? buyer : seller)!
  const owner = seed.role === "buyer" ? (buyer!.companyName || person.fullName) : (seller!.farmName || person.fullName)

  const resolved = getRequiredDocuments({
    country: person.country,
    role: seed.role,
    entityType: person.entityType,
    sellerSubType: seller?.sellerSubType,
    certifications: seller?.certifications,
  })

  // Documents seeded as approved were approved by whoever owns the ticket.
  const reviewer = seed.approvedBy ?? Object.values(STAFF).find((member) => member.id === seed.assigneeId) ?? null
  const documents: KycDocument[] = resolved.map(({ id, required }, index) => {
    const base: KycDocument = {
      id,
      required,
      reviewStatus: seed.defaultStatus,
      reviewNote: null,
      reviewedBy:
        seed.defaultStatus === "approved" && reviewer
          ? { id: reviewer.id, name: reviewer.name, at: seed.approvedAt ?? hoursAfter(seed.submittedAt, 20) }
          : null,
      requestedBy: null,
      versions: [
        {
          id: `${seed.email}-${id}-v1`,
          name: `${id}-${index + 1}.pdf`,
          size: 180_000 + index * 41_000,
          fileId: seedFileId(documentLabel(id), owner),
          uploadedAt: seed.submittedAt,
        },
      ],
    }
    const override = seed.documents?.[id]
    return override ? override(base) : base
  })

  const all = [...documents, ...(seed.extraDocuments ?? [])]
  const comments: KycComment[] = [
    {
      id: `${seed.email}-c0`,
      author: system,
      text: `Submitted ${documents.length} documents for review`,
      at: seed.submittedAt,
      docId: null,
    },
    ...(seed.comments ?? []).map((comment, index) => ({ ...comment, id: `${seed.email}-c${index + 1}` })),
  ]
  if (seed.approvedBy && seed.approvedAt) {
    comments.push({ id: `${seed.email}-approved`, author: seed.approvedBy, text: "Approved — welcome to amama.", at: seed.approvedAt, docId: null })
  }

  const needsApplicant = all.some((document) => document.reviewStatus === "rejected" || document.reviewStatus === "missing")
  return {
    userId: seed.email,
    role: seed.role,
    email: seed.email,
    fullName: person.fullName,
    companyName: owner,
    entityType: person.entityType,
    sellerSubType: seller?.sellerSubType,
    country: person.country,
    reviewStatus: seed.approvedBy ? "approved" : needsApplicant ? "changes-requested" : "pending",
    reviewerNote: null,
    reviewedByAdminId: seed.approvedBy?.id ?? null,
    reviewedByName: seed.approvedBy?.name ?? null,
    submittedAt: seed.submittedAt,
    reviewedAt: seed.approvedAt ?? null,
    assigneeId: seed.assigneeId,
    documents: all,
    comments,
  }
}

const rejectWith =
  (note: string, by: (typeof STAFF)[keyof typeof STAFF], at: string) =>
  (document: KycDocument): KycDocument => ({ ...document, reviewStatus: "rejected", reviewNote: note, reviewedBy: { id: by.id, name: by.name, at } })

const approveBy =
  (by: (typeof STAFF)[keyof typeof STAFF], at: string) =>
  (document: KycDocument): KycDocument => ({ ...document, reviewStatus: "approved", reviewedBy: { id: by.id, name: by.name, at } })

export function seedKycApplications(): KycApplication[] {
  return [
    buildApplication({
      role: "buyer",
      email: "buyer@amama.in",
      submittedAt: "2026-07-28T08:30:00.000Z",
      assigneeId: STAFF.priya.id,
      defaultStatus: "approved",
      approvedBy: STAFF.priya,
      approvedAt: "2026-07-29T11:00:00.000Z",
    }),
    buildApplication({
      role: "seller",
      email: "seller@amama.in",
      submittedAt: "2026-07-25T06:00:00.000Z",
      assigneeId: STAFF.arjun.id,
      defaultStatus: "approved",
      approvedBy: STAFF.arjun,
      approvedAt: "2026-07-26T09:40:00.000Z",
    }),
    buildApplication({
      role: "seller",
      email: "kashmir@amama.in",
      submittedAt: "2026-08-04T05:15:00.000Z",
      assigneeId: STAFF.rohit.id,
      defaultStatus: "approved",
      approvedBy: STAFF.rohit,
      approvedAt: "2026-08-05T10:20:00.000Z",
    }),
    buildApplication({
      role: "buyer",
      email: "fatima@alwahafresh.example",
      submittedAt: "2026-10-11T07:20:00.000Z",
      assigneeId: STAFF.arjun.id,
      defaultStatus: "pending",
    }),
    buildApplication({
      role: "buyer",
      email: "chen.wei@goldenharbor.example",
      submittedAt: "2026-10-12T03:05:00.000Z",
      assigneeId: null,
      defaultStatus: "pending",
    }),
    buildApplication({
      role: "buyer",
      email: "klaus.richter@nordicspice.example",
      submittedAt: "2026-10-08T09:00:00.000Z",
      assigneeId: STAFF.arjun.id,
      defaultStatus: "approved",
      documents: {
        governmentId: approveBy(STAFF.arjun, "2026-10-09T10:00:00.000Z"),
        bankDetails: approveBy(STAFF.arjun, "2026-10-09T10:02:00.000Z"),
        tradeLicense: approveBy(STAFF.arjun, "2026-10-09T10:05:00.000Z"),
        taxRegistration: rejectWith(
          "The VAT certificate is cut off at the bottom — please upload the full page with the issue date.",
          STAFF.arjun,
          "2026-10-09T10:08:00.000Z"
        ),
      },
      comments: [
        {
          author: STAFF.arjun,
          text: "The VAT certificate is cut off at the bottom — please upload the full page with the issue date.",
          at: "2026-10-09T10:08:00.000Z",
          docId: "taxRegistration",
        },
        {
          author: { kind: "applicant", id: "klaus.richter@nordicspice.example", name: "Klaus Richter" },
          text: "Our accountant has the original — I'll upload the full scan tomorrow.",
          at: "2026-10-09T15:40:00.000Z",
          docId: "taxRegistration",
        },
      ],
    }),
    buildApplication({
      role: "seller",
      email: "meena.iyer@nilgiritea.example",
      submittedAt: "2026-10-06T04:30:00.000Z",
      assigneeId: STAFF.rohit.id,
      defaultStatus: "approved",
      documents: {
        landProof: (document) => ({
          ...document,
          reviewStatus: "pending",
          reviewedBy: null,
          versions: [
            ...document.versions,
            {
              id: "meena-landProof-v2",
              name: "patta-survey-218-2.pdf",
              size: 342_000,
              fileId: seedFileId("Land record (corrected)", "Nilgiri Tea Collective"),
              uploadedAt: "2026-10-10T06:15:00.000Z",
            },
          ],
        }),
        certRainforest: (document) => ({ ...document, reviewStatus: "pending", reviewedBy: null }),
      },
      comments: [
        {
          author: STAFF.rohit,
          text: "This patta is for survey no. 212 — your farm profile says 218. Could you upload the record for 218?",
          at: "2026-10-07T08:00:00.000Z",
          docId: "landProof",
        },
        {
          author: system,
          text: "Uploaded a new version of the land record (v2)",
          at: "2026-10-10T06:15:00.000Z",
          docId: "landProof",
        },
        {
          author: { kind: "applicant", id: "meena.iyer@nilgiritea.example", name: "Meena Iyer" },
          text: "Sorry about that — 212 is our nursery plot. The new upload is the main estate, survey 218.",
          at: "2026-10-10T06:16:00.000Z",
          docId: "landProof",
        },
      ],
    }),
    buildApplication({
      role: "seller",
      email: "suresh.patil@konkancashew.example",
      submittedAt: "2026-10-05T10:10:00.000Z",
      assigneeId: STAFF.rohit.id,
      defaultStatus: "approved",
      extraDocuments: [
        {
          id: "extra-processing-licence",
          label: "Cashew processing unit licence",
          hint: "The factory licence for the unit where you shell and grade",
          required: true,
          reviewStatus: "missing",
          reviewNote: null,
          reviewedBy: null,
          requestedBy: { id: STAFF.rohit.id, name: STAFF.rohit.name, at: "2026-10-07T09:30:00.000Z" },
          versions: [],
        },
      ],
      comments: [
        {
          author: STAFF.rohit,
          text: "Everything else checks out. Since you sell graded kernels, we also need the licence for your processing unit.",
          at: "2026-10-07T09:30:00.000Z",
          docId: "extra-processing-licence",
        },
      ],
    }),
    buildApplication({
      role: "seller",
      email: "harpreet.singh@punjabbasmati.example",
      submittedAt: "2026-10-09T11:45:00.000Z",
      assigneeId: STAFF.priya.id,
      defaultStatus: "pending",
      comments: [
        {
          author: STAFF.priya,
          text: "Verifying the IEC with DGFT — usually takes a few hours.",
          at: "2026-10-10T05:00:00.000Z",
          docId: "iecCode",
        },
      ],
    }),
  ]
}
