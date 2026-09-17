import {
  conversationId,
  seedConversationsIfEmpty,
  type Conversation,
} from "@/features/marketplace/conversation-store"
import { seedDealsIfEmpty, type Deal, type DealSeed, type Shipment } from "@/features/marketplace/deal-store"
import { seedContractsIfEmpty, type Contract } from "@/features/contracts/contract-store"
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
 * `buyer@amama.in` (Vikram Shah) and `seller@amama.in` (Ravi Kumar) are the
 * two accounts a client demo actually logs in as — `LoginScreen`'s "quick
 * login" button loads one of `demo-accounts.ts`'s finished drafts straight
 * into `useOnboarding()` and routes to the dashboard, skipping the wizard
 * entirely. Their onboarding applications are seeded straight to
 * "approved" (see `SEED_SUBMISSIONS` below) for exactly that reason — a
 * demo login can't sit behind a review wait. The tradeoff: since
 * `verification-context.tsx` holds exactly one `Submission` per role for
 * the whole app, this means the admin Home review queue has nothing
 * buyer/seller-side left to demo live (both slots are spent making these
 * two instantly-approved). If that's ever needed back, verification would
 * need to key by account rather than one global slot per role — not done
 * here. The rest of the seeded deals use throwaway buyer/seller emails
 * that were never onboarded, so only the admin console ever sees them.
 */

const conv1Id = conversationId("procurement@globalfoods.example", "seed-krishna-valley", "seed-1")
const conv2Id = conversationId("trade@meridiancoffee.example", "seed-coorg-estates", "seed-2")
const conv3Id = conversationId("buyer@amama.in", "seller@amama.in", "demo-tea-1")
const conv4Id = conversationId("buyer@amama.in", "seller@amama.in", "demo-pepper-1")
const conv5Id = conversationId("buyer@amama.in", "seller@amama.in", "demo-cashew-1")

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
      {
        from: "buyer",
        text: "Global Foods Imports proposed a deal: $950/t × 45 MT.",
        at: "2026-08-05T10:05:00.000Z",
        card: { kind: "proposal", dealId: "deal-1", roundId: "deal-1-round-1" },
      },
      { from: "seller", text: "That's a bit low for this grade — our floor right now is $985/t given export demand.", at: "2026-08-05T13:20:00.000Z" },
      { from: "buyer", text: "Understood — let's go with $985/t for the same 45 MT.", at: "2026-08-06T11:15:00.000Z" },
      {
        from: "buyer",
        text: "Global Foods Imports proposed a deal: $985/t × 45 MT.",
        at: "2026-08-06T11:20:00.000Z",
        card: { kind: "proposal", dealId: "deal-2", roundId: "deal-2-round-1" },
      },
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
      {
        from: "seller",
        text: "Coorg Estates Coffee Growers proposed a deal: $4,350/t × 20 MT.",
        at: "2026-08-10T08:30:00.000Z",
        card: { kind: "proposal", dealId: "deal-3", roundId: "deal-3-round-1" },
      },
    ],
  },
  {
    id: conv3Id,
    buyerId: "buyer@amama.in",
    buyerName: "Vikram Shah",
    sellerId: "seller@amama.in",
    sellerName: "Ravi Kumar",
    listingId: "demo-tea-1",
    listingTitle: "Nilgiri Orthodox Tea — Grade A",
    messages: [
      { from: "buyer", text: "Hi — could we do 12 MT of your Nilgiri Orthodox at $2,950/t, CIF?", at: "2026-08-18T09:00:00.000Z" },
      {
        from: "buyer",
        text: "Vikram Shah proposed a deal: $2,950/t × 12 MT.",
        at: "2026-08-18T09:01:00.000Z",
        card: { kind: "proposal", dealId: "deal-8", roundId: "deal-8-round-1" },
      },
      { from: "seller", text: "Works for us — confirming.", at: "2026-08-19T08:30:00.000Z" },
      {
        from: "system",
        text: "Ravi Kumar accepted the deal — both sides are agreed at $2,950/t × 12 MT. An account manager will take it from here.",
        at: "2026-08-19T09:00:00.000Z",
      },
    ],
  },
  /* Proposal, counter, then acceptance — the buyer opened, the seller
   * countered, and the buyer took the counter. This is "bullet 1" of the
   * demo narrative: negotiated entirely in chat, agreed, and not yet
   * picked up by a KAM (see deal-11 below — unassigned on purpose, so
   * this is the one that shows up under "Needs a team member"). */
  {
    id: conv4Id,
    buyerId: "buyer@amama.in",
    buyerName: "Vikram Shah",
    sellerId: "seller@amama.in",
    sellerName: "Ravi Kumar",
    listingId: "demo-pepper-1",
    listingTitle: "Malabar Black Pepper — Grade A+",
    messages: [
      { from: "buyer", text: "Your Malabar pepper looks right for us. Can you do 8 MT at $5,100/t?", at: "2026-09-02T10:00:00.000Z" },
      {
        from: "buyer",
        text: "Vikram Shah proposed a deal: $5,100/t × 8 MT.",
        at: "2026-09-02T10:01:00.000Z",
        card: { kind: "proposal", dealId: "deal-11", roundId: "deal-11-round-1" },
      },
      { from: "seller", text: "Close. This lot is 550 g/l bulk density and garbled — I can't go under $5,450 on 8 MT.", at: "2026-09-03T07:40:00.000Z" },
      {
        from: "seller",
        text: "Ravi Kumar countered: $5,450/t × 8 MT.",
        at: "2026-09-03T07:45:00.000Z",
        card: { kind: "proposal", dealId: "deal-11", roundId: "deal-11-round-2" },
      },
      { from: "buyer", text: "Understood — fumigation certificate included, that works for us.", at: "2026-09-03T09:10:00.000Z" },
      {
        from: "system",
        text: "Vikram Shah accepted the deal — both sides are agreed at $5,450/t × 8 MT. An account manager will take it from here.",
        at: "2026-09-03T09:15:00.000Z",
      },
    ],
  },
  /* "Bullet 2" of the demo narrative — agreed, assigned, and already into
   * contracting: a Contract record exists (see `SEED_CONTRACTS` below)
   * with one party's term sheet already submitted and the other's still
   * open, so the buyer/seller sandboxing is visible live, not just
   * described. */
  {
    id: conv5Id,
    buyerId: "buyer@amama.in",
    buyerName: "Vikram Shah",
    sellerId: "seller@amama.in",
    sellerName: "Ravi Kumar",
    listingId: "demo-cashew-1",
    listingTitle: "W-320 Cashew Kernels — Grade A",
    messages: [
      { from: "buyer", text: "We'd like 18 MT of your W-320 cashew at $5,350/t, CIF.", at: "2026-09-10T09:00:00.000Z" },
      {
        from: "buyer",
        text: "Vikram Shah proposed a deal: $5,350/t × 18 MT.",
        at: "2026-09-10T09:01:00.000Z",
        card: { kind: "proposal", dealId: "deal-12", roundId: "deal-12-round-1" },
      },
      { from: "seller", text: "Happy to confirm at that price.", at: "2026-09-10T13:20:00.000Z" },
      {
        from: "system",
        text: "Ravi Kumar accepted the deal — both sides are agreed at $5,350/t × 18 MT. An account manager will take it from here.",
        at: "2026-09-10T13:25:00.000Z",
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair has opened contract AMA-2026-0001 for this deal and will guide both sides through it.",
        at: "2026-09-11T09:00:00.000Z",
        card: { kind: "contract", contractId: "contract-demo-1" },
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair asked Vikram Shah for: Import documentation. Tap to fill it in — you can save as you go.",
        at: "2026-09-11T09:05:00.000Z",
        card: { kind: "request", contractId: "contract-demo-1", requestId: "request-demo-1" },
        visibleTo: ["buyer", "kam"],
      },
      {
        from: "system",
        text: 'Vikram Shah completed "Import documentation".',
        at: "2026-09-12T11:40:00.000Z",
        visibleTo: ["buyer", "kam"],
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair asked Ravi Kumar for: Export documentation. Tap to fill it in — you can save as you go.",
        at: "2026-09-11T09:10:00.000Z",
        card: { kind: "request", contractId: "contract-demo-1", requestId: "request-demo-2" },
        visibleTo: ["seller", "kam"],
      },
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

/* Two legs in sequence — the truck that takes it from the estate to the
 * port, then the vessel — so the order journey's "Tracking & logistics"
 * sub-journey has a real multi-modal example to show rather than a single
 * ocean leg pretending to be one. */
const teaShipments: Shipment[] = [
  {
    id: "ship-8-0",
    mode: "trucking",
    carrier: "Nilgiri Road Freight",
    documentNumber: "NRF-4471",
    status: "arrived",
    origin: "Coonoor estate, Tamil Nadu",
    destination: "Kochi Port CFS",
    currentLocation: "Kochi Port CFS",
    eta: "2026-08-22T00:00:00.000Z",
    note: "Two trucks, 12 MT total.",
    events: [
      { id: "evt-8-0-1", type: "booked", label: "Booked", location: "Coonoor, Tamil Nadu", at: "2026-08-19T10:00:00.000Z", note: null },
      { id: "evt-8-0-2", type: "loaded", label: "Loaded at estate", location: "Coonoor estate", at: "2026-08-21T07:00:00.000Z", note: null },
      { id: "evt-8-0-3", type: "delivered", label: "Delivered to port", location: "Kochi Port CFS", at: "2026-08-22T13:00:00.000Z", note: "Handed over for stuffing." },
    ],
    createdAt: "2026-08-19T10:00:00.000Z",
    updatedAt: "2026-08-22T13:00:00.000Z",
  },
  {
    id: "ship-8-1",
    mode: "ocean",
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
    mode: "ocean",
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
    mode: "ocean",
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
    mode: "ocean",
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

const SEED_DEALS: DealSeed[] = [
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
    buyerId: "buyer@amama.in",
    buyerName: "Vikram Shah",
    sellerId: "seller@amama.in",
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
  /* 11. Agreed via a real counter-negotiation — spells its `rounds` out
   * rather than letting `normalizeDeal` synthesize one, because the point
   * of this row is the back-and-forth that got here: an opening offer,
   * a counter with two comments on it, and the buyer taking the counter.
   * Deliberately unassigned — "bullet 1" of the demo narrative is a deal
   * that's just reached mutual agreement and is sitting in "Needs a team
   * member," waiting for a KAM to pick it up. */
  {
    id: "deal-11",
    conversationId: conv4Id,
    listingId: "demo-pepper-1",
    listingTitle: "Malabar Black Pepper — Grade A+",
    buyerId: "buyer@amama.in",
    buyerName: "Vikram Shah",
    sellerId: "seller@amama.in",
    sellerName: "Ravi Kumar",
    status: "active",
    proposedBy: "seller",
    agreedPricePerTonneUsd: 5450,
    agreedQuantityMt: 8,
    proposedAt: "2026-09-02T10:01:00.000Z",
    respondedAt: "2026-09-03T09:15:00.000Z",
    declineReason: null,
    rounds: [
      {
        id: "deal-11-round-1",
        by: "buyer",
        byName: "Vikram Shah",
        pricePerTonneUsd: 5100,
        quantityMt: 8,
        incoterm: "CIF",
        deliveryWindow: "November 2026",
        note: "Happy to take the full lot if the price works.",
        at: "2026-09-02T10:01:00.000Z",
        outcome: "countered",
        outcomeBy: "Ravi Kumar",
        outcomeAt: "2026-09-03T07:45:00.000Z",
        outcomeNote: null,
        comments: [
          {
            id: "comment-11-1",
            by: "seller",
            byName: "Ravi Kumar",
            text: "Does that include the fumigation certificate?",
            at: "2026-09-02T15:10:00.000Z",
          },
          {
            id: "comment-11-2",
            by: "buyer",
            byName: "Vikram Shah",
            text: "Yes — we'd need it before loading.",
            at: "2026-09-02T16:02:00.000Z",
          },
        ],
      },
      {
        id: "deal-11-round-2",
        by: "seller",
        byName: "Ravi Kumar",
        pricePerTonneUsd: 5450,
        quantityMt: 8,
        incoterm: "CIF",
        deliveryWindow: "November 2026",
        note: "550 g/l, garbled, fumigation certificate included.",
        at: "2026-09-03T07:45:00.000Z",
        outcome: "accepted",
        outcomeBy: "Vikram Shah",
        outcomeAt: "2026-09-03T09:15:00.000Z",
        outcomeNote: null,
        comments: [],
      },
    ],
    stage: "costing",
    stageHistory: [{ stage: "costing", at: "2026-09-03T09:15:00.000Z", by: "System", note: "Deal finalized — pipeline started" }],
    assignedKamId: null,
    assignedKamName: null,
    assignmentHistory: [],
    costing: emptyCosting,
    contracting: emptyContracting,
    compliance: emptyCompliance,
    shipments: [],
    payment: emptyPayment,
    createdAt: "2026-09-02T10:01:00.000Z",
    updatedAt: "2026-09-03T09:15:00.000Z",
  },
  /* 12. "Bullet 2" of the demo narrative — agreed, assigned to Priya, and
   * already into contracting with a real `Contract` open (see
   * `SEED_CONTRACTS`): the term sheet has gone out to both sides, one
   * side has already sent theirs back. */
  {
    id: "deal-12",
    conversationId: conv5Id,
    listingId: "demo-cashew-1",
    listingTitle: "W-320 Cashew Kernels — Grade A",
    buyerId: "buyer@amama.in",
    buyerName: "Vikram Shah",
    sellerId: "seller@amama.in",
    sellerName: "Ravi Kumar",
    status: "active",
    proposedBy: "buyer",
    agreedPricePerTonneUsd: 5350,
    agreedQuantityMt: 18,
    proposedAt: "2026-09-10T09:01:00.000Z",
    respondedAt: "2026-09-10T13:25:00.000Z",
    declineReason: null,
    stage: "contracting",
    stageHistory: [
      { stage: "costing", at: "2026-09-10T13:25:00.000Z", by: "System", note: "Deal finalized — pipeline started" },
      {
        stage: "contracting",
        at: "2026-09-11T09:00:00.000Z",
        by: "Priya Nair",
        note: "Costing signed off — moving into contract drafting. Term sheet requested from both sides.",
      },
    ],
    assignedKamId: "priya@amama.com",
    assignedKamName: "Priya Nair",
    assignmentHistory: [{ kamId: "priya@amama.com", kamName: "Priya Nair", assignedBy: "Master Admin", at: "2026-09-10T14:00:00.000Z" }],
    costing: { incoterm: "CIF", paymentTerm: "30% advance, 70% on BL", proformaInvoiceNo: "PI-2026-0910", notes: null },
    contracting: {
      contractRef: "AMA-2026-0001",
      signedOff: false,
      notes: "Term sheet requests sent to both sides; contract drafting in progress.",
    },
    compliance: emptyCompliance,
    shipments: [],
    payment: emptyPayment,
    createdAt: "2026-09-10T09:01:00.000Z",
    updatedAt: "2026-09-11T09:10:00.000Z",
  },
]

const SEED_CONTRACTS: Contract[] = [
  {
    id: "contract-demo-1",
    reference: "AMA-2026-0001",
    dealId: "deal-12",
    conversationId: conv5Id,
    listingTitle: "W-320 Cashew Kernels — Grade A",
    buyerId: "buyer@amama.in",
    buyerName: "Vikram Shah",
    sellerId: "seller@amama.in",
    sellerName: "Ravi Kumar",
    kamId: "priya@amama.com",
    kamName: "Priya Nair",
    stage: "term-sheet",
    stageHistory: [
      { stage: "summary", at: "2026-09-11T09:00:00.000Z", by: "Priya Nair", note: "Contract opened from the agreed deal" },
      { stage: "term-sheet", at: "2026-09-11T09:00:00.000Z", by: "Priya Nair", note: "Details requested from both sides" },
    ],
    terms: {
      pricePerTonneUsd: 5350,
      quantityMt: 18,
      incoterm: "CIF",
      paymentTerm: "30% advance, 70% on BL",
      originPort: "Kochi, India",
      destinationPort: "Jebel Ali, UAE",
      qualitySpec: "W-320, max 5% moisture, aflatoxin-tested",
      notes: null,
    },
    requests: [
      {
        id: "request-demo-1",
        party: "buyer",
        title: "Import documentation",
        note: "Need your IEC and delivery address to finalize logistics.",
        fields: [
          { id: "field-demo-1", label: "Import Export Code (IEC)", type: "text", required: true, help: null, value: "AEIEC7788321" },
          {
            id: "field-demo-2",
            label: "Delivery address",
            type: "textarea",
            required: true,
            help: null,
            value: "Warehouse 12, Jebel Ali Free Zone, Dubai, UAE",
          },
        ],
        documents: [
          {
            id: "doc-demo-1",
            label: "Import licence copy",
            required: true,
            help: null,
            files: [{ id: "file-demo-1", name: "import-licence.pdf", size: 410_000, uploadedAt: "2026-09-12T11:35:00.000Z" }],
          },
        ],
        status: "submitted",
        submittedAt: "2026-09-12T11:40:00.000Z",
        updatedAt: "2026-09-12T11:40:00.000Z",
      },
      {
        id: "request-demo-2",
        party: "seller",
        title: "Export documentation",
        note: "Need your export packing format and bank details for this shipment.",
        fields: [
          {
            id: "field-demo-3",
            label: "Preferred packing format",
            type: "select",
            required: true,
            options: ["25kg tins", "50lb cartons", "Bulk bags"],
            help: null,
            value: null,
          },
        ],
        documents: [
          { id: "doc-demo-2", label: "Export licence / IEC", required: true, help: null, files: [] },
          { id: "doc-demo-3", label: "Bank details for payment", required: false, help: null, files: [] },
        ],
        status: "open",
        submittedAt: null,
        updatedAt: "2026-09-11T09:10:00.000Z",
      },
    ],
    draftBody: null,
    draftVersion: 0,
    amendments: [],
    approvals: { buyer: { agreed: false, at: null, by: null, note: null }, seller: { agreed: false, at: null, by: null, note: null } },
    signatures: { buyer: { agreed: false, at: null, by: null, note: null }, seller: { agreed: false, at: null, by: null, note: null } },
    shipmentDates: null,
    createdAt: "2026-09-11T09:00:00.000Z",
    updatedAt: "2026-09-12T11:40:00.000Z",
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
    status: "approved",
    applicant: {
      fullName: "Vikram Shah",
      email: "buyer@amama.in",
      country: "AE",
      entityType: "organization",
    },
    documents: [
      { id: "governmentId", name: "vikram-passport.pdf", size: 812_000, required: true, reviewStatus: "approved", reviewNote: null },
      { id: "gstin", name: "meridian-gstin.pdf", size: 245_000, required: true, reviewStatus: "approved", reviewNote: null },
      { id: "bankDetails", name: "meridian-bank-letter.pdf", size: 190_000, required: false, reviewStatus: "approved", reviewNote: null },
    ],
    submittedAt: "2026-09-08T10:00:00.000Z",
    reviewedAt: "2026-09-09T09:00:00.000Z",
    reviewerNote: null,
    reviewedByKamId: "leela@amama.com",
    reviewedByKamName: "Leela Krishnan",
  },
  seller: {
    role: "seller",
    status: "approved",
    applicant: {
      fullName: "Ravi Kumar",
      email: "seller@amama.in",
      country: "IN",
      entityType: "individual",
      sellerSubType: "trader",
    },
    documents: [
      { id: "governmentId", name: "ravi-aadhaar.pdf", size: 540_000, required: true, reviewStatus: "approved", reviewNote: null },
      { id: "iecCode", name: "ravi-iec-code.pdf", size: 210_000, required: true, reviewStatus: "approved", reviewNote: null },
      { id: "taxRegistration", name: "ravi-gst-certificate.pdf", size: 275_000, required: true, reviewStatus: "approved", reviewNote: null },
      { id: "bankDetails", name: "ravi-bank-details.pdf", size: 165_000, required: false, reviewStatus: "approved", reviewNote: null },
    ],
    submittedAt: "2026-09-06T08:00:00.000Z",
    reviewedAt: "2026-09-07T09:30:00.000Z",
    reviewerNote: null,
    reviewedByKamId: "arjun@amama.com",
    reviewedByKamName: "Arjun Mehta",
  },
}

/**
 * Seeds every demo store, but only once per browser — a version flag
 * alongside each store's own belt-and-suspenders "only if empty" guard,
 * since a store that already has real (non-seed) data should never be
 * silently overwritten just because someone reloaded the page. Runs from
 * `AdminShell`'s effect *and* from `LoginScreen`'s quick-login button —
 * idempotent either way, so it doesn't matter which door into the app
 * fires first. Users/roles seed themselves independently the first time
 * either of those stores is read.
 */
// Bump this whenever the seed content below meaningfully changes — each
// `seed*IfEmpty` only writes to a genuinely empty store, so a version
// bump alone wouldn't be enough to get fresh content into a browser that
// already ran an earlier generation of this file. See the clear-then-
// reseed step below.
const SEED_VERSION = "2"

function seedAdminDemoData() {
  if (typeof window === "undefined") return
  const seededVersion = window.localStorage.getItem("amama.admin.seedVersion")
  if (seededVersion === SEED_VERSION) return

  // A version mismatch (including "ran an older generation before this
  // constant existed") means the seed content itself changed underneath
  // whatever this browser already has — clear it so the fresh seed can
  // actually land instead of being silently skipped by each store's own
  // "only if empty" guard. This is a demo-only prototype with no real
  // backend anywhere, so a browser's accumulated demo state is always
  // disposable; it isn't real data anyone would lose.
  if (seededVersion !== null) {
    window.localStorage.removeItem("amama.marketplace.deals")
    window.localStorage.removeItem("amama.marketplace.conversations")
    window.localStorage.removeItem("amama.marketplace.listings")
    window.localStorage.removeItem("amama.admin.staffChat")
    window.localStorage.removeItem("amama.verification")
    window.localStorage.removeItem("amama.contracts")
  }

  seedDealsIfEmpty(SEED_DEALS)
  seedConversationsIfEmpty(SEED_CONVERSATIONS)
  seedStaffChatIfEmpty(SEED_STAFF_MESSAGES)
  seedSubmissionsIfEmpty(SEED_SUBMISSIONS)
  seedContractsIfEmpty(SEED_CONTRACTS)
  window.localStorage.setItem("amama.admin.seedVersion", SEED_VERSION)
}

export { seedAdminDemoData }
