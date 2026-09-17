import {
  conversationId,
  seedConversationsIfEmpty,
  type Conversation,
} from "@/features/marketplace/conversation-store"
import { seedDealsIfEmpty, type Deal, type Shipment } from "@/features/marketplace/deal-store"
import {
  STAFF_ANNOUNCEMENTS_CHANNEL_ID,
  STAFF_GROUP_CHANNEL_ID,
  seedStaffChatIfEmpty,
  staffDmChannelId,
  type StaffChatMessage,
} from "@/features/admin/staff-chat-store"
import { seedSubmissionsIfEmpty, type Store as VerificationStore } from "@/features/verification/verification-context"

/*
 * Fixed, readable content — no `Math.random()`/`Date.now()` — so every
 * fresh browser lands on the exact same demo state, and reloading never
 * grows any of it (each `seed*IfEmpty` below only writes once).
 *
 * `buyer@amama.com` (Vikram Shah) and `seller@amama.com` (Ravi Kumar) are
 * used on purpose for the one deal that has shipments (#8): their
 * onboarding applications are seeded straight into the review queue
 * (buyer pending, seller sent back for a blurry document), and the
 * dashboard behind a role is gated on that role's single application
 * being "approved" (see `ReviewGate`) — so out of the box, onboarding as
 * either email lands on the "we're reviewing it" screen, same as any real
 * applicant. Approve one from Home (or fix and re-approve the seller's
 * flagged document) and that role's dashboard opens for anyone onboarding
 * under it, Shipments included, showing deal #8's real, tracked
 * shipments — review queue and shipment tracker, demoed as one flow
 * instead of two disconnected shortcuts. The rest of the seeded deals use
 * throwaway buyer/seller emails that were never onboarded, so only the
 * admin console ever sees them.
 */

const conv1Id = conversationId("procurement@globalfoods.example", "seed-krishna-valley", "seed-1")
const conv2Id = conversationId("trade@meridiancoffee.example", "seed-coorg-estates", "seed-2")
const conv3Id = conversationId("buyer@amama.com", "seller@amama.com", "demo-tea-1")

const SEED_CONVERSATIONS: Conversation[] = [
  {
    id: conv1Id,
    buyerId: "procurement@globalfoods.example",
    buyerName: "Global Foods Imports",
    sellerId: "seed-krishna-valley",
    sellerName: "Krishna Valley Farmers Cooperative",
    listingId: "seed-1",
    listingTitle: "Bhagwa Pomegranate — Grade A+",
    messages: [
      { from: "buyer", text: "Hi — interested in your Bhagwa Pomegranate lot. Could you do 45 MT at $950/t?", at: "2026-08-05T10:00:00.000Z" },
      { from: "system", text: "Global Foods Imports proposed a deal: $950/t × 45 MT.", at: "2026-08-05T10:05:00.000Z" },
      { from: "seller", text: "That's a bit low for this grade — our floor right now is $985/t given export demand.", at: "2026-08-05T13:20:00.000Z" },
      { from: "system", text: "Krishna Valley Farmers Cooperative declined the deal: Price too low for current market — happy to revisit at $985/t or above.", at: "2026-08-06T09:00:00.000Z" },
      { from: "buyer", text: "Understood — let's go with $985/t for the same 45 MT.", at: "2026-08-06T11:15:00.000Z" },
      { from: "system", text: "Global Foods Imports proposed a deal: $985/t × 45 MT.", at: "2026-08-06T11:20:00.000Z" },
    ],
  },
  {
    id: conv2Id,
    buyerId: "trade@meridiancoffee.example",
    buyerName: "Meridian Coffee Traders",
    sellerId: "seed-coorg-estates",
    sellerName: "Coorg Estates Coffee Growers",
    listingId: "seed-2",
    listingTitle: "Arabica Plantation A — Grade A+",
    messages: [
      { from: "seller", text: "We have 20 MT of the Plantation A lot free this month if you're still sourcing.", at: "2026-08-10T08:15:00.000Z" },
      { from: "buyer", text: "We are — send terms and we'll move quickly.", at: "2026-08-10T08:25:00.000Z" },
      { from: "system", text: "Coorg Estates Coffee Growers proposed a deal: $4,350/t × 20 MT.", at: "2026-08-10T08:30:00.000Z" },
    ],
  },
  {
    id: conv3Id,
    buyerId: "buyer@amama.com",
    buyerName: "Vikram Shah",
    sellerId: "seller@amama.com",
    sellerName: "Ravi Kumar",
    listingId: "demo-tea-1",
    listingTitle: "Nilgiri Orthodox Tea — Grade A",
    messages: [
      { from: "buyer", text: "Hi — could we do 12 MT of your Nilgiri Orthodox at $2,950/t, CIF?", at: "2026-08-18T09:00:00.000Z" },
      { from: "system", text: "Vikram Shah proposed a deal: $2,950/t × 12 MT.", at: "2026-08-18T09:01:00.000Z" },
      { from: "seller", text: "Works for us — confirming.", at: "2026-08-19T08:30:00.000Z" },
      { from: "system", text: "Ravi Kumar confirmed the deal — it's now active.", at: "2026-08-19T09:00:00.000Z" },
    ],
  },
]

const emptyCosting: Deal["costing"] = { incoterm: null, paymentTerm: null, proformaInvoiceNo: null, notes: null }
const emptyContracting: Deal["contracting"] = { contractRef: null, signedOff: false, notes: null }
const emptyCompliance: Deal["compliance"] = {
  phytosanitaryCert: false,
  labReport: false,
  certificateOfOrigin: false,
  customsDocs: false,
  freightBooked: false,
  notes: null,
}
const emptyPayment: Deal["payment"] = { settled: false, settledAt: null, notes: null }

const teaShipments: Shipment[] = [
  {
    id: "ship-8-1",
    carrier: "Maersk Line",
    documentNumber: "MSKU7788123",
    status: "in-transit",
    origin: "Kochi, India",
    destination: "Rotterdam, Netherlands",
    currentLocation: "Indian Ocean, en route to the Suez Canal",
    eta: "2026-09-25T00:00:00.000Z",
    note: "20ft reefer container, temperature-controlled.",
    events: [
      { id: "evt-8-1-1", type: "booked", label: "Booked", location: "Kochi, India", at: "2026-08-20T09:00:00.000Z", note: "Space confirmed with Maersk." },
      { id: "evt-8-1-2", type: "gate-in", label: "Gate-in at origin", location: "Kochi Port CFS", at: "2026-08-22T14:00:00.000Z", note: null },
      { id: "evt-8-1-3", type: "loaded", label: "Loaded on vessel", location: "Kochi Port", at: "2026-08-23T10:00:00.000Z", note: "Loaded on MV Maersk Kobe." },
      { id: "evt-8-1-4", type: "departed", label: "Departed origin", location: "Kochi, India", at: "2026-08-24T06:00:00.000Z", note: null },
      { id: "evt-8-1-5", type: "in-transit", label: "In transit", location: "Indian Ocean, en route to the Suez Canal", at: "2026-09-05T00:00:00.000Z", note: null },
    ],
    createdAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-09-05T00:00:00.000Z",
  },
  {
    id: "ship-8-2",
    carrier: "CMA CGM",
    documentNumber: "CMAU5521987",
    status: "delayed",
    origin: "Kochi, India",
    destination: "Hamburg, Germany",
    currentLocation: "Kochi Port",
    eta: "2026-09-30T00:00:00.000Z",
    note: "40ft standard container.",
    events: [
      { id: "evt-8-2-1", type: "booked", label: "Booked", location: "Kochi, India", at: "2026-08-28T09:00:00.000Z", note: null },
      { id: "evt-8-2-2", type: "gate-in", label: "Gate-in at origin", location: "Kochi Port CFS", at: "2026-08-30T11:00:00.000Z", note: null },
      { id: "evt-8-2-3", type: "delayed", label: "Delayed", location: "Kochi Port", at: "2026-09-02T08:00:00.000Z", note: "Held for additional phytosanitary inspection — 3 day delay expected." },
    ],
    createdAt: "2026-08-28T09:00:00.000Z",
    updatedAt: "2026-09-02T08:00:00.000Z",
  },
]

const groundnutShipment: Shipment[] = [
  {
    id: "ship-9-1",
    carrier: "Hapag-Lloyd",
    documentNumber: "HLXU1234567",
    status: "arrived",
    origin: "Tema, Ghana",
    destination: "New York, USA",
    currentLocation: "New York, USA",
    eta: "2026-08-14T00:00:00.000Z",
    note: null,
    events: [
      { id: "evt-9-1-1", type: "booked", label: "Booked", location: "Tema, Ghana", at: "2026-08-02T09:00:00.000Z", note: null },
      { id: "evt-9-1-2", type: "departed", label: "Departed origin", location: "Tema, Ghana", at: "2026-08-04T07:00:00.000Z", note: null },
      { id: "evt-9-1-3", type: "arrived-port", label: "Arrived at destination port", location: "New York, USA", at: "2026-08-13T09:00:00.000Z", note: null },
      { id: "evt-9-1-4", type: "delivered", label: "Delivered", location: "New York, USA", at: "2026-08-15T09:00:00.000Z", note: "Received at destination warehouse, no exceptions." },
    ],
    createdAt: "2026-08-02T09:00:00.000Z",
    updatedAt: "2026-08-15T09:00:00.000Z",
  },
]

const pomegranateShipment: Shipment[] = [
  {
    id: "ship-10-1",
    carrier: "MSC",
    documentNumber: "MSCU9987654",
    status: "arrived",
    origin: "Nhava Sheva, India",
    destination: "Dubai, UAE",
    currentLocation: "Dubai, UAE",
    eta: "2026-07-27T00:00:00.000Z",
    note: null,
    events: [
      { id: "evt-10-1-1", type: "booked", label: "Booked", location: "Nhava Sheva, India", at: "2026-07-14T09:00:00.000Z", note: null },
      { id: "evt-10-1-2", type: "departed", label: "Departed origin", location: "Nhava Sheva, India", at: "2026-07-16T07:00:00.000Z", note: null },
      { id: "evt-10-1-3", type: "arrived-port", label: "Arrived at destination port", location: "Dubai, UAE", at: "2026-07-26T09:00:00.000Z", note: null },
      { id: "evt-10-1-4", type: "delivered", label: "Delivered", location: "Dubai, UAE", at: "2026-07-28T09:00:00.000Z", note: null },
    ],
    createdAt: "2026-07-14T09:00:00.000Z",
    updatedAt: "2026-07-28T09:00:00.000Z",
  },
]

const SEED_DEALS: Deal[] = [
  // 1. Declined — the first attempt on this conversation.
  {
    id: "deal-1",
    conversationId: conv1Id,
    listingId: "seed-1",
    listingTitle: "Bhagwa Pomegranate — Grade A+ (Krishna Valley Farmers Cooperative)",
    buyerId: "procurement@globalfoods.example",
    buyerName: "Global Foods Imports",
    sellerId: "seed-krishna-valley",
    sellerName: "Krishna Valley Farmers Cooperative",
    status: "declined",
    proposedBy: "buyer",
    agreedPricePerTonneUsd: 950,
    agreedQuantityMt: 45,
    proposedAt: "2026-08-05T10:05:00.000Z",
    respondedAt: "2026-08-06T09:00:00.000Z",
    declineReason: "Price too low for current market — happy to revisit at $985/t or above.",
    stage: null,
    stageHistory: [],
    assignedKamId: null,
    assignedKamName: null,
    assignmentHistory: [],
    costing: emptyCosting,
    contracting: emptyContracting,
    compliance: emptyCompliance,
    shipments: [],
    payment: emptyPayment,
    createdAt: "2026-08-05T10:05:00.000Z",
    updatedAt: "2026-08-06T09:00:00.000Z",
  },
  // 2. Proposed — the re-proposed successor, same conversation as #1.
  {
    id: "deal-2",
    conversationId: conv1Id,
    listingId: "seed-1",
    listingTitle: "Bhagwa Pomegranate — Grade A+ (Krishna Valley Farmers Cooperative)",
    buyerId: "procurement@globalfoods.example",
    buyerName: "Global Foods Imports",
    sellerId: "seed-krishna-valley",
    sellerName: "Krishna Valley Farmers Cooperative",
    status: "proposed",
    proposedBy: "buyer",
    agreedPricePerTonneUsd: 985,
    agreedQuantityMt: 45,
    proposedAt: "2026-08-06T11:20:00.000Z",
    respondedAt: null,
    declineReason: null,
    stage: null,
    stageHistory: [],
    assignedKamId: null,
    assignedKamName: null,
    assignmentHistory: [],
    costing: emptyCosting,
    contracting: emptyContracting,
    compliance: emptyCompliance,
    shipments: [],
    payment: emptyPayment,
    createdAt: "2026-08-06T11:20:00.000Z",
    updatedAt: "2026-08-06T11:20:00.000Z",
  },
  // 3. Proposed — bare, unrelated conversation, seller-initiated.
  {
    id: "deal-3",
    conversationId: conv2Id,
    listingId: "seed-2",
    listingTitle: "Arabica Plantation A — Grade A+ (Coorg Estates Coffee Growers)",
    buyerId: "trade@meridiancoffee.example",
    buyerName: "Meridian Coffee Traders",
    sellerId: "seed-coorg-estates",
    sellerName: "Coorg Estates Coffee Growers",
    status: "proposed",
    proposedBy: "seller",
    agreedPricePerTonneUsd: 4350,
    agreedQuantityMt: 20,
    proposedAt: "2026-08-10T08:30:00.000Z",
    respondedAt: null,
    declineReason: null,
    stage: null,
    stageHistory: [],
    assignedKamId: null,
    assignedKamName: null,
    assignmentHistory: [],
    costing: emptyCosting,
    contracting: emptyContracting,
    compliance: emptyCompliance,
    shipments: [],
    payment: emptyPayment,
    createdAt: "2026-08-10T08:30:00.000Z",
    updatedAt: "2026-08-10T08:30:00.000Z",
  },
  // 4. Active, costing — unassigned, needs a KAM.
  {
    id: "deal-4",
    conversationId: conversationId("orders@northstaragro.example", "seed-kerala-cashew", "seed-3"),
    listingId: "seed-3",
    listingTitle: "W-240 Cashew Kernels — Grade A+ (Kerala Cashew Traders)",
    buyerId: "orders@northstaragro.example",
    buyerName: "Northstar Agro",
    sellerId: "seed-kerala-cashew",
    sellerName: "Kerala Cashew Traders",
    status: "active",
    proposedBy: "buyer",
    agreedPricePerTonneUsd: 5450,
    agreedQuantityMt: 15,
    proposedAt: "2026-08-12T09:00:00.000Z",
    respondedAt: "2026-08-13T10:00:00.000Z",
    declineReason: null,
    stage: "costing",
    stageHistory: [{ stage: "costing", at: "2026-08-13T10:00:00.000Z", by: "System", note: "Deal finalized — pipeline started" }],
    assignedKamId: null,
    assignedKamName: null,
    assignmentHistory: [],
    costing: emptyCosting,
    contracting: emptyContracting,
    compliance: emptyCompliance,
    shipments: [],
    payment: emptyPayment,
    createdAt: "2026-08-12T09:00:00.000Z",
    updatedAt: "2026-08-13T10:00:00.000Z",
  },
  // 5. Active, costing — assigned to Arjun, costing in progress.
  {
    id: "deal-5",
    conversationId: conversationId("sourcing@everestfoodstuffs.example", "seed-mekong-grain", "seed-4"),
    listingId: "seed-4",
    listingTitle: "Jasmine Rice — Grade A (Mekong Grain Traders)",
    buyerId: "sourcing@everestfoodstuffs.example",
    buyerName: "Everest Foodstuffs",
    sellerId: "seed-mekong-grain",
    sellerName: "Mekong Grain Traders",
    status: "active",
    proposedBy: "buyer",
    agreedPricePerTonneUsd: 335,
    agreedQuantityMt: 50,
    proposedAt: "2026-08-14T09:00:00.000Z",
    respondedAt: "2026-08-15T09:30:00.000Z",
    declineReason: null,
    stage: "costing",
    stageHistory: [{ stage: "costing", at: "2026-08-15T09:30:00.000Z", by: "System", note: "Deal finalized — pipeline started" }],
    assignedKamId: "arjun@amama.com",
    assignedKamName: "Arjun Mehta",
    assignmentHistory: [{ kamId: "arjun@amama.com", kamName: "Arjun Mehta", assignedBy: "Master Admin", at: "2026-08-15T10:00:00.000Z" }],
    costing: { incoterm: "FOB", paymentTerm: null, proformaInvoiceNo: null, notes: "Drafting proforma invoice — awaiting buyer's payment term preference." },
    contracting: emptyContracting,
    compliance: emptyCompliance,
    shipments: [],
    payment: emptyPayment,
    createdAt: "2026-08-14T09:00:00.000Z",
    updatedAt: "2026-08-15T10:00:00.000Z",
  },
  // 6. Active, contracting — assigned to Priya.
  {
    id: "deal-6",
    conversationId: conversationId("sourcing@sunrisewholesale.example", "seed-rift-valley-sesame", "seed-5"),
    listingId: "seed-5",
    listingTitle: "Natural White Sesame — Grade A (Rift Valley Sesame Growers)",
    buyerId: "sourcing@sunrisewholesale.example",
    buyerName: "Sunrise Wholesale",
    sellerId: "seed-rift-valley-sesame",
    sellerName: "Rift Valley Sesame Growers",
    status: "active",
    proposedBy: "seller",
    agreedPricePerTonneUsd: 1550,
    agreedQuantityMt: 20,
    proposedAt: "2026-08-14T11:00:00.000Z",
    respondedAt: "2026-08-15T12:00:00.000Z",
    declineReason: null,
    stage: "contracting",
    stageHistory: [
      { stage: "costing", at: "2026-08-15T12:00:00.000Z", by: "System", note: "Deal finalized — pipeline started" },
      { stage: "contracting", at: "2026-08-18T09:00:00.000Z", by: "Priya Nair", note: "Costing signed off, moving to contract drafting." },
    ],
    assignedKamId: "priya@amama.com",
    assignedKamName: "Priya Nair",
    assignmentHistory: [{ kamId: "priya@amama.com", kamName: "Priya Nair", assignedBy: "Master Admin", at: "2026-08-15T13:00:00.000Z" }],
    costing: { incoterm: "CIF", paymentTerm: "30% advance, 70% on BL", proformaInvoiceNo: "PI-2026-0814", notes: null },
    contracting: { contractRef: null, signedOff: false, notes: "Contract draft sent to both parties for review." },
    compliance: emptyCompliance,
    shipments: [],
    payment: emptyPayment,
    createdAt: "2026-08-14T11:00:00.000Z",
    updatedAt: "2026-08-18T09:00:00.000Z",
  },
  // 7. Active, compliance — assigned to Priya.
  {
    id: "deal-7",
    conversationId: conversationId("hello@pacificrimtraders.example", "seed-ceylon-spice", "seed-6"),
    listingId: "seed-6",
    listingTitle: "Alba Cinnamon Quills — Grade A+ (Ceylon Spice Gardens)",
    buyerId: "hello@pacificrimtraders.example",
    buyerName: "Pacific Rim Traders",
    sellerId: "seed-ceylon-spice",
    sellerName: "Ceylon Spice Gardens",
    status: "active",
    proposedBy: "buyer",
    agreedPricePerTonneUsd: 3300,
    agreedQuantityMt: 10,
    proposedAt: "2026-08-16T09:00:00.000Z",
    respondedAt: "2026-08-17T09:00:00.000Z",
    declineReason: null,
    stage: "compliance",
    stageHistory: [
      { stage: "costing", at: "2026-08-17T09:00:00.000Z", by: "System", note: "Deal finalized — pipeline started" },
      { stage: "contracting", at: "2026-08-20T10:00:00.000Z", by: "Priya Nair", note: "Contract signed by both sides." },
      { stage: "compliance", at: "2026-08-24T09:00:00.000Z", by: "Priya Nair", note: "Moving into QC & customs prep." },
    ],
    assignedKamId: "priya@amama.com",
    assignedKamName: "Priya Nair",
    assignmentHistory: [{ kamId: "priya@amama.com", kamName: "Priya Nair", assignedBy: "Master Admin", at: "2026-08-17T10:00:00.000Z" }],
    costing: { incoterm: "FOB", paymentTerm: "100% advance", proformaInvoiceNo: "PI-2026-0816", notes: null },
    contracting: { contractRef: "CTR-2026-0091", signedOff: true, notes: null },
    compliance: {
      phytosanitaryCert: true,
      labReport: true,
      certificateOfOrigin: false,
      customsDocs: false,
      freightBooked: false,
      notes: "Awaiting certificate of origin from the local chamber of commerce.",
    },
    shipments: [],
    payment: emptyPayment,
    createdAt: "2026-08-16T09:00:00.000Z",
    updatedAt: "2026-08-24T09:00:00.000Z",
  },
  // 8. Active, shipping — assigned to Arjun. The demo buyer/seller accounts,
  // with two shipments each carrying their own distinct event timeline.
  {
    id: "deal-8",
    conversationId: conv3Id,
    listingId: "demo-tea-1",
    listingTitle: "Nilgiri Orthodox Tea — Grade A",
    buyerId: "buyer@amama.com",
    buyerName: "Vikram Shah",
    sellerId: "seller@amama.com",
    sellerName: "Ravi Kumar",
    status: "active",
    proposedBy: "buyer",
    agreedPricePerTonneUsd: 2950,
    agreedQuantityMt: 12,
    proposedAt: "2026-08-18T09:00:00.000Z",
    respondedAt: "2026-08-19T09:00:00.000Z",
    declineReason: null,
    stage: "shipping",
    stageHistory: [
      { stage: "costing", at: "2026-08-19T09:00:00.000Z", by: "System", note: "Deal finalized — pipeline started" },
      { stage: "contracting", at: "2026-08-21T10:00:00.000Z", by: "Arjun Mehta", note: "Contract signed." },
      { stage: "compliance", at: "2026-08-24T09:00:00.000Z", by: "Arjun Mehta", note: "All pre-shipment docs cleared." },
      { stage: "shipping", at: "2026-08-26T09:00:00.000Z", by: "Arjun Mehta", note: "Containers booked, moving to shipment tracking." },
    ],
    assignedKamId: "arjun@amama.com",
    assignedKamName: "Arjun Mehta",
    assignmentHistory: [{ kamId: "arjun@amama.com", kamName: "Arjun Mehta", assignedBy: "Master Admin", at: "2026-08-19T10:00:00.000Z" }],
    costing: { incoterm: "CIF", paymentTerm: "50% advance, 50% on delivery", proformaInvoiceNo: "PI-2026-0818", notes: null },
    contracting: { contractRef: "CTR-2026-0104", signedOff: true, notes: null },
    compliance: {
      phytosanitaryCert: true,
      labReport: true,
      certificateOfOrigin: true,
      customsDocs: true,
      freightBooked: true,
      notes: null,
    },
    shipments: teaShipments,
    payment: emptyPayment,
    createdAt: "2026-08-18T09:00:00.000Z",
    updatedAt: "2026-09-05T00:00:00.000Z",
  },
  // 9. Active, delivered — assigned to Priya, payment still unsettled.
  {
    id: "deal-9",
    conversationId: conversationId("team@deltacommodities.example", "seed-savannah-nuts", "seed-8"),
    listingId: "seed-8",
    listingTitle: "Bold Groundnut — Grade A (Savannah Groundnut Cooperative)",
    buyerId: "team@deltacommodities.example",
    buyerName: "Delta Commodities",
    sellerId: "seed-savannah-nuts",
    sellerName: "Savannah Groundnut Cooperative",
    status: "active",
    proposedBy: "buyer",
    agreedPricePerTonneUsd: 6300,
    agreedQuantityMt: 18,
    proposedAt: "2026-07-20T09:00:00.000Z",
    respondedAt: "2026-07-21T09:00:00.000Z",
    declineReason: null,
    stage: "delivered",
    stageHistory: [
      { stage: "costing", at: "2026-07-21T09:00:00.000Z", by: "System", note: "Deal finalized — pipeline started" },
      { stage: "contracting", at: "2026-07-25T09:00:00.000Z", by: "Priya Nair", note: "Contract signed." },
      { stage: "compliance", at: "2026-07-30T09:00:00.000Z", by: "Priya Nair", note: "All pre-shipment docs cleared." },
      { stage: "shipping", at: "2026-08-02T09:00:00.000Z", by: "Priya Nair", note: "Container departed Tema port." },
      { stage: "delivered", at: "2026-08-15T09:00:00.000Z", by: "Priya Nair", note: "Confirmed delivered at destination warehouse." },
    ],
    assignedKamId: "priya@amama.com",
    assignedKamName: "Priya Nair",
    assignmentHistory: [{ kamId: "priya@amama.com", kamName: "Priya Nair", assignedBy: "Master Admin", at: "2026-07-21T10:00:00.000Z" }],
    costing: { incoterm: "CIF", paymentTerm: "50% advance, 50% on BL", proformaInvoiceNo: "PI-2026-0720", notes: null },
    contracting: { contractRef: "CTR-2026-0058", signedOff: true, notes: null },
    compliance: {
      phytosanitaryCert: true,
      labReport: true,
      certificateOfOrigin: true,
      customsDocs: true,
      freightBooked: true,
      notes: null,
    },
    shipments: groundnutShipment,
    payment: { settled: false, settledAt: null, notes: "Invoice sent — awaiting payment confirmation from the buyer's bank." },
    createdAt: "2026-07-20T09:00:00.000Z",
    updatedAt: "2026-08-15T09:00:00.000Z",
  },
  // 10. Active, paid — assigned to Arjun, fully settled. Same listing as #1
  // and #2, different buyer — a seller can have more than one live deal.
  {
    id: "deal-10",
    conversationId: conversationId("info@coastalimport.example", "seed-krishna-valley", "seed-1"),
    listingId: "seed-1",
    listingTitle: "Bhagwa Pomegranate — Grade A+ (Krishna Valley Farmers Cooperative)",
    buyerId: "info@coastalimport.example",
    buyerName: "Coastal Import Co",
    sellerId: "seed-krishna-valley",
    sellerName: "Krishna Valley Farmers Cooperative",
    status: "active",
    proposedBy: "buyer",
    agreedPricePerTonneUsd: 820,
    agreedQuantityMt: 30,
    proposedAt: "2026-07-01T09:00:00.000Z",
    respondedAt: "2026-07-02T09:00:00.000Z",
    declineReason: null,
    stage: "paid",
    stageHistory: [
      { stage: "costing", at: "2026-07-02T09:00:00.000Z", by: "System", note: "Deal finalized — pipeline started" },
      { stage: "contracting", at: "2026-07-06T09:00:00.000Z", by: "Arjun Mehta", note: "Contract signed." },
      { stage: "compliance", at: "2026-07-10T09:00:00.000Z", by: "Arjun Mehta", note: "All pre-shipment docs cleared." },
      { stage: "shipping", at: "2026-07-14T09:00:00.000Z", by: "Arjun Mehta", note: "Container departed Nhava Sheva." },
      { stage: "delivered", at: "2026-07-28T09:00:00.000Z", by: "Arjun Mehta", note: "Confirmed delivered." },
      { stage: "paid", at: "2026-08-01T09:00:00.000Z", by: "Arjun Mehta", note: "Payment received in full." },
    ],
    assignedKamId: "arjun@amama.com",
    assignedKamName: "Arjun Mehta",
    assignmentHistory: [{ kamId: "arjun@amama.com", kamName: "Arjun Mehta", assignedBy: "Master Admin", at: "2026-07-02T10:00:00.000Z" }],
    costing: { incoterm: "FOB", paymentTerm: "100% on BL", proformaInvoiceNo: "PI-2026-0701", notes: null },
    contracting: { contractRef: "CTR-2026-0032", signedOff: true, notes: null },
    compliance: {
      phytosanitaryCert: true,
      labReport: true,
      certificateOfOrigin: true,
      customsDocs: true,
      freightBooked: true,
      notes: null,
    },
    shipments: pomegranateShipment,
    payment: { settled: true, settledAt: "2026-08-01T09:00:00.000Z", notes: "Full payment received via wire transfer." },
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-08-01T09:00:00.000Z",
  },
]

const priyaArjunDmId = staffDmChannelId("priya@amama.com", "arjun@amama.com")

const SEED_STAFF_MESSAGES: Record<string, StaffChatMessage[]> = {
  [STAFF_GROUP_CHANNEL_ID]: [
    {
      id: "staffmsg-seed-1",
      channelId: STAFF_GROUP_CHANNEL_ID,
      from: { id: "admin@amama.com", name: "Master Admin", role: "Master Admin" },
      text: "Welcome Leela — @Leela Krishnan will be handling Compliance reviews going forward, alongside listings moderation.",
      mentions: ["leela@amama.com"],
      at: "2026-08-01T09:10:00.000Z",
    },
    {
      id: "staffmsg-seed-2",
      channelId: STAFF_GROUP_CHANNEL_ID,
      from: { id: "priya@amama.com", name: "Priya Nair", role: "KAM" },
      text: "Heads up — Ceylon Spice Gardens' cinnamon listing got flagged for stock photos, buyer traffic on that one will dip until they fix it.",
      mentions: [],
      at: "2026-08-20T11:35:00.000Z",
    },
    {
      id: "staffmsg-seed-3",
      channelId: STAFF_GROUP_CHANNEL_ID,
      from: { id: "arjun@amama.com", name: "Arjun Mehta", role: "KAM" },
      text: "Noted, thanks. Both my active shipments this week are on schedule so far.",
      mentions: [],
      at: "2026-08-20T13:05:00.000Z",
    },
  ],
  [STAFF_ANNOUNCEMENTS_CHANNEL_ID]: [
    {
      id: "staffmsg-seed-4",
      channelId: STAFF_ANNOUNCEMENTS_CHANNEL_ID,
      from: { id: "admin@amama.com", name: "Master Admin", role: "Master Admin" },
      text: "Team roles are now permission-based — Team → Roles shows exactly what each role can touch. Ping me if anyone needs a permission adjusted.",
      mentions: [],
      at: "2026-08-01T09:15:00.000Z",
    },
  ],
  [priyaArjunDmId]: [
    {
      id: "staffmsg-seed-5",
      channelId: priyaArjunDmId,
      from: { id: "priya@amama.com", name: "Priya Nair", role: "KAM" },
      text: "Can you take the Everest Foodstuffs rice deal? I'm stretched thin on compliance docs this week.",
      mentions: [],
      at: "2026-08-15T09:45:00.000Z",
    },
    {
      id: "staffmsg-seed-6",
      channelId: priyaArjunDmId,
      from: { id: "arjun@amama.com", name: "Arjun Mehta", role: "KAM" },
      text: "Sure, already assigned to me — moving it through costing now.",
      mentions: [],
      at: "2026-08-15T10:05:00.000Z",
    },
  ],
}

const SEED_SUBMISSIONS: Partial<VerificationStore> = {
  buyer: {
    role: "buyer",
    status: "pending",
    applicant: {
      fullName: "Vikram Shah",
      email: "buyer@amama.com",
      country: "AE",
      entityType: "organization",
    },
    documents: [
      { id: "governmentId", name: "vikram-passport.pdf", size: 812_000, required: true, reviewStatus: "pending", reviewNote: null },
      { id: "gstin", name: "globalfoods-gstin.pdf", size: 245_000, required: true, reviewStatus: "pending", reviewNote: null },
      { id: "bankDetails", name: "globalfoods-bank-letter.pdf", size: 190_000, required: false, reviewStatus: "pending", reviewNote: null },
    ],
    submittedAt: "2026-09-10T10:00:00.000Z",
    reviewedAt: null,
    reviewerNote: null,
    reviewedByKamId: null,
    reviewedByKamName: null,
  },
  seller: {
    role: "seller",
    status: "changes-requested",
    applicant: {
      fullName: "Ravi Kumar",
      email: "seller@amama.com",
      country: "IN",
      entityType: "individual",
      sellerSubType: "producer",
    },
    documents: [
      { id: "governmentId", name: "ravi-aadhaar.pdf", size: 540_000, required: true, reviewStatus: "approved", reviewNote: null },
      {
        id: "landProof",
        name: "land-lease.jpg",
        size: 2_150_000,
        required: true,
        reviewStatus: "rejected",
        reviewNote: "Lease agreement photo is blurry — please re-upload a clearer scan.",
      },
      { id: "farmPhoto", name: "farm-geotag.jpg", size: 1_340_000, required: true, reviewStatus: "approved", reviewNote: null },
      { id: "bankDetails", name: "ravi-bank-details.pdf", size: 165_000, required: false, reviewStatus: "pending", reviewNote: null },
    ],
    submittedAt: "2026-09-08T08:00:00.000Z",
    reviewedAt: "2026-09-09T09:30:00.000Z",
    reviewerNote: "Please re-upload a clearer copy of your land lease proof — the rest looks good.",
    reviewedByKamId: "leela@amama.com",
    reviewedByKamName: "Leela Krishnan",
  },
}

/**
 * Seeds every admin-side demo store, but only once per browser — a version
 * flag alongside each store's own belt-and-suspenders "only if empty"
 * guard, since a store that already has real (non-seed) data should never
 * be silently overwritten just because someone reloaded the page. Runs
 * from `AdminShell`, after the signed-out guard, so it only ever fires for
 * a real session — users/roles seed themselves independently the first
 * time either of those stores is read.
 */
function seedAdminDemoData() {
  if (typeof window === "undefined") return
  if (window.localStorage.getItem("amama.admin.seedVersion") === "1") return
  seedDealsIfEmpty(SEED_DEALS)
  seedConversationsIfEmpty(SEED_CONVERSATIONS)
  seedStaffChatIfEmpty(SEED_STAFF_MESSAGES)
  seedSubmissionsIfEmpty(SEED_SUBMISSIONS)
  window.localStorage.setItem("amama.admin.seedVersion", "1")
}

export { seedAdminDemoData }
