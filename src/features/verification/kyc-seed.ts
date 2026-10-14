import { demoDraftFor, demoKashmirSellerDraft } from "@/features/auth/demo-accounts"
import { documentText, getRequiredDocuments } from "@/features/documents/documents"
import en from "@/features/i18n/translations/en"
import { seedFileId } from "@/features/local-db/file-store"
import { emptyBuyer, emptySeller, type BuyerDraft, type OnboardingRole, type SellerDraft } from "@/features/onboarding/types"
import type { DocumentReviewStatus, KycApplication, KycComment, KycDocument, KycTicket, KycTicketItem } from "@/features/verification/kyc-types"
import { deriveTicketStatus, kycTicketId, kycTicketNumber } from "@/features/verification/ticket"

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

  // Everything above is the account's first ticket.
  const firstTicketId = kycTicketId(seed.role, seed.email)
  const assignee = Object.values(STAFF).find((member) => member.id === seed.assigneeId) ?? null
  const onboarding: KycTicket = {
    id: firstTicketId,
    seq: 1,
    origin: "onboarding",
    title: "Onboarding KYC",
    status: "open",
    openedAt: seed.submittedAt,
    openedBy: { kind: "applicant", id: seed.email, name: person.fullName },
    assignee: assignee ? { id: assignee.id, name: assignee.name } : null,
    items: all.map(
      (document): KycTicketItem => ({
        docId: document.id,
        kind: document.requestedBy ? "new" : "submitted",
        status: document.reviewStatus,
        versionId: document.versions.at(-1)?.id ?? null,
        note: document.reviewNote,
        requestedBy: document.requestedBy ? { id: document.requestedBy.id, name: document.requestedBy.name } : null,
        reviewedBy: document.reviewedBy,
      })
    ),
    resolvedAt: seed.approvedAt ?? null,
    resolvedBy: seed.approvedBy ? { id: seed.approvedBy.id, name: seed.approvedBy.name } : null,
  }
  onboarding.status = deriveTicketStatus({ reviewerNote: null }, onboarding)

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
    comments: comments.map((entry) => ({ ...entry, ticketId: firstTicketId })),
    tickets: [onboarding],
    drafts: [],
  }
}

type Staff = (typeof STAFF)[keyof typeof STAFF]

/** What happened on a verified account since: a KAM asking for a renewal
 *  of a document about to expire, a KAM asking for a new document, and an
 *  update the account holder raised themselves that's being worked. */
type LaterStory = {
  kam: Staff
  /** Expiry dates on documents already on file. */
  expiries: Record<string, string>
  renewal: { docId: string; expiresAt: string; at: string; note: string }
  newDocument: { by: Staff; label: string; hint: string; at: string; note: string }
  /** Further documents the same KAM asked for on that ticket, beyond the
   *  default set — each lands on the account as its own empty field. */
  moreDocuments?: { label: string; hint: string; note: string }[]
  update: { docId: string; fileName: string; size: number; at: string; note: string; reply: string; repliedAt: string }
}

function withLaterTickets(application: KycApplication, story: LaterStory): KycApplication {
  const { role, email } = application
  const owner = application.companyName
  const kam = { id: story.kam.id, name: story.kam.name }
  const applicant = { kind: "applicant" as const, id: email, name: application.fullName }
  const label = (id: string) => application.documents.find((document) => document.id === id)?.label ?? documentLabel(id)
  const ids = [2, 3, 4].map((seq) => kycTicketNumber(role, email, seq))
  const extraId = `extra-${role}-later`
  const updateVersionId = `${email}-${story.update.docId}-v2`

  const documents: KycDocument[] = application.documents.map((document) => {
    const expiresAt = document.id === story.renewal.docId ? story.renewal.expiresAt : story.expiries[document.id]
    const versions = document.versions.map((version) => (expiresAt ? { ...version, expiresAt } : version))
    if (document.id === story.renewal.docId) {
      return { ...document, versions, reviewStatus: "update-requested", reviewNote: story.renewal.note, requestedBy: { ...kam, at: story.renewal.at } }
    }
    if (document.id === story.update.docId) {
      return {
        ...document,
        reviewStatus: "pending",
        reviewedBy: null,
        versions: [
          ...versions,
          {
            id: updateVersionId,
            name: story.update.fileName,
            size: story.update.size,
            fileId: seedFileId(`${documentLabel(document.id)} (updated)`, owner),
            uploadedAt: story.update.at,
          },
        ],
      }
    }
    return { ...document, versions }
  })
  const requested = [{ id: extraId, label: story.newDocument.label, hint: story.newDocument.hint, note: story.newDocument.note }, ...(story.moreDocuments ?? []).map((entry, index) => ({ id: `${extraId}-${index + 2}`, ...entry }))]
  for (const entry of requested) {
    documents.push({
      id: entry.id,
      label: entry.label,
      hint: entry.hint,
      required: true,
      reviewStatus: "missing",
      reviewNote: entry.note,
      reviewedBy: null,
      requestedBy: { id: story.newDocument.by.id, name: story.newDocument.by.name, at: story.newDocument.at },
      versions: [],
    })
  }

  const base = { reviewerNote: null }
  const drafted: KycTicket[] = [
    {
      id: ids[0],
      seq: 2,
      origin: "staff",
      title: `Renew ${label(story.renewal.docId)}`,
      status: "open",
      openedAt: story.renewal.at,
      openedBy: story.kam,
      assignee: kam,
      items: [
        { docId: story.renewal.docId, kind: "update", status: "update-requested", versionId: null, note: story.renewal.note, requestedBy: kam, reviewedBy: null },
      ],
      resolvedAt: null,
      resolvedBy: null,
    },
    {
      id: ids[1],
      seq: 3,
      origin: "staff",
      title: requested.length > 1 ? `New documents: ${story.newDocument.label} + ${requested.length - 1} more` : `New document: ${story.newDocument.label}`,
      status: "open",
      openedAt: story.newDocument.at,
      openedBy: story.newDocument.by,
      assignee: { id: story.newDocument.by.id, name: story.newDocument.by.name },
      items: requested.map((entry) => ({
        docId: entry.id,
        kind: "new" as const,
        status: "missing" as const,
        versionId: null,
        note: entry.note,
        requestedBy: { id: story.newDocument.by.id, name: story.newDocument.by.name },
        reviewedBy: null,
      })),
      resolvedAt: null,
      resolvedBy: null,
    },
    {
      id: ids[2],
      seq: 4,
      origin: "applicant",
      title: `Updated ${label(story.update.docId)}`,
      status: "open",
      openedAt: story.update.at,
      openedBy: applicant,
      assignee: kam,
      items: [{ docId: story.update.docId, kind: "submitted", status: "pending", versionId: updateVersionId, note: null, requestedBy: null, reviewedBy: null }],
      resolvedAt: null,
      resolvedBy: null,
    },
  ]
  const later = drafted.map((ticket) => ({ ...ticket, status: deriveTicketStatus(base, ticket) }))

  const entry = (key: string, author: KycComment["author"], text: string, at: string, docId: string | null, ticketId: string): KycComment => ({
    id: `${email}-later-${key}`,
    author,
    text,
    at,
    docId,
    ticketId,
  })
  const minutesAfter = (iso: string, minutes: number) => new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()

  return {
    ...application,
    documents,
    tickets: [...application.tickets, ...later],
    comments: [
      ...application.comments,
      entry("renewal", story.kam, story.renewal.note, story.renewal.at, story.renewal.docId, ids[0]),
      entry("new", story.newDocument.by, story.newDocument.note, story.newDocument.at, extraId, ids[1]),
      entry("update-raised", system, "Raised with 1 updated document", story.update.at, null, ids[2]),
      entry("update-note", applicant, story.update.note, minutesAfter(story.update.at, 1), story.update.docId, ids[2]),
      entry("update-assigned", system, `Assigned to ${story.kam.name}`, minutesAfter(story.update.at, 1), null, ids[2]),
      entry("update-reply", story.kam, story.update.reply, story.update.repliedAt, story.update.docId, ids[2]),
    ],
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
    withLaterTickets(
      buildApplication({
        role: "buyer",
        email: "buyer@amama.in",
        submittedAt: "2026-07-28T08:30:00.000Z",
        assigneeId: STAFF.priya.id,
        defaultStatus: "approved",
        approvedBy: STAFF.priya,
        approvedAt: "2026-07-29T11:00:00.000Z",
      }),
      {
        kam: STAFF.priya,
        expiries: { governmentId: "2031-04-02T00:00:00.000Z", taxRegistration: "2027-02-14T00:00:00.000Z" },
        renewal: {
          docId: "tradeLicense",
          expiresAt: "2026-10-28T00:00:00.000Z",
          at: "2026-10-08T06:00:00.000Z",
          note: "Your Dubai trade licence expires on 28 October. Please upload the renewed licence as soon as DED issues it, so your orders aren't paused.",
        },
        newDocument: {
          by: STAFF.priya,
          label: "Food import registration (FIRS)",
          hint: "Your establishment registration on Dubai Municipality's food import system",
          at: "2026-10-11T08:20:00.000Z",
          note: "You're now importing chilled produce through Jebel Ali — we need your FIRS registration on file before the next shipment clears.",
        },
        moreDocuments: [
          {
            label: "Cold store lease or ownership proof",
            hint: "Lease deed, ownership papers or a third-party storage contract",
            note: "Your recent orders are chilled. Please share proof of the cold store you'll receive them into, so we can plan the handover.",
          },
        ],
        update: {
          docId: "bankDetails",
          fileName: "emirates-nbd-account-letter.pdf",
          size: 228_000,
          at: "2026-10-12T09:40:00.000Z",
          note: "We've moved our payables to Emirates NBD — here's the bank's account confirmation letter.",
          reply: "Thanks Vikram — I'm verifying the IBAN with Emirates NBD. Payouts stay on the old account until this is approved.",
          repliedAt: "2026-10-12T11:15:00.000Z",
        },
      }
    ),
    withLaterTickets(
      buildApplication({
        role: "seller",
        email: "seller@amama.in",
        submittedAt: "2026-07-25T06:00:00.000Z",
        assigneeId: STAFF.arjun.id,
        defaultStatus: "approved",
        approvedBy: STAFF.arjun,
        approvedAt: "2026-07-26T09:40:00.000Z",
      }),
      {
        kam: STAFF.arjun,
        expiries: { certIso22000: "2027-03-18T00:00:00.000Z", fssai: "2027-06-30T00:00:00.000Z", apedaRcmc: "2028-01-15T00:00:00.000Z" },
        renewal: {
          docId: "certHaccp",
          expiresAt: "2026-10-31T00:00:00.000Z",
          at: "2026-10-09T05:30:00.000Z",
          note: "Your HACCP certificate expires on 31 October. Please upload the renewed certificate once your surveillance audit is signed off.",
        },
        newDocument: {
          by: STAFF.arjun,
          label: "Spices Board registration (CRES)",
          hint: "Certificate of Registration as Exporter of Spices",
          at: "2026-10-11T07:10:00.000Z",
          note: "You've started listing whole spices for export — we need your Spices Board CRES on file before those listings go live.",
        },
        moreDocuments: [
          {
            label: "Organic certificate (NPOP)",
            hint: "NPOP scope certificate from an accredited body",
            note: "Two of your tea listings are marked organic. Please add your NPOP scope certificate so buyers in the EU can rely on the claim.",
          },
        ],
        update: {
          docId: "bankDetails",
          fileName: "cancelled-cheque-hdfc.pdf",
          size: 196_000,
          at: "2026-10-13T04:20:00.000Z",
          note: "We moved our operating account to HDFC — the new cancelled cheque is attached.",
          reply: "Thanks Ravi — running the penny-drop check on the new account now, I'll confirm today.",
          repliedAt: "2026-10-13T06:05:00.000Z",
        },
      }
    ),
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
