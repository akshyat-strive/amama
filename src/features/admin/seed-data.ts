import {
  conversationId,
  seedConversationsIfEmpty,
  type Conversation,
} from "@/features/marketplace/conversation-store"
import { seedDealsIfEmpty, type Deal, type DealSeed, type Shipment } from "@/features/marketplace/deal-store"
import { seedContractsIfEmpty, type Contract } from "@/features/contracts/contract-store"
import { seedRfqsIfEmpty, SEED_RFQS } from "@/features/marketplace/rfq-store"
import {
  STAFF_ANNOUNCEMENTS_CHANNEL_ID,
  STAFF_GROUP_CHANNEL_ID,
  seedStaffChatIfEmpty,
  staffDmChannelId,
  type StaffChatMessage,
} from "@/features/admin/staff-chat-store"
/*
 * Fixed, readable content — no `Math.random()`/`Date.now()` — so every
 * fresh browser lands on the exact same demo state, and reloading never
 * grows any of it (each `seed*IfEmpty` below only writes once).
 *
 * `buyer@amama.in` (Vikram Shah) and `seller@amama.in` (Ravi Kumar) are the
 * two real, database-backed accounts a client demo logs in as — seeded as
 * pre-approved KYC applications by the identity seed route (see
 * `POST /api/dev/seed`), not by this file. That backend now keys a
 * profile per account rather than one global slot per role, so the admin
 * review queue can carry other buyer/seller applications at the same time
 * without spending its one slot on these two. The rest of the seeded
 * deals below use throwaway buyer/seller emails that were never onboarded,
 * so only the admin console ever sees them.
 */

const conv1Id = conversationId("procurement@globalfoods.example", "seed-krishna-valley", "seed-1")
const conv2Id = conversationId("trade@meridiancoffee.example", "seed-coorg-estates", "seed-2")
const conv3Id = conversationId("buyer@amama.in", "seller@amama.in", "demo-tea-1")
const conv4Id = conversationId("buyer@amama.in", "seller@amama.in", "demo-pepper-1")
const conv5Id = conversationId("buyer@amama.in", "seller@amama.in", "demo-cashew-1")

/* Conversations for deals that already existed in `SEED_DEALS` (deal-5,
 * deal-6, deal-7) but never had a matching thread here — now getting one
 * because each is picking up a new `Contract` below and the term-sheet
 * chatter needs somewhere real to post into. */
const conv6Id = conversationId("sourcing@everestfoodstuffs.example", "seed-mekong-grain", "seed-4")
const conv7Id = conversationId("sourcing@sunrisewholesale.example", "seed-rift-valley-sesame", "seed-5")
const conv8Id = conversationId("hello@pacificrimtraders.example", "seed-ceylon-spice", "seed-6")
/* Conversations for brand-new deals below. */
const conv9Id = conversationId("procurement@atlanticspice.example", "seed-malwa-coriander", "seed-9")
const conv10Id = conversationId("sourcing@silkrouteimports.example", "seed-nizamabad-turmeric", "seed-10")
const conv11Id = conversationId("trade@windsorfoods.example", "seed-idukki-cardamom", "seed-11")
const conv12Id = conversationId("procurement@northshorecommodities.example", "seed-godavari-chilli", "seed-12")

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
  /* Deal-5's thread — agreed by chat, then Arjun opens contract-demo-2 and
   * walks it all the way to a draft with one side's approval in. */
  {
    id: conv6Id,
    buyerId: "sourcing@everestfoodstuffs.example",
    buyerName: "Everest Foodstuffs",
    sellerId: "seed-mekong-grain",
    sellerName: "Mekong Grain Traders",
    listingId: "seed-4",
    listingTitle: "Jasmine Rice — Grade A (Mekong Grain Traders)",
    messages: [
      { from: "buyer", text: "We need 50 MT of your Jasmine Rice this quarter — can you do $335/t FOB?", at: "2026-08-14T09:00:00.000Z" },
      {
        from: "buyer",
        text: "Everest Foodstuffs proposed a deal: $335/t × 50 MT.",
        at: "2026-08-14T09:01:00.000Z",
        card: { kind: "proposal", dealId: "deal-5", roundId: "deal-5-round-1" },
      },
      { from: "seller", text: "Works for us at that price.", at: "2026-08-15T08:50:00.000Z" },
      {
        from: "system",
        text: "Mekong Grain Traders accepted the deal — both sides are agreed at $335/t × 50 MT. An account manager will take it from here.",
        at: "2026-08-15T09:30:00.000Z",
      },
      {
        from: "kam",
        fromName: "Arjun Mehta",
        text: "Arjun Mehta has opened contract AMA-2026-0002 for this deal and will guide both sides through it.",
        at: "2026-08-16T09:00:00.000Z",
        card: { kind: "contract", contractId: "contract-demo-2" },
      },
      {
        from: "kam",
        fromName: "Arjun Mehta",
        text: "Arjun Mehta opened the term sheet for contract AMA-2026-0002 — review each clause and agree it with the other side.",
        at: "2026-08-16T09:05:00.000Z",
        card: { kind: "term-sheet", contractId: "contract-demo-2" },
      },
      {
        from: "kam",
        fromName: "Arjun Mehta",
        text: "Arjun Mehta asked Everest Foodstuffs for: Import documentation. Tap to fill it in — you can save as you go.",
        at: "2026-08-17T09:00:00.000Z",
        card: { kind: "request", contractId: "contract-demo-2", requestId: "request-demo-3" },
        visibleTo: ["buyer", "kam"],
      },
      {
        from: "kam",
        fromName: "Arjun Mehta",
        text: "Arjun Mehta asked Mekong Grain Traders for: Export documentation. Tap to fill it in — you can save as you go.",
        at: "2026-08-17T09:05:00.000Z",
        card: { kind: "request", contractId: "contract-demo-2", requestId: "request-demo-4" },
        visibleTo: ["seller", "kam"],
      },
      {
        from: "buyer",
        fromName: "Everest Foodstuffs",
        text: "Everest Foodstuffs issued PO AMA-2026-0002 — it matches the agreed term sheet exactly, so this is now a binding order.",
        at: "2026-08-19T09:00:00.000Z",
        card: { kind: "po", contractId: "contract-demo-2" },
      },
      {
        from: "kam",
        fromName: "Arjun Mehta",
        text: "Arjun Mehta shared draft v1 of contract AMA-2026-0002. Both sides need to agree before it can be signed.",
        at: "2026-08-20T10:00:00.000Z",
        card: { kind: "final-draft", contractId: "contract-demo-2" },
      },
      {
        from: "system",
        text: "Everest Foodstuffs agreed to draft v1.",
        at: "2026-08-21T10:00:00.000Z",
      },
    ],
  },
  /* Deal-6's thread — agreed by chat, contract-demo-3 goes all the way to
   * a shared draft, then the seller asks for a change instead of signing
   * off, pulling it into amendments. */
  {
    id: conv7Id,
    buyerId: "sourcing@sunrisewholesale.example",
    buyerName: "Sunrise Wholesale",
    sellerId: "seed-rift-valley-sesame",
    sellerName: "Rift Valley Sesame Growers",
    listingId: "seed-5",
    listingTitle: "Natural White Sesame — Grade A (Rift Valley Sesame Growers)",
    messages: [
      { from: "seller", text: "We have 20 MT of natural white sesame ready — can offer at $1,550/t CIF.", at: "2026-08-14T11:00:00.000Z" },
      {
        from: "seller",
        text: "Rift Valley Sesame Growers proposed a deal: $1,550/t × 20 MT.",
        at: "2026-08-14T11:05:00.000Z",
        card: { kind: "proposal", dealId: "deal-6", roundId: "deal-6-round-1" },
      },
      { from: "buyer", text: "That works for us.", at: "2026-08-15T11:50:00.000Z" },
      {
        from: "system",
        text: "Sunrise Wholesale accepted the deal — both sides are agreed at $1,550/t × 20 MT. An account manager will take it from here.",
        at: "2026-08-15T12:00:00.000Z",
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair has opened contract AMA-2026-0003 for this deal and will guide both sides through it.",
        at: "2026-08-18T09:00:00.000Z",
        card: { kind: "contract", contractId: "contract-demo-3" },
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair opened the term sheet for contract AMA-2026-0003 — review each clause and agree it with the other side.",
        at: "2026-08-18T09:05:00.000Z",
        card: { kind: "term-sheet", contractId: "contract-demo-3" },
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair asked Sunrise Wholesale for: Import documentation. Tap to fill it in — you can save as you go.",
        at: "2026-08-19T09:00:00.000Z",
        card: { kind: "request", contractId: "contract-demo-3", requestId: "request-demo-5" },
        visibleTo: ["buyer", "kam"],
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair asked Rift Valley Sesame Growers for: Export documentation. Tap to fill it in — you can save as you go.",
        at: "2026-08-19T09:05:00.000Z",
        card: { kind: "request", contractId: "contract-demo-3", requestId: "request-demo-6" },
        visibleTo: ["seller", "kam"],
      },
      {
        from: "buyer",
        fromName: "Sunrise Wholesale",
        text: "Sunrise Wholesale issued PO AMA-2026-0003 — it matches the agreed term sheet exactly, so this is now a binding order.",
        at: "2026-08-22T09:00:00.000Z",
        card: { kind: "po", contractId: "contract-demo-3" },
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair shared draft v1 of contract AMA-2026-0003. Both sides need to agree before it can be signed.",
        at: "2026-08-23T09:00:00.000Z",
        card: { kind: "final-draft", contractId: "contract-demo-3" },
      },
      {
        from: "system",
        text: "Sunrise Wholesale agreed to draft v1.",
        at: "2026-08-24T09:00:00.000Z",
      },
      {
        from: "system",
        text: "Rift Valley Sesame Growers asked for a change: Payment terms should be 40% advance, 60% on BL — our cooperative's board requires a higher upfront share for first-time buyers.",
        at: "2026-08-25T11:00:00.000Z",
      },
    ],
  },
  /* Deal-7's thread — full lifecycle: agreed, contracted, signed by both
   * sides, and a shipping date already picked. Contract-demo-4 is the
   * "final" example. */
  {
    id: conv8Id,
    buyerId: "hello@pacificrimtraders.example",
    buyerName: "Pacific Rim Traders",
    sellerId: "seed-ceylon-spice",
    sellerName: "Ceylon Spice Gardens",
    listingId: "seed-6",
    listingTitle: "Alba Cinnamon Quills — Grade A+ (Ceylon Spice Gardens)",
    messages: [
      { from: "buyer", text: "Looking for 10 MT of Alba cinnamon quills — can you do $3,300/t FOB?", at: "2026-08-16T09:00:00.000Z" },
      {
        from: "buyer",
        text: "Pacific Rim Traders proposed a deal: $3,300/t × 10 MT.",
        at: "2026-08-16T09:01:00.000Z",
        card: { kind: "proposal", dealId: "deal-7", roundId: "deal-7-round-1" },
      },
      { from: "seller", text: "Confirmed, that works.", at: "2026-08-16T14:00:00.000Z" },
      {
        from: "system",
        text: "Ceylon Spice Gardens accepted the deal — both sides are agreed at $3,300/t × 10 MT. An account manager will take it from here.",
        at: "2026-08-17T09:00:00.000Z",
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair has opened contract AMA-2026-0004 for this deal and will guide both sides through it.",
        at: "2026-08-18T09:00:00.000Z",
        card: { kind: "contract", contractId: "contract-demo-4" },
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair opened the term sheet for contract AMA-2026-0004 — review each clause and agree it with the other side.",
        at: "2026-08-18T09:05:00.000Z",
        card: { kind: "term-sheet", contractId: "contract-demo-4" },
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair asked Pacific Rim Traders for: Import documentation. Tap to fill it in — you can save as you go.",
        at: "2026-08-19T09:00:00.000Z",
        card: { kind: "request", contractId: "contract-demo-4", requestId: "request-demo-7" },
        visibleTo: ["buyer", "kam"],
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair asked Ceylon Spice Gardens for: Export documentation. Tap to fill it in — you can save as you go.",
        at: "2026-08-19T09:05:00.000Z",
        card: { kind: "request", contractId: "contract-demo-4", requestId: "request-demo-8" },
        visibleTo: ["seller", "kam"],
      },
      {
        from: "buyer",
        fromName: "Pacific Rim Traders",
        text: "Pacific Rim Traders issued PO AMA-2026-0004 — it matches the agreed term sheet exactly, so this is now a binding order.",
        at: "2026-08-20T09:00:00.000Z",
        card: { kind: "po", contractId: "contract-demo-4" },
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair shared draft v1 of contract AMA-2026-0004. Both sides need to agree before it can be signed.",
        at: "2026-08-21T09:00:00.000Z",
        card: { kind: "final-draft", contractId: "contract-demo-4" },
      },
      { from: "system", text: "Pacific Rim Traders agreed to draft v1.", at: "2026-08-22T09:00:00.000Z" },
      { from: "system", text: "Ceylon Spice Gardens agreed to draft v1.", at: "2026-08-22T15:00:00.000Z" },
      {
        from: "system",
        text: "Both sides have agreed draft v1 — contract AMA-2026-0004 is ready to sign.",
        at: "2026-08-22T15:01:00.000Z",
      },
      { from: "system", text: "Pacific Rim Traders signed contract AMA-2026-0004.", at: "2026-08-24T09:00:00.000Z" },
      { from: "system", text: "Ceylon Spice Gardens signed contract AMA-2026-0004.", at: "2026-08-25T10:00:00.000Z" },
      {
        from: "system",
        text: "Contract AMA-2026-0004 is fully signed. Shipment planning starts now.",
        at: "2026-08-25T10:01:00.000Z",
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair offered 3 shipping dates — Pacific Rim Traders, pick the one that suits you.",
        at: "2026-08-26T10:00:00.000Z",
        card: { kind: "shipment-dates", contractId: "contract-demo-4" },
      },
      {
        from: "system",
        text: "Pacific Rim Traders picked 2 September 2026 for shipment. Priya Nair has been notified.",
        at: "2026-08-27T09:00:00.000Z",
      },
    ],
  },
  /* Deal-13 — new. Contract-demo-5 goes to "signatures" with the buyer
   * signed and the seller still pending, and a shipping-date poll sitting
   * open alongside it. */
  {
    id: conv9Id,
    buyerId: "procurement@atlanticspice.example",
    buyerName: "Atlantic Spice Importers",
    sellerId: "seed-malwa-coriander",
    sellerName: "Malwa Coriander Growers",
    listingId: "seed-9",
    listingTitle: "Eagle Grade Coriander Seeds — Grade A (Malwa Coriander Growers)",
    messages: [
      { from: "buyer", text: "We're after 25 MT of Eagle grade coriander seed — can you do $1,180/t CIF?", at: "2026-08-20T09:00:00.000Z" },
      {
        from: "buyer",
        text: "Atlantic Spice Importers proposed a deal: $1,180/t × 25 MT.",
        at: "2026-08-20T09:01:00.000Z",
        card: { kind: "proposal", dealId: "deal-13", roundId: "deal-13-round-1" },
      },
      { from: "seller", text: "Yes, that works for us.", at: "2026-08-20T15:00:00.000Z" },
      {
        from: "system",
        text: "Malwa Coriander Growers accepted the deal — both sides are agreed at $1,180/t × 25 MT. An account manager will take it from here.",
        at: "2026-08-21T09:00:00.000Z",
      },
      {
        from: "kam",
        fromName: "Arjun Mehta",
        text: "Arjun Mehta has opened contract AMA-2026-0005 for this deal and will guide both sides through it.",
        at: "2026-08-21T09:30:00.000Z",
        card: { kind: "contract", contractId: "contract-demo-5" },
      },
      {
        from: "kam",
        fromName: "Arjun Mehta",
        text: "Arjun Mehta opened the term sheet for contract AMA-2026-0005 — review each clause and agree it with the other side.",
        at: "2026-08-21T09:35:00.000Z",
        card: { kind: "term-sheet", contractId: "contract-demo-5" },
      },
      {
        from: "kam",
        fromName: "Arjun Mehta",
        text: "Arjun Mehta asked Atlantic Spice Importers for: Import documentation. Tap to fill it in — you can save as you go.",
        at: "2026-08-22T09:00:00.000Z",
        card: { kind: "request", contractId: "contract-demo-5", requestId: "request-demo-9" },
        visibleTo: ["buyer", "kam"],
      },
      {
        from: "kam",
        fromName: "Arjun Mehta",
        text: "Arjun Mehta asked Malwa Coriander Growers for: Export documentation. Tap to fill it in — you can save as you go.",
        at: "2026-08-22T09:05:00.000Z",
        card: { kind: "request", contractId: "contract-demo-5", requestId: "request-demo-10" },
        visibleTo: ["seller", "kam"],
      },
      {
        from: "buyer",
        fromName: "Atlantic Spice Importers",
        text: "Atlantic Spice Importers issued PO AMA-2026-0005 — it matches the agreed term sheet exactly, so this is now a binding order.",
        at: "2026-08-24T09:00:00.000Z",
        card: { kind: "po", contractId: "contract-demo-5" },
      },
      {
        from: "kam",
        fromName: "Arjun Mehta",
        text: "Arjun Mehta shared draft v1 of contract AMA-2026-0005. Both sides need to agree before it can be signed.",
        at: "2026-08-25T09:00:00.000Z",
        card: { kind: "final-draft", contractId: "contract-demo-5" },
      },
      { from: "system", text: "Atlantic Spice Importers agreed to draft v1.", at: "2026-08-26T09:00:00.000Z" },
      { from: "system", text: "Malwa Coriander Growers agreed to draft v1.", at: "2026-08-26T14:00:00.000Z" },
      {
        from: "system",
        text: "Both sides have agreed draft v1 — contract AMA-2026-0005 is ready to sign.",
        at: "2026-08-26T14:01:00.000Z",
      },
      { from: "system", text: "Atlantic Spice Importers signed contract AMA-2026-0005.", at: "2026-08-28T09:00:00.000Z" },
      {
        from: "kam",
        fromName: "Arjun Mehta",
        text: "Arjun Mehta offered 3 shipping dates — Atlantic Spice Importers, pick the one that suits you.",
        at: "2026-08-28T10:00:00.000Z",
        card: { kind: "shipment-dates", contractId: "contract-demo-5" },
      },
    ],
  },
  /* Deal-14 — new. Contract-demo-6 gets an agreed QC clause, then the
   * buyer's PO changes it at the moment of issuing — a counter-offer that
   * needs the seller's confirmation, leaving that one clause disputed. */
  {
    id: conv10Id,
    buyerId: "sourcing@silkrouteimports.example",
    buyerName: "Silk Route Imports",
    sellerId: "seed-nizamabad-turmeric",
    sellerName: "Nizamabad Turmeric Growers Collective",
    listingId: "seed-10",
    listingTitle: "Finger Turmeric — Grade A (Nizamabad Turmeric Growers Collective)",
    messages: [
      { from: "buyer", text: "We're looking at 30 MT of finger turmeric — can you do $2,650/t CIF?", at: "2026-08-25T09:00:00.000Z" },
      {
        from: "buyer",
        text: "Silk Route Imports proposed a deal: $2,650/t × 30 MT.",
        at: "2026-08-25T09:01:00.000Z",
        card: { kind: "proposal", dealId: "deal-14", roundId: "deal-14-round-1" },
      },
      { from: "seller", text: "Yes, that works for us.", at: "2026-08-25T15:00:00.000Z" },
      {
        from: "system",
        text: "Nizamabad Turmeric Growers Collective accepted the deal — both sides are agreed at $2,650/t × 30 MT. An account manager will take it from here.",
        at: "2026-08-26T09:00:00.000Z",
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair has opened contract AMA-2026-0006 for this deal and will guide both sides through it.",
        at: "2026-08-26T09:10:00.000Z",
        card: { kind: "contract", contractId: "contract-demo-6" },
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair opened the term sheet for contract AMA-2026-0006 — review each clause and agree it with the other side.",
        at: "2026-08-26T09:15:00.000Z",
        card: { kind: "term-sheet", contractId: "contract-demo-6" },
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair asked Silk Route Imports for: Import documentation. Tap to fill it in — you can save as you go.",
        at: "2026-08-26T10:00:00.000Z",
        card: { kind: "request", contractId: "contract-demo-6", requestId: "request-demo-11" },
        visibleTo: ["buyer", "kam"],
      },
      {
        from: "kam",
        fromName: "Priya Nair",
        text: "Priya Nair asked Nizamabad Turmeric Growers Collective for: Export documentation. Tap to fill it in — you can save as you go.",
        at: "2026-08-26T10:05:00.000Z",
        card: { kind: "request", contractId: "contract-demo-6", requestId: "request-demo-12" },
        visibleTo: ["seller", "kam"],
      },
      {
        from: "system",
        text: 'Nizamabad Turmeric Growers Collective proposed "SGS inspection at loading port, seller\'s cost" for QC arrangement.',
        at: "2026-08-27T10:00:00.000Z",
      },
      {
        from: "system",
        text: 'Silk Route Imports confirmed "QC arrangement" — both sides now agree: SGS inspection at loading port, seller\'s cost.',
        at: "2026-08-27T15:00:00.000Z",
      },
      {
        from: "buyer",
        fromName: "Silk Route Imports",
        text: "Silk Route Imports issued PO AMA-2026-0006 with changes to 1 clause — this is a counter-offer and needs Nizamabad Turmeric Growers Collective's confirmation.",
        at: "2026-08-29T09:00:00.000Z",
        card: { kind: "po", contractId: "contract-demo-6" },
      },
    ],
  },
  /* Deal-15 — new. Agreed entirely in chat, unassigned, and the buyer asks
   * for it to become a contract before any KAM has picked it up — the
   * Term Sheet Request queue's buyer-initiated example. */
  {
    id: conv11Id,
    buyerId: "trade@windsorfoods.example",
    buyerName: "Windsor Foods Ltd",
    sellerId: "seed-idukki-cardamom",
    sellerName: "Idukki Cardamom Growers",
    listingId: "seed-11",
    listingTitle: "AGS Grade Green Cardamom — Grade A+ (Idukki Cardamom Growers)",
    messages: [
      { from: "buyer", text: "Interested in your AGS grade cardamom — could you do 3 MT at $18,500/t?", at: "2026-09-05T09:00:00.000Z" },
      {
        from: "buyer",
        text: "Windsor Foods Ltd proposed a deal: $18,500/t × 3 MT.",
        at: "2026-09-05T09:01:00.000Z",
        card: { kind: "proposal", dealId: "deal-15", roundId: "deal-15-round-1" },
      },
      { from: "seller", text: "Yes, confirmed at that price.", at: "2026-09-06T08:50:00.000Z" },
      {
        from: "system",
        text: "Idukki Cardamom Growers accepted the deal — both sides are agreed at $18,500/t × 3 MT. An account manager will take it from here.",
        at: "2026-09-06T09:00:00.000Z",
      },
      {
        from: "buyer",
        fromName: "Windsor Foods Ltd",
        text: "Windsor Foods Ltd asked for this deal to be turned into a contract.",
        at: "2026-09-07T10:00:00.000Z",
        card: { kind: "contract-request", dealId: "deal-15" },
      },
    ],
  },
  /* Deal-16 — new. Same idea, seller-initiated this time — the queue's
   * other trigger. */
  {
    id: conv12Id,
    buyerId: "procurement@northshorecommodities.example",
    buyerName: "Northshore Commodities",
    sellerId: "seed-godavari-chilli",
    sellerName: "Godavari Chilli Farmers",
    listingId: "seed-12",
    listingTitle: "Guntur Sannam Chilli — Grade A (Godavari Chilli Farmers)",
    messages: [
      { from: "seller", text: "We have 22 MT of Guntur Sannam chilli ready — can offer at $2,400/t.", at: "2026-09-08T09:00:00.000Z" },
      {
        from: "seller",
        text: "Godavari Chilli Farmers proposed a deal: $2,400/t × 22 MT.",
        at: "2026-09-08T09:01:00.000Z",
        card: { kind: "proposal", dealId: "deal-16", roundId: "deal-16-round-1" },
      },
      { from: "buyer", text: "Deal — confirming.", at: "2026-09-09T08:40:00.000Z" },
      {
        from: "system",
        text: "Northshore Commodities accepted the deal — both sides are agreed at $2,400/t × 22 MT. An account manager will take it from here.",
        at: "2026-09-09T09:00:00.000Z",
      },
      {
        from: "seller",
        fromName: "Godavari Chilli Farmers",
        text: "Godavari Chilli Farmers asked for this deal to be turned into a contract.",
        at: "2026-09-09T15:00:00.000Z",
        card: { kind: "contract-request", dealId: "deal-16" },
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
const teaShipments: Partial<Shipment>[] = [
  {
    id: "ship-8-0",
    mode: "trucking",
    carrier: "Nilgiri Road Freight",
    documentNumber: "NRF-4471",
    bookingReference: "LR-88214",
    containerId: null,
    status: "arrived",
    stage: "packing-export-qc",
    origin: "Coonoor estate, Tamil Nadu",
    destination: "Kochi Port CFS",
    currentLocation: "Kochi Port CFS",
    eta: "2026-08-22T00:00:00.000Z",
    note: "Two trucks, 12 MT total.",
    harvestAt: "2026-08-18T06:00:00.000Z",
    shelfLifeBudgetDays: 180,
    events: [
      { id: "evt-8-0-0", type: "farm-pickup", label: "Farm pickup", location: "Coonoor estate, Tamil Nadu", at: "2026-08-19T06:00:00.000Z", note: "Plucked the previous evening, held overnight at the estate shed." },
      { id: "evt-8-0-1", type: "booked", label: "Booked", location: "Coonoor, Tamil Nadu", at: "2026-08-19T10:00:00.000Z", note: null },
      { id: "evt-8-0-2", type: "loaded", label: "Loaded at estate", location: "Coonoor estate", at: "2026-08-21T07:00:00.000Z", note: null },
      { id: "evt-8-0-2b", type: "warehouse-inbound", label: "Warehouse inbound", location: "Kochi Port CFS", at: "2026-08-22T09:00:00.000Z", note: "Weight verified against the estate slip — within tolerance." },
      { id: "evt-8-0-2c", type: "cold-storage-in", label: "Cold storage", location: "Kochi Port CFS", at: "2026-08-22T10:30:00.000Z", note: null },
      { id: "evt-8-0-2d", type: "export-qc-pass", label: "Packing & export QC", location: "Kochi Port CFS", at: "2026-08-22T12:30:00.000Z", note: "Sorted, packed and export-QC approved for stuffing." },
      { id: "evt-8-0-3", type: "delivered", label: "Delivered to port", location: "Kochi Port CFS", at: "2026-08-22T13:00:00.000Z", note: "Handed over for stuffing." },
    ],
    coldChain: {
      setpointC: 4,
      samples: [
        { id: "temp-8-0-1", at: "2026-08-19T06:00:00.000Z", tempC: 21, leg: "estate" },
        { id: "temp-8-0-2", at: "2026-08-19T12:00:00.000Z", tempC: 19, leg: "estate" },
        { id: "temp-8-0-3", at: "2026-08-20T00:00:00.000Z", tempC: 15, leg: "road" },
        { id: "temp-8-0-4", at: "2026-08-21T07:00:00.000Z", tempC: 9, leg: "road" },
        { id: "temp-8-0-5", at: "2026-08-22T09:00:00.000Z", tempC: 5, leg: "cold-store" },
        { id: "temp-8-0-6", at: "2026-08-22T13:00:00.000Z", tempC: 4, leg: "cold-store" },
      ],
    },
    documents: [
      { id: "doc-8-0-1", stage: "packing-export-qc", name: "Export QC Certificate", mandatory: true, status: "verified", issuer: "QC Manager", note: null },
      { id: "doc-8-0-2", stage: "packing-export-qc", name: "Packing List (draft)", mandatory: true, status: "verified", issuer: "Warehouse", note: null },
    ],
    createdAt: "2026-08-19T10:00:00.000Z",
    updatedAt: "2026-08-22T13:00:00.000Z",
  },
  {
    id: "ship-8-1",
    mode: "ocean",
    carrier: "Maersk Line",
    documentNumber: "MSKU7788123",
    bookingReference: "BKG-MAEU-70231",
    containerId: "MSKU7788123",
    status: "in-transit",
    stage: "vessel-transit",
    origin: "Kochi, India",
    destination: "Rotterdam, Netherlands",
    currentLocation: "Indian Ocean, en route to the Suez Canal",
    eta: "2026-09-25T00:00:00.000Z",
    note: "20ft reefer container, temperature-controlled.",
    cutoffs: { gateIn: "2026-08-22T18:00:00.000Z", vgm: "2026-08-22T12:00:00.000Z", shippingInstruction: "2026-08-21T18:00:00.000Z" },
    documents: [
      { id: "doc-8-1-1", stage: "documentation", name: "Commercial Invoice", mandatory: true, status: "verified", issuer: "AMAMA", note: null },
      { id: "doc-8-1-2", stage: "documentation", name: "Phytosanitary Certificate", mandatory: true, status: "verified", issuer: "Plant Quarantine authority", note: null },
      { id: "doc-8-1-3", stage: "customs", name: "Let Export Order (LEO)", mandatory: true, status: "verified", issuer: "Customs", note: null },
    ],
    events: [
      { id: "evt-8-1-0", type: "documentation", label: "Documents filed", location: "Kochi, India", at: "2026-08-22T16:00:00.000Z", note: null },
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
    bookingReference: "BKG-CMDU-58890",
    containerId: "CMAU5521987",
    status: "delayed",
    stage: "customs",
    origin: "Kochi, India",
    destination: "Hamburg, Germany",
    currentLocation: "Kochi Port",
    eta: "2026-09-30T00:00:00.000Z",
    note: "40ft standard container.",
    // The phytosanitary certificate is the reference model's own most-
    // emphasized blocker: government-issued, inspection-dependent, and
    // dated too close to sailing to obtain early — this is that blocker,
    // live, still missing.
    cutoffs: { gateIn: "2026-09-05T18:00:00.000Z", vgm: "2026-09-05T12:00:00.000Z", shippingInstruction: "2026-09-04T18:00:00.000Z" },
    documents: [
      { id: "doc-8-2-1", stage: "documentation", name: "Commercial Invoice", mandatory: true, status: "verified", issuer: "AMAMA", note: null },
      { id: "doc-8-2-2", stage: "documentation", name: "Packing List (final)", mandatory: true, status: "verified", issuer: "AMAMA", note: null },
      { id: "doc-8-2-3", stage: "documentation", name: "Certificate of Origin", mandatory: true, status: "verified", issuer: "Chamber of commerce", note: null },
      {
        id: "doc-8-2-4",
        stage: "documentation",
        name: "Phytosanitary Certificate",
        mandatory: true,
        status: "missing",
        issuer: "Plant Quarantine authority",
        note: "Original flagged an outdated pest list — corrected copy requested, not yet re-issued.",
      },
    ],
    events: [
      { id: "evt-8-2-1", type: "booked", label: "Booked", location: "Kochi, India", at: "2026-08-28T09:00:00.000Z", note: null },
      { id: "evt-8-2-2", type: "gate-in", label: "Gate-in at origin", location: "Kochi Port CFS", at: "2026-08-30T11:00:00.000Z", note: null },
      { id: "evt-8-2-3", type: "delayed", label: "Delayed", location: "Kochi Port", at: "2026-09-02T08:00:00.000Z", note: "Held for additional phytosanitary inspection — 3 day delay expected." },
      { id: "evt-8-2-4", type: "customs", label: "Customs hold", location: "Kochi Port", at: "2026-09-04T09:00:00.000Z", note: "Customs flagged the consignment pending the revised phytosanitary certificate." },
    ],
    demurrageUsd: 650,
    createdAt: "2026-08-28T09:00:00.000Z",
    updatedAt: "2026-09-04T09:00:00.000Z",
  },
  /* A second, freshly-booked batch — gives the tracked-shipments list a
   * fourth entry that's still at the very start of its own journey rather
   * than every leg on this deal already being mid-transit or later. */
  {
    id: "ship-8-3",
    mode: "ocean",
    carrier: "ONE (Ocean Network Express)",
    documentNumber: "ONEY2244108",
    bookingReference: "BKG-ONEY-11042",
    containerId: "ONEY2244108",
    status: "booked",
    stage: "container-booked",
    origin: "Kochi, India",
    destination: "Dubai, UAE",
    currentLocation: "Kochi Port CFS",
    eta: null,
    note: "Second batch — Nilgiri Orthodox Tea, Grade A, 10 MT.",
    cutoffs: { gateIn: "2026-09-26T18:00:00.000Z", vgm: "2026-09-26T12:00:00.000Z", shippingInstruction: "2026-09-25T18:00:00.000Z" },
    events: [
      { id: "evt-8-3-1", type: "booked", label: "Booked", location: "Kochi, India", at: "2026-09-20T09:30:00.000Z", note: "Space confirmed with ONE." },
    ],
    createdAt: "2026-09-20T09:30:00.000Z",
    updatedAt: "2026-09-20T09:30:00.000Z",
  },
]

/* A split order — most of it went out clean on its own container
 * (`ship-9-1`), but a smaller consolidated lot went out later, arrived
 * with a dispute nobody's resolved yet, and is still open — the "Open
 * claims" board's own real example, rather than every claim in the seed
 * already being settled history. */
const groundnutShipment: Partial<Shipment>[] = [
  {
    id: "ship-9-1",
    mode: "ocean",
    carrier: "Hapag-Lloyd",
    documentNumber: "HLXU1234567",
    bookingReference: "BKG-HLCU-30044",
    containerId: "HLXU1234567",
    status: "arrived",
    origin: "Tema, Ghana",
    destination: "New York, USA",
    currentLocation: "New York, USA",
    eta: "2026-08-14T00:00:00.000Z",
    note: null,
    stage: "arrived-delivered",
    events: [
      { id: "evt-9-1-1", type: "booked", label: "Booked", location: "Tema, Ghana", at: "2026-08-02T09:00:00.000Z", note: null },
      { id: "evt-9-1-2", type: "departed", label: "Departed origin", location: "Tema, Ghana", at: "2026-08-04T07:00:00.000Z", note: null },
      { id: "evt-9-1-3", type: "arrived-port", label: "Arrived at destination port", location: "New York, USA", at: "2026-08-13T09:00:00.000Z", note: null },
      { id: "evt-9-1-4", type: "delivered", label: "Delivered", location: "New York, USA", at: "2026-08-15T09:00:00.000Z", note: "Received at destination warehouse, no exceptions." },
    ],
    createdAt: "2026-08-02T09:00:00.000Z",
    updatedAt: "2026-08-15T09:00:00.000Z",
  },
  {
    id: "ship-9-2",
    mode: "consolidation",
    carrier: "Buyer-consolidated (Meridian LCL program)",
    documentNumber: "MER-LCL-20991",
    bookingReference: "BKG-LCL-20991",
    containerId: null,
    status: "arrived",
    stage: "arrived-delivered",
    origin: "Tema, Ghana",
    destination: "New York, USA",
    currentLocation: "New York, USA",
    eta: "2026-08-20T00:00:00.000Z",
    note: "Second, smaller lot — consolidated with two other buyers' orders on the same LCL run.",
    events: [
      { id: "evt-9-2-1", type: "booked", label: "Booked", location: "Tema, Ghana", at: "2026-08-09T09:00:00.000Z", note: null },
      { id: "evt-9-2-2", type: "departed", label: "Departed origin", location: "Tema, Ghana", at: "2026-08-11T07:00:00.000Z", note: null },
      { id: "evt-9-2-3", type: "arrived-port", label: "Arrived at destination port", location: "New York, USA", at: "2026-08-19T09:00:00.000Z", note: null },
      { id: "evt-9-2-4", type: "delivered", label: "Delivered", location: "New York, USA", at: "2026-08-20T09:00:00.000Z", note: "Received at destination warehouse." },
    ],
    claim: {
      reason: "Moisture content above spec on 3 of the 20 bags sampled — buyer says the lot risks spoilage.",
      amountUsd: 1450,
      status: "open",
      raisedBy: "buyer",
      raisedAt: "2026-08-21T11:00:00.000Z",
      resolvedAt: null,
      resolutionNote: null,
    },
    createdAt: "2026-08-09T09:00:00.000Z",
    updatedAt: "2026-08-21T11:00:00.000Z",
  },
]

/* Booked but not yet moved — the "Booked" column's own real example
 * rather than the board's fourth status permanently showing "Nothing here
 * right now". Air freight, since cinnamon at this quantity is small and
 * time-sensitive enough to fly rather than wait on an ocean slot. */
const cinnamonShipment: Partial<Shipment>[] = [
  {
    id: "ship-7-1",
    mode: "air",
    carrier: "Cathay Cargo",
    documentNumber: "CX-AWB-8834217",
    bookingReference: "BKG-CX-77098",
    containerId: null,
    status: "booked",
    stage: "container-booked",
    origin: "Colombo, Sri Lanka",
    destination: "Los Angeles, USA",
    currentLocation: "Colombo, Sri Lanka",
    eta: null,
    note: "Awaiting phytosanitary sign-off before the airway bill is finalized.",
    documents: [
      { id: "doc-7-1-1", stage: "documentation", name: "Commercial Invoice", mandatory: true, status: "verified", issuer: "AMAMA", note: null },
      {
        id: "doc-7-1-2",
        stage: "documentation",
        name: "Phytosanitary Certificate",
        mandatory: true,
        status: "pending",
        issuer: "Plant Quarantine authority",
        note: "Inspection booked for the day before the airway bill needs to be finalized.",
      },
    ],
    events: [
      { id: "evt-7-1-1", type: "booked", label: "Booked", location: "Colombo, Sri Lanka", at: "2026-09-10T09:00:00.000Z", note: "Space held on next available cargo flight." },
    ],
    createdAt: "2026-09-10T09:00:00.000Z",
    updatedAt: "2026-09-10T09:00:00.000Z",
  },
]

const pomegranateShipment: Partial<Shipment>[] = [
  {
    id: "ship-10-1",
    mode: "ocean",
    carrier: "MSC",
    documentNumber: "MSCU9987654",
    bookingReference: "BKG-MEDU-91820",
    containerId: "MSCU9987654",
    status: "arrived",
    stage: "arrived-delivered",
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
    claim: {
      reason: "Buyer reported a 4% shortage on arrival versus the bill of lading weight.",
      amountUsd: 2100,
      status: "settled",
      raisedBy: "buyer",
      raisedAt: "2026-07-29T10:00:00.000Z",
      resolvedAt: "2026-07-31T09:00:00.000Z",
      resolutionNote: "Seller agreed to a credit note against the next shipment; buyer confirmed the adjustment.",
    },
    createdAt: "2026-07-14T09:00:00.000Z",
    updatedAt: "2026-07-31T09:00:00.000Z",
  },
]

/* The one shipment still sitting in the pre-booking half of the pipeline
 * — farm pickup and warehouse inbound are already done, it's holding in
 * cold storage now, and export QC hasn't happened yet. This is what gives
 * the demo seller account (Ravi Kumar) a genuinely actionable dispatch
 * checklist rather than every seeded shipment already being a KAM's or a
 * buyer's problem by the time the demo starts. */
const cashewDispatchShipment: Partial<Shipment>[] = [
  {
    id: "ship-12-1",
    mode: "trucking",
    carrier: "Kerala Cold Logistics",
    documentNumber: "KCL-2291",
    bookingReference: "LR-77340",
    containerId: null,
    status: "booked",
    stage: "cold-storage",
    origin: "Kollam, Kerala",
    destination: "Kochi Port CFS",
    currentLocation: "Kochi Port CFS — cold store, bay 4",
    eta: null,
    note: "18 MT W-320 cashew kernels, held ahead of container booking.",
    harvestAt: "2026-09-15T05:30:00.000Z",
    shelfLifeBudgetDays: 365,
    events: [
      { id: "evt-12-1-1", type: "farm-pickup", label: "Farm pickup", location: "Kollam, Kerala", at: "2026-09-15T07:00:00.000Z", note: null },
      { id: "evt-12-1-2", type: "warehouse-inbound", label: "Warehouse inbound", location: "Kochi Port CFS", at: "2026-09-16T10:00:00.000Z", note: "Weight verified against the processing-unit slip." },
      { id: "evt-12-1-3", type: "cold-storage-in", label: "Cold storage", location: "Kochi Port CFS", at: "2026-09-16T11:30:00.000Z", note: null },
    ],
    coldChain: {
      setpointC: 18,
      samples: [
        { id: "temp-12-1-1", at: "2026-09-16T11:30:00.000Z", tempC: 24, leg: "cold-store" },
        { id: "temp-12-1-2", at: "2026-09-16T17:30:00.000Z", tempC: 22, leg: "cold-store" },
        { id: "temp-12-1-3", at: "2026-09-17T01:30:00.000Z", tempC: 20, leg: "cold-store" },
        { id: "temp-12-1-4", at: "2026-09-17T09:30:00.000Z", tempC: 19, leg: "cold-store" },
        { id: "temp-12-1-5", at: "2026-09-17T21:30:00.000Z", tempC: 18, leg: "cold-store" },
        { id: "temp-12-1-6", at: "2026-09-18T11:30:00.000Z", tempC: 18, leg: "cold-store" },
        { id: "temp-12-1-7", at: "2026-09-19T11:30:00.000Z", tempC: 18, leg: "cold-store" },
        { id: "temp-12-1-8", at: "2026-09-20T11:30:00.000Z", tempC: 19, leg: "cold-store" },
        { id: "temp-12-1-9", at: "2026-09-21T08:00:00.000Z", tempC: 18, leg: "cold-store" },
      ],
    },
    documents: [
      { id: "doc-12-1-1", stage: "packing-export-qc", name: "Product & Quality History", mandatory: false, status: "verified", issuer: "AMAMA", note: null },
      {
        id: "doc-12-1-2",
        stage: "documentation",
        name: "Phytosanitary Certificate",
        mandatory: true,
        status: "pending",
        issuer: "Plant Quarantine authority",
        note: "Not yet booked — export QC has to pass first.",
      },
    ],
    createdAt: "2026-09-16T10:00:00.000Z",
    updatedAt: "2026-09-18T11:30:00.000Z",
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
  // 5. Active, contracting — assigned to Arjun. Contract-demo-2 has reached
  // "draft": the buyer's approved it, the seller hasn't yet.
  {
    id: "deal-5",
    conversationId: conv6Id,
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
    stage: "contracting",
    stageHistory: [
      { stage: "costing", at: "2026-08-15T09:30:00.000Z", by: "System", note: "Deal finalized — pipeline started" },
      { stage: "contracting", at: "2026-08-16T09:00:00.000Z", by: "Arjun Mehta", note: "Costing signed off, moving to contract drafting." },
    ],
    assignedKamId: "arjun@amama.com",
    assignedKamName: "Arjun Mehta",
    assignmentHistory: [{ kamId: "arjun@amama.com", kamName: "Arjun Mehta", assignedBy: "Master Admin", at: "2026-08-15T10:00:00.000Z" }],
    costing: { incoterm: "FOB", paymentTerm: "50% advance, 50% on BL", proformaInvoiceNo: "PI-2026-0814", notes: null },
    contracting: { contractRef: "AMA-2026-0002", signedOff: false, notes: "Draft v1 shared — buyer approved, awaiting the seller." },
    compliance: emptyCompliance,
    shipments: [],
    payment: emptyPayment,
    createdAt: "2026-08-14T09:00:00.000Z",
    updatedAt: "2026-08-21T10:00:00.000Z",
  },
  // 6. Active, contracting — assigned to Priya. Contract-demo-3's draft
  // went to review, the seller asked for a change instead of signing off,
  // so it's sitting in "amendments" with one unresolved.
  {
    id: "deal-6",
    conversationId: conv7Id,
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
    contracting: {
      contractRef: "AMA-2026-0003",
      signedOff: false,
      notes: "Draft under amendment — seller asked for revised payment terms.",
    },
    compliance: emptyCompliance,
    shipments: [],
    payment: emptyPayment,
    createdAt: "2026-08-14T11:00:00.000Z",
    updatedAt: "2026-08-25T11:00:00.000Z",
  },
  // 7. Active, compliance — assigned to Priya. Contract-demo-4 is fully
  // signed (the "final" example) with a shipping date already picked.
  {
    id: "deal-7",
    conversationId: conv8Id,
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
    contracting: { contractRef: "AMA-2026-0004", signedOff: true, notes: null },
    compliance: {
      phytosanitaryCert: true,
      labReport: true,
      certificateOfOrigin: false,
      customsDocs: false,
      freightBooked: true,
      notes: "Awaiting certificate of origin from the local chamber of commerce.",
    },
    shipments: cinnamonShipment,
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
    shipments: cashewDispatchShipment,
    payment: emptyPayment,
    createdAt: "2026-09-10T09:01:00.000Z",
    updatedAt: "2026-09-11T09:10:00.000Z",
  },
  /* 13. Active, contracting — assigned to Arjun. Contract-demo-5 is at
   * "signatures": the buyer has signed, the seller hasn't yet, and a
   * shipping-date poll is already open in parallel, nobody's picked one. */
  {
    id: "deal-13",
    conversationId: conv9Id,
    listingId: "seed-9",
    listingTitle: "Eagle Grade Coriander Seeds — Grade A (Malwa Coriander Growers)",
    buyerId: "procurement@atlanticspice.example",
    buyerName: "Atlantic Spice Importers",
    sellerId: "seed-malwa-coriander",
    sellerName: "Malwa Coriander Growers",
    status: "active",
    proposedBy: "buyer",
    agreedPricePerTonneUsd: 1180,
    agreedQuantityMt: 25,
    proposedAt: "2026-08-20T09:00:00.000Z",
    respondedAt: "2026-08-21T09:00:00.000Z",
    declineReason: null,
    stage: "contracting",
    stageHistory: [
      { stage: "costing", at: "2026-08-21T09:00:00.000Z", by: "System", note: "Deal finalized — pipeline started" },
      { stage: "contracting", at: "2026-08-21T09:30:00.000Z", by: "Arjun Mehta", note: "Costing signed off, moving to contract drafting." },
    ],
    assignedKamId: "arjun@amama.com",
    assignedKamName: "Arjun Mehta",
    assignmentHistory: [{ kamId: "arjun@amama.com", kamName: "Arjun Mehta", assignedBy: "Master Admin", at: "2026-08-21T09:30:00.000Z" }],
    costing: { incoterm: "CIF", paymentTerm: "40% advance, 60% on BL", proformaInvoiceNo: "PI-2026-0820", notes: null },
    contracting: { contractRef: "AMA-2026-0005", signedOff: false, notes: "Draft agreed by both sides — buyer has signed, awaiting the seller." },
    compliance: emptyCompliance,
    shipments: [],
    payment: emptyPayment,
    createdAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-28T10:00:00.000Z",
  },
  /* 14. Active, contracting — assigned to Priya. Contract-demo-6 sits at
   * "term-sheet": everything else agreed, but the buyer's PO changed the
   * QC clause at the moment of issuing it — a counter-offer waiting on
   * the seller's confirmation, so that one clause reads disputed. */
  {
    id: "deal-14",
    conversationId: conv10Id,
    listingId: "seed-10",
    listingTitle: "Finger Turmeric — Grade A (Nizamabad Turmeric Growers Collective)",
    buyerId: "sourcing@silkrouteimports.example",
    buyerName: "Silk Route Imports",
    sellerId: "seed-nizamabad-turmeric",
    sellerName: "Nizamabad Turmeric Growers Collective",
    status: "active",
    proposedBy: "buyer",
    agreedPricePerTonneUsd: 2650,
    agreedQuantityMt: 30,
    proposedAt: "2026-08-25T09:00:00.000Z",
    respondedAt: "2026-08-26T09:00:00.000Z",
    declineReason: null,
    stage: "contracting",
    stageHistory: [
      { stage: "costing", at: "2026-08-26T09:00:00.000Z", by: "System", note: "Deal finalized — pipeline started" },
      { stage: "contracting", at: "2026-08-26T09:10:00.000Z", by: "Priya Nair", note: "Costing signed off, moving to contract drafting." },
    ],
    assignedKamId: "priya@amama.com",
    assignedKamName: "Priya Nair",
    assignmentHistory: [{ kamId: "priya@amama.com", kamName: "Priya Nair", assignedBy: "Master Admin", at: "2026-08-26T09:10:00.000Z" }],
    costing: { incoterm: "CIF", paymentTerm: "20% advance, 80% on BL", proformaInvoiceNo: "PI-2026-0825", notes: null },
    contracting: {
      contractRef: "AMA-2026-0006",
      signedOff: false,
      notes: "Buyer issued a PO with a changed QC clause — awaiting the seller's confirmation.",
    },
    compliance: emptyCompliance,
    shipments: [],
    payment: emptyPayment,
    createdAt: "2026-08-25T09:00:00.000Z",
    updatedAt: "2026-08-29T09:00:00.000Z",
  },
  /* 15. Active, costing — agreed entirely in chat, unassigned, and the
   * buyer has asked for it to become a contract. Sits in the Term Sheet
   * Request queue until a KAM picks it up; deliberately no Contract row. */
  {
    id: "deal-15",
    conversationId: conv11Id,
    listingId: "seed-11",
    listingTitle: "AGS Grade Green Cardamom — Grade A+ (Idukki Cardamom Growers)",
    buyerId: "trade@windsorfoods.example",
    buyerName: "Windsor Foods Ltd",
    sellerId: "seed-idukki-cardamom",
    sellerName: "Idukki Cardamom Growers",
    status: "active",
    proposedBy: "buyer",
    agreedPricePerTonneUsd: 18500,
    agreedQuantityMt: 3,
    proposedAt: "2026-09-05T09:00:00.000Z",
    respondedAt: "2026-09-06T09:00:00.000Z",
    declineReason: null,
    stage: "costing",
    stageHistory: [{ stage: "costing", at: "2026-09-06T09:00:00.000Z", by: "System", note: "Deal finalized — pipeline started" }],
    assignedKamId: null,
    assignedKamName: null,
    assignmentHistory: [],
    contractRequestedAt: "2026-09-07T10:00:00.000Z",
    contractRequestedBy: "buyer",
    costing: emptyCosting,
    contracting: emptyContracting,
    compliance: emptyCompliance,
    shipments: [],
    payment: emptyPayment,
    createdAt: "2026-09-05T09:00:00.000Z",
    updatedAt: "2026-09-07T10:00:00.000Z",
  },
  /* 16. Active, costing — same idea, seller-initiated this time. Also
   * unassigned and contract-less, the queue's other trigger. */
  {
    id: "deal-16",
    conversationId: conv12Id,
    listingId: "seed-12",
    listingTitle: "Guntur Sannam Chilli — Grade A (Godavari Chilli Farmers)",
    buyerId: "procurement@northshorecommodities.example",
    buyerName: "Northshore Commodities",
    sellerId: "seed-godavari-chilli",
    sellerName: "Godavari Chilli Farmers",
    status: "active",
    proposedBy: "seller",
    agreedPricePerTonneUsd: 2400,
    agreedQuantityMt: 22,
    proposedAt: "2026-09-08T09:00:00.000Z",
    respondedAt: "2026-09-09T09:00:00.000Z",
    declineReason: null,
    stage: "costing",
    stageHistory: [{ stage: "costing", at: "2026-09-09T09:00:00.000Z", by: "System", note: "Deal finalized — pipeline started" }],
    assignedKamId: null,
    assignedKamName: null,
    assignmentHistory: [],
    contractRequestedAt: "2026-09-09T15:00:00.000Z",
    contractRequestedBy: "seller",
    costing: emptyCosting,
    contracting: emptyContracting,
    compliance: emptyCompliance,
    shipments: [],
    payment: emptyPayment,
    createdAt: "2026-09-08T09:00:00.000Z",
    updatedAt: "2026-09-09T15:00:00.000Z",
  },
]

const SEED_CONTRACTS: Contract[] = [
  /* Contract-demo-1 — "term-sheet", every clause now agreed and no PO
   * issued yet: the one scenario a buyer needs to actually raise a
   * purchase order, on the exact demo account (`buyer@amama.in`) the
   * quick-login button signs in as. The seller's export-documentation
   * request is still open, so there's a concurrent action item on their
   * side too — raising the PO doesn't wait on it. */
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
    clauses: [
      { id: "clause-demo-1", key: "productSpec", label: "Product spec", value: "W-320, max 5% moisture, aflatoxin-tested", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-09-11T09:00:00.000Z" },
      { id: "clause-demo-2", key: "packagingSpec", label: "Packaging spec", value: "25kg tins, 20ft container", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-09-13T10:00:00.000Z" },
      { id: "clause-demo-3", key: "priceCurrency", label: "Price & currency", value: "$5350/t × 18 MT", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-09-11T09:00:00.000Z" },
      { id: "clause-demo-4", key: "paymentTerms", label: "Payment terms", value: "30% advance, 70% on BL", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-09-11T09:00:00.000Z" },
      { id: "clause-demo-5", key: "incoterms", label: "Incoterms", value: "CIF", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-09-11T09:00:00.000Z" },
      { id: "clause-demo-6", key: "deliveryWindow", label: "Delivery window", value: "October 2026", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-09-13T10:00:00.000Z" },
      { id: "clause-demo-7", key: "qcArrangement", label: "QC arrangement", value: "SGS pre-shipment inspection at Kochi port", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-09-13T10:05:00.000Z" },
      { id: "clause-demo-8", key: "disputeResolution", label: "Dispute resolution", value: "ICC arbitration, Dubai", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-09-13T10:05:00.000Z" },
    ],
    termSheetOpenedAt: null,
    draftBody: null,
    draftVersion: 0,
    amendments: [],
    approvals: { buyer: { agreed: false, at: null, by: null, note: null }, seller: { agreed: false, at: null, by: null, note: null } },
    signatures: { buyer: { agreed: false, at: null, by: null, note: null }, seller: { agreed: false, at: null, by: null, note: null } },
    po: null,
    shipmentDates: null,
    createdAt: "2026-09-11T09:00:00.000Z",
    updatedAt: "2026-09-12T11:40:00.000Z",
  },
  /* Contract-demo-2 — "draft" stage: the term sheet went all the way to an
   * auto-accepted PO and a shared draft, and the buyer has approved it;
   * the seller hasn't yet. */
  {
    id: "contract-demo-2",
    reference: "AMA-2026-0002",
    dealId: "deal-5",
    conversationId: conv6Id,
    listingTitle: "Jasmine Rice — Grade A (Mekong Grain Traders)",
    buyerId: "sourcing@everestfoodstuffs.example",
    buyerName: "Everest Foodstuffs",
    sellerId: "seed-mekong-grain",
    sellerName: "Mekong Grain Traders",
    kamId: "arjun@amama.com",
    kamName: "Arjun Mehta",
    stage: "draft",
    stageHistory: [
      { stage: "summary", at: "2026-08-16T09:00:00.000Z", by: "Arjun Mehta", note: "Contract opened from the agreed deal" },
      { stage: "term-sheet", at: "2026-08-16T09:05:00.000Z", by: "Arjun Mehta", note: "Term sheet opened" },
      { stage: "draft", at: "2026-08-20T10:00:00.000Z", by: "Arjun Mehta", note: "PO issued for AMA-2026-0002 — matched the term sheet exactly" },
    ],
    terms: {
      pricePerTonneUsd: 335,
      quantityMt: 50,
      incoterm: "FOB",
      paymentTerm: "50% advance, 50% on BL",
      originPort: "Bangkok, Thailand",
      destinationPort: "Los Angeles, USA",
      qualitySpec: "Jasmine Rice, 5% broken max, Grade A",
      notes: null,
    },
    requests: [
      {
        id: "request-demo-3",
        party: "buyer",
        title: "Import documentation",
        note: "Need your IEC and delivery address to finalize logistics.",
        fields: [
          { id: "field-demo-c2-1", label: "Import Export Code (IEC)", type: "text", required: true, help: null, value: "AAICE9911204" },
        ],
        documents: [
          {
            id: "doc-demo-c2-1",
            label: "Import licence copy",
            required: true,
            help: null,
            files: [{ id: "file-demo-c2-1", name: "import-licence.pdf", size: 388_000, uploadedAt: "2026-08-17T14:00:00.000Z" }],
          },
        ],
        status: "submitted",
        submittedAt: "2026-08-17T14:05:00.000Z",
        updatedAt: "2026-08-17T14:05:00.000Z",
      },
      {
        id: "request-demo-4",
        party: "seller",
        title: "Export documentation",
        note: "Need your export packing format and bank details for this shipment.",
        fields: [
          {
            id: "field-demo-c2-2",
            label: "Preferred packing format",
            type: "select",
            required: true,
            options: ["50kg PP bags", "25kg vacuum bags", "Bulk container"],
            help: null,
            value: "50kg PP bags",
          },
        ],
        documents: [
          {
            id: "doc-demo-c2-2",
            label: "Export licence / IEC",
            required: true,
            help: null,
            files: [{ id: "file-demo-c2-2", name: "export-licence.pdf", size: 275_000, uploadedAt: "2026-08-18T10:00:00.000Z" }],
          },
          { id: "doc-demo-c2-3", label: "Bank details for payment", required: false, help: null, files: [] },
        ],
        status: "submitted",
        submittedAt: "2026-08-18T10:05:00.000Z",
        updatedAt: "2026-08-18T10:05:00.000Z",
      },
    ],
    clauses: [
      { id: "clause-demo-9", key: "productSpec", label: "Product spec", value: "Jasmine Rice, 5% broken max, Grade A", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-16T09:05:00.000Z" },
      { id: "clause-demo-10", key: "packagingSpec", label: "Packaging spec", value: "50kg PP woven bags, inner liner", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-16T09:05:00.000Z" },
      { id: "clause-demo-11", key: "priceCurrency", label: "Price & currency", value: "$335/t × 50 MT", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-16T09:05:00.000Z" },
      { id: "clause-demo-12", key: "paymentTerms", label: "Payment terms", value: "50% advance, 50% on BL", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-16T09:05:00.000Z" },
      { id: "clause-demo-13", key: "incoterms", label: "Incoterms", value: "FOB", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-16T09:05:00.000Z" },
      { id: "clause-demo-14", key: "deliveryWindow", label: "Delivery window", value: "October 2026", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-16T09:05:00.000Z" },
      { id: "clause-demo-15", key: "qcArrangement", label: "QC arrangement", value: "SGS inspection at loading port, results binding on both parties", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-16T09:05:00.000Z" },
      { id: "clause-demo-16", key: "disputeResolution", label: "Dispute resolution", value: "Arbitration in Singapore (SIAC rules)", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-16T09:05:00.000Z" },
    ],
    termSheetOpenedAt: "2026-08-16T09:05:00.000Z",
    draftBody:
      "SALE CONTRACT — AMA-2026-0002\n\nSeller: Mekong Grain Traders\nBuyer: Everest Foodstuffs\n\n1. Goods: Jasmine Rice, Grade A, 5% broken max — 50 MT.\n2. Price: USD 335 per metric tonne, FOB Bangkok.\n3. Payment: 50% advance on signing, 50% against Bill of Lading.\n4. Delivery window: October 2026.\n5. Quality control: SGS inspection at the loading port, results binding on both parties.\n6. Packaging: 50kg PP woven bags with inner liner.\n7. Dispute resolution: any dispute under this contract shall be settled by arbitration in Singapore under SIAC rules.\n\nThis draft is issued for review by both parties and becomes binding once both sides confirm agreement.",
    draftVersion: 1,
    amendments: [],
    approvals: {
      buyer: { agreed: true, at: "2026-08-21T10:00:00.000Z", by: "Everest Foodstuffs", note: null },
      seller: { agreed: false, at: null, by: null, note: null },
    },
    signatures: { buyer: { agreed: false, at: null, by: null, note: null }, seller: { agreed: false, at: null, by: null, note: null } },
    po: {
      issuedAt: "2026-08-19T09:00:00.000Z",
      issuedByName: "Everest Foodstuffs",
      terms: {
        productSpec: "Jasmine Rice, 5% broken max, Grade A",
        packagingSpec: "50kg PP woven bags, inner liner",
        priceCurrency: "$335/t × 50 MT",
        paymentTerms: "50% advance, 50% on BL",
        incoterms: "FOB",
        deliveryWindow: "October 2026",
        qcArrangement: "SGS inspection at loading port, results binding on both parties",
        disputeResolution: "Arbitration in Singapore (SIAC rules)",
      },
      deviatedClauses: [],
      status: "auto-accepted",
      sellerConfirmedAt: null,
      sellerConfirmedBy: null,
      cancelledAt: null,
      cancelledBy: null,
    },
    shipmentDates: null,
    createdAt: "2026-08-16T09:00:00.000Z",
    updatedAt: "2026-08-21T10:00:00.000Z",
  },
  /* Contract-demo-3 — "amendments": the draft went to review, the buyer
   * approved, and the seller asked for a change instead of signing off —
   * one unresolved amendment sitting with the KAM. */
  {
    id: "contract-demo-3",
    reference: "AMA-2026-0003",
    dealId: "deal-6",
    conversationId: conv7Id,
    listingTitle: "Natural White Sesame — Grade A (Rift Valley Sesame Growers)",
    buyerId: "sourcing@sunrisewholesale.example",
    buyerName: "Sunrise Wholesale",
    sellerId: "seed-rift-valley-sesame",
    sellerName: "Rift Valley Sesame Growers",
    kamId: "priya@amama.com",
    kamName: "Priya Nair",
    stage: "amendments",
    stageHistory: [
      { stage: "summary", at: "2026-08-18T09:00:00.000Z", by: "Priya Nair", note: "Contract opened from the agreed deal" },
      { stage: "term-sheet", at: "2026-08-18T09:05:00.000Z", by: "Priya Nair", note: "Term sheet opened" },
      { stage: "draft", at: "2026-08-22T09:00:00.000Z", by: "Priya Nair", note: "PO issued for AMA-2026-0003 — matched the term sheet exactly" },
      { stage: "review", at: "2026-08-23T09:00:00.000Z", by: "Priya Nair", note: "Draft v1 shared with both sides" },
      { stage: "amendments", at: "2026-08-25T11:00:00.000Z", by: "Rift Valley Sesame Growers", note: "Change requested" },
    ],
    terms: {
      pricePerTonneUsd: 1550,
      quantityMt: 20,
      incoterm: "CIF",
      paymentTerm: "30% advance, 70% on BL",
      originPort: "Mombasa, Kenya",
      destinationPort: "Chennai, India",
      qualitySpec: "Natural White Sesame, 99% purity, FFA <2%",
      notes: null,
    },
    requests: [
      {
        id: "request-demo-5",
        party: "buyer",
        title: "Import documentation",
        note: "Need your IEC and delivery address to finalize logistics.",
        fields: [
          { id: "field-demo-c3-1", label: "Import Export Code (IEC)", type: "text", required: true, help: null, value: "AAICE4432190" },
        ],
        documents: [
          {
            id: "doc-demo-c3-1",
            label: "Import licence copy",
            required: true,
            help: null,
            files: [{ id: "file-demo-c3-1", name: "import-licence.pdf", size: 402_000, uploadedAt: "2026-08-19T13:00:00.000Z" }],
          },
        ],
        status: "submitted",
        submittedAt: "2026-08-19T13:05:00.000Z",
        updatedAt: "2026-08-19T13:05:00.000Z",
      },
      {
        id: "request-demo-6",
        party: "seller",
        title: "Export documentation",
        note: "Need your export packing format and bank details for this shipment.",
        fields: [
          {
            id: "field-demo-c3-2",
            label: "Preferred packing format",
            type: "select",
            required: true,
            options: ["25kg PP bags", "Bulk container"],
            help: null,
            value: "25kg PP bags",
          },
        ],
        documents: [
          {
            id: "doc-demo-c3-2",
            label: "Export licence / IEC",
            required: true,
            help: null,
            files: [{ id: "file-demo-c3-2", name: "export-licence.pdf", size: 261_000, uploadedAt: "2026-08-20T09:00:00.000Z" }],
          },
          { id: "doc-demo-c3-3", label: "Bank details for payment", required: false, help: null, files: [] },
        ],
        status: "submitted",
        submittedAt: "2026-08-20T09:05:00.000Z",
        updatedAt: "2026-08-20T09:05:00.000Z",
      },
    ],
    clauses: [
      { id: "clause-demo-17", key: "productSpec", label: "Product spec", value: "Natural White Sesame, 99% purity, FFA <2%", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-18T09:05:00.000Z" },
      { id: "clause-demo-18", key: "packagingSpec", label: "Packaging spec", value: "25kg PP bags, 20ft container", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-18T09:05:00.000Z" },
      { id: "clause-demo-19", key: "priceCurrency", label: "Price & currency", value: "$1550/t × 20 MT", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-18T09:05:00.000Z" },
      { id: "clause-demo-20", key: "paymentTerms", label: "Payment terms", value: "30% advance, 70% on BL", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-18T09:05:00.000Z" },
      { id: "clause-demo-21", key: "incoterms", label: "Incoterms", value: "CIF", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-18T09:05:00.000Z" },
      { id: "clause-demo-22", key: "deliveryWindow", label: "Delivery window", value: "September 2026", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-18T09:05:00.000Z" },
      { id: "clause-demo-23", key: "qcArrangement", label: "QC arrangement", value: "SGS pre-shipment inspection", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-18T09:05:00.000Z" },
      { id: "clause-demo-24", key: "disputeResolution", label: "Dispute resolution", value: "ICC arbitration, London", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-18T09:05:00.000Z" },
    ],
    termSheetOpenedAt: "2026-08-18T09:05:00.000Z",
    draftBody:
      "SALE CONTRACT — AMA-2026-0003\n\nSeller: Rift Valley Sesame Growers\nBuyer: Sunrise Wholesale\n\n1. Goods: Natural White Sesame, 99% purity, FFA <2% — 20 MT.\n2. Price: USD 1,550 per metric tonne, CIF Chennai.\n3. Payment: 30% advance on signing, 70% against Bill of Lading.\n4. Delivery window: September 2026.\n5. Quality control: SGS pre-shipment inspection.\n6. Packaging: 25kg PP bags, 20ft container.\n7. Dispute resolution: ICC arbitration seated in London.\n\nThis draft is issued for review by both parties and becomes binding once both sides confirm agreement.",
    draftVersion: 1,
    amendments: [
      {
        id: "amendment-demo-1",
        raisedBy: "seller",
        raisedByName: "Rift Valley Sesame Growers",
        text: "Payment terms should be 40% advance, 60% on BL — our cooperative's board requires a higher upfront share for first-time buyers.",
        at: "2026-08-25T11:00:00.000Z",
        resolved: false,
        resolvedAt: null,
      },
    ],
    approvals: {
      buyer: { agreed: true, at: "2026-08-24T09:00:00.000Z", by: "Sunrise Wholesale", note: null },
      seller: { agreed: false, at: null, by: null, note: null },
    },
    signatures: { buyer: { agreed: false, at: null, by: null, note: null }, seller: { agreed: false, at: null, by: null, note: null } },
    po: {
      issuedAt: "2026-08-22T09:00:00.000Z",
      issuedByName: "Sunrise Wholesale",
      terms: {
        productSpec: "Natural White Sesame, 99% purity, FFA <2%",
        packagingSpec: "25kg PP bags, 20ft container",
        priceCurrency: "$1550/t × 20 MT",
        paymentTerms: "30% advance, 70% on BL",
        incoterms: "CIF",
        deliveryWindow: "September 2026",
        qcArrangement: "SGS pre-shipment inspection",
        disputeResolution: "ICC arbitration, London",
      },
      deviatedClauses: [],
      status: "auto-accepted",
      sellerConfirmedAt: null,
      sellerConfirmedBy: null,
      cancelledAt: null,
      cancelledBy: null,
    },
    shipmentDates: null,
    createdAt: "2026-08-18T09:00:00.000Z",
    updatedAt: "2026-08-25T11:00:00.000Z",
  },
  /* Contract-demo-4 — "final": fully signed, PO auto-accepted, and a
   * shipping date already picked. */
  {
    id: "contract-demo-4",
    reference: "AMA-2026-0004",
    dealId: "deal-7",
    conversationId: conv8Id,
    listingTitle: "Alba Cinnamon Quills — Grade A+ (Ceylon Spice Gardens)",
    buyerId: "hello@pacificrimtraders.example",
    buyerName: "Pacific Rim Traders",
    sellerId: "seed-ceylon-spice",
    sellerName: "Ceylon Spice Gardens",
    kamId: "priya@amama.com",
    kamName: "Priya Nair",
    stage: "final",
    stageHistory: [
      { stage: "summary", at: "2026-08-18T09:00:00.000Z", by: "Priya Nair", note: "Contract opened from the agreed deal" },
      { stage: "term-sheet", at: "2026-08-18T09:05:00.000Z", by: "Priya Nair", note: "Term sheet opened" },
      { stage: "draft", at: "2026-08-20T09:00:00.000Z", by: "Priya Nair", note: "PO issued for AMA-2026-0004 — matched the term sheet exactly" },
      { stage: "review", at: "2026-08-21T09:00:00.000Z", by: "Priya Nair", note: "Draft v1 shared with both sides" },
      { stage: "signatures", at: "2026-08-22T15:01:00.000Z", by: "Priya Nair", note: "Both sides agreed the draft" },
      { stage: "final", at: "2026-08-25T10:01:00.000Z", by: "Priya Nair", note: "Signed by both sides" },
    ],
    terms: {
      pricePerTonneUsd: 3300,
      quantityMt: 10,
      incoterm: "FOB",
      paymentTerm: "100% advance",
      originPort: "Colombo, Sri Lanka",
      destinationPort: "Los Angeles, USA",
      qualitySpec: "Alba grade cinnamon quills, <10% moisture",
      notes: null,
    },
    requests: [
      {
        id: "request-demo-7",
        party: "buyer",
        title: "Import documentation",
        note: "Need your IEC and delivery address to finalize logistics.",
        fields: [
          { id: "field-demo-c4-1", label: "Import Export Code (IEC)", type: "text", required: true, help: null, value: "AAICE7765512" },
        ],
        documents: [
          {
            id: "doc-demo-c4-1",
            label: "Import licence copy",
            required: true,
            help: null,
            files: [{ id: "file-demo-c4-1", name: "import-licence.pdf", size: 355_000, uploadedAt: "2026-08-19T15:00:00.000Z" }],
          },
        ],
        status: "submitted",
        submittedAt: "2026-08-19T15:05:00.000Z",
        updatedAt: "2026-08-19T15:05:00.000Z",
      },
      {
        id: "request-demo-8",
        party: "seller",
        title: "Export documentation",
        note: "Need your export packing format and bank details for this shipment.",
        fields: [
          {
            id: "field-demo-c4-2",
            label: "Preferred packing format",
            type: "select",
            required: true,
            options: ["25kg craft paper bales", "50kg jute bags"],
            help: null,
            value: "25kg craft paper bales",
          },
        ],
        documents: [
          {
            id: "doc-demo-c4-2",
            label: "Export licence / IEC",
            required: true,
            help: null,
            files: [{ id: "file-demo-c4-2", name: "export-licence.pdf", size: 243_000, uploadedAt: "2026-08-20T08:00:00.000Z" }],
          },
          {
            id: "doc-demo-c4-3",
            label: "Bank details for payment",
            required: false,
            help: null,
            files: [{ id: "file-demo-c4-3", name: "bank-details.pdf", size: 88_000, uploadedAt: "2026-08-20T08:05:00.000Z" }],
          },
        ],
        status: "submitted",
        submittedAt: "2026-08-20T08:10:00.000Z",
        updatedAt: "2026-08-20T08:10:00.000Z",
      },
    ],
    clauses: [
      { id: "clause-demo-25", key: "productSpec", label: "Product spec", value: "Alba grade cinnamon quills, <10% moisture", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-18T09:05:00.000Z" },
      { id: "clause-demo-26", key: "packagingSpec", label: "Packaging spec", value: "Craft paper bales, 25kg net", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-18T09:05:00.000Z" },
      { id: "clause-demo-27", key: "priceCurrency", label: "Price & currency", value: "$3300/t × 10 MT", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-18T09:05:00.000Z" },
      { id: "clause-demo-28", key: "paymentTerms", label: "Payment terms", value: "100% advance", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-18T09:05:00.000Z" },
      { id: "clause-demo-29", key: "incoterms", label: "Incoterms", value: "FOB", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-18T09:05:00.000Z" },
      { id: "clause-demo-30", key: "deliveryWindow", label: "Delivery window", value: "September 2026", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-18T09:05:00.000Z" },
      { id: "clause-demo-31", key: "qcArrangement", label: "QC arrangement", value: "Buyer's nominated inspector at Colombo port", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-18T09:05:00.000Z" },
      { id: "clause-demo-32", key: "disputeResolution", label: "Dispute resolution", value: "Singapore International Arbitration Centre", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-18T09:05:00.000Z" },
    ],
    termSheetOpenedAt: "2026-08-18T09:05:00.000Z",
    draftBody:
      "SALE CONTRACT — AMA-2026-0004\n\nSeller: Ceylon Spice Gardens\nBuyer: Pacific Rim Traders\n\n1. Goods: Alba grade cinnamon quills, <10% moisture — 10 MT.\n2. Price: USD 3,300 per metric tonne, FOB Colombo.\n3. Payment: 100% advance on signing.\n4. Delivery window: September 2026.\n5. Quality control: buyer's nominated inspector at Colombo port.\n6. Packaging: craft paper bales, 25kg net.\n7. Dispute resolution: Singapore International Arbitration Centre.\n\nThis draft is issued for review by both parties and becomes binding once both sides confirm agreement.",
    draftVersion: 1,
    amendments: [],
    approvals: {
      buyer: { agreed: true, at: "2026-08-22T09:00:00.000Z", by: "Pacific Rim Traders", note: null },
      seller: { agreed: true, at: "2026-08-22T15:00:00.000Z", by: "Ceylon Spice Gardens", note: null },
    },
    signatures: {
      buyer: { agreed: true, at: "2026-08-24T09:00:00.000Z", by: "Pacific Rim Traders", note: null },
      seller: { agreed: true, at: "2026-08-25T10:00:00.000Z", by: "Ceylon Spice Gardens", note: null },
    },
    po: {
      issuedAt: "2026-08-20T09:00:00.000Z",
      issuedByName: "Pacific Rim Traders",
      terms: {
        productSpec: "Alba grade cinnamon quills, <10% moisture",
        packagingSpec: "Craft paper bales, 25kg net",
        priceCurrency: "$3300/t × 10 MT",
        paymentTerms: "100% advance",
        incoterms: "FOB",
        deliveryWindow: "September 2026",
        qcArrangement: "Buyer's nominated inspector at Colombo port",
        disputeResolution: "Singapore International Arbitration Centre",
      },
      deviatedClauses: [],
      status: "auto-accepted",
      sellerConfirmedAt: null,
      sellerConfirmedBy: null,
      cancelledAt: null,
      cancelledBy: null,
    },
    shipmentDates: {
      id: "dates-demo-1",
      options: [
        { id: "option-demo-1", date: "2026-09-02T00:00:00.000Z", containerRef: "CNTR-88213", note: "Direct sailing, Colombo–Los Angeles" },
        { id: "option-demo-2", date: "2026-09-09T00:00:00.000Z", containerRef: "CNTR-88240", note: "Transshipment via Singapore" },
        { id: "option-demo-3", date: "2026-09-16T00:00:00.000Z", containerRef: null, note: "Backup slot if the first two fill up" },
      ],
      chosenOptionId: "option-demo-1",
      chosenBy: "Pacific Rim Traders",
      chosenAt: "2026-08-27T09:00:00.000Z",
      askedAt: "2026-08-26T10:00:00.000Z",
    },
    createdAt: "2026-08-18T09:00:00.000Z",
    updatedAt: "2026-08-27T09:00:00.000Z",
  },
  /* Contract-demo-5 — "signatures": the buyer has signed, the seller
   * hasn't, and a shipping-date poll is already open with nobody having
   * chosen yet. */
  {
    id: "contract-demo-5",
    reference: "AMA-2026-0005",
    dealId: "deal-13",
    conversationId: conv9Id,
    listingTitle: "Eagle Grade Coriander Seeds — Grade A (Malwa Coriander Growers)",
    buyerId: "procurement@atlanticspice.example",
    buyerName: "Atlantic Spice Importers",
    sellerId: "seed-malwa-coriander",
    sellerName: "Malwa Coriander Growers",
    kamId: "arjun@amama.com",
    kamName: "Arjun Mehta",
    stage: "signatures",
    stageHistory: [
      { stage: "summary", at: "2026-08-21T09:30:00.000Z", by: "Arjun Mehta", note: "Contract opened from the agreed deal" },
      { stage: "term-sheet", at: "2026-08-21T09:35:00.000Z", by: "Arjun Mehta", note: "Term sheet opened" },
      { stage: "draft", at: "2026-08-24T09:00:00.000Z", by: "Arjun Mehta", note: "PO issued for AMA-2026-0005 — matched the term sheet exactly" },
      { stage: "review", at: "2026-08-25T09:00:00.000Z", by: "Arjun Mehta", note: "Draft v1 shared with both sides" },
      { stage: "signatures", at: "2026-08-26T14:01:00.000Z", by: "Arjun Mehta", note: "Both sides agreed the draft" },
    ],
    terms: {
      pricePerTonneUsd: 1180,
      quantityMt: 25,
      incoterm: "CIF",
      paymentTerm: "40% advance, 60% on BL",
      originPort: "Mundra, India",
      destinationPort: "Rotterdam, Netherlands",
      qualitySpec: "Eagle grade coriander seeds, 99% purity, machine cleaned",
      notes: null,
    },
    requests: [
      {
        id: "request-demo-9",
        party: "buyer",
        title: "Import documentation",
        note: "Need your IEC and delivery address to finalize logistics.",
        fields: [
          { id: "field-demo-c5-1", label: "Import Export Code (IEC)", type: "text", required: true, help: null, value: "AAICE2201873" },
        ],
        documents: [
          {
            id: "doc-demo-c5-1",
            label: "Import licence copy",
            required: true,
            help: null,
            files: [{ id: "file-demo-c5-1", name: "import-licence.pdf", size: 298_000, uploadedAt: "2026-08-22T13:00:00.000Z" }],
          },
        ],
        status: "submitted",
        submittedAt: "2026-08-22T13:05:00.000Z",
        updatedAt: "2026-08-22T13:05:00.000Z",
      },
      {
        id: "request-demo-10",
        party: "seller",
        title: "Export documentation",
        note: "Need your export packing format and bank details for this shipment.",
        fields: [
          {
            id: "field-demo-c5-2",
            label: "Preferred packing format",
            type: "select",
            required: true,
            options: ["50kg PP bags", "Bulk container"],
            help: null,
            value: "50kg PP bags",
          },
        ],
        documents: [
          {
            id: "doc-demo-c5-2",
            label: "Export licence / IEC",
            required: true,
            help: null,
            files: [{ id: "file-demo-c5-2", name: "export-licence.pdf", size: 231_000, uploadedAt: "2026-08-23T09:00:00.000Z" }],
          },
          { id: "doc-demo-c5-3", label: "Bank details for payment", required: false, help: null, files: [] },
        ],
        status: "submitted",
        submittedAt: "2026-08-23T09:05:00.000Z",
        updatedAt: "2026-08-23T09:05:00.000Z",
      },
    ],
    clauses: [
      { id: "clause-demo-33", key: "productSpec", label: "Product spec", value: "Eagle grade coriander seeds, 99% purity, machine cleaned", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-21T09:35:00.000Z" },
      { id: "clause-demo-34", key: "packagingSpec", label: "Packaging spec", value: "50kg PP bags, palletized", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-21T09:35:00.000Z" },
      { id: "clause-demo-35", key: "priceCurrency", label: "Price & currency", value: "$1180/t × 25 MT", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-21T09:35:00.000Z" },
      { id: "clause-demo-36", key: "paymentTerms", label: "Payment terms", value: "40% advance, 60% on BL", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-21T09:35:00.000Z" },
      { id: "clause-demo-37", key: "incoterms", label: "Incoterms", value: "CIF", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-21T09:35:00.000Z" },
      { id: "clause-demo-38", key: "deliveryWindow", label: "Delivery window", value: "September 2026", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-21T09:35:00.000Z" },
      { id: "clause-demo-39", key: "qcArrangement", label: "QC arrangement", value: "Independent lab report at loading, cost shared", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-21T09:35:00.000Z" },
      { id: "clause-demo-40", key: "disputeResolution", label: "Dispute resolution", value: "Arbitration in Mumbai (ICA rules)", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-21T09:35:00.000Z" },
    ],
    termSheetOpenedAt: "2026-08-21T09:35:00.000Z",
    draftBody:
      "SALE CONTRACT — AMA-2026-0005\n\nSeller: Malwa Coriander Growers\nBuyer: Atlantic Spice Importers\n\n1. Goods: Eagle grade coriander seeds, 99% purity, machine cleaned — 25 MT.\n2. Price: USD 1,180 per metric tonne, CIF Rotterdam.\n3. Payment: 40% advance on signing, 60% against Bill of Lading.\n4. Delivery window: September 2026.\n5. Quality control: independent lab report at loading, cost shared.\n6. Packaging: 50kg PP bags, palletized.\n7. Dispute resolution: arbitration in Mumbai under ICA rules.\n\nThis draft is issued for review by both parties and becomes binding once both sides confirm agreement.",
    draftVersion: 1,
    amendments: [],
    approvals: {
      buyer: { agreed: true, at: "2026-08-26T09:00:00.000Z", by: "Atlantic Spice Importers", note: null },
      seller: { agreed: true, at: "2026-08-26T14:00:00.000Z", by: "Malwa Coriander Growers", note: null },
    },
    signatures: {
      buyer: { agreed: true, at: "2026-08-28T09:00:00.000Z", by: "Atlantic Spice Importers", note: null },
      seller: { agreed: false, at: null, by: null, note: null },
    },
    po: {
      issuedAt: "2026-08-24T09:00:00.000Z",
      issuedByName: "Atlantic Spice Importers",
      terms: {
        productSpec: "Eagle grade coriander seeds, 99% purity, machine cleaned",
        packagingSpec: "50kg PP bags, palletized",
        priceCurrency: "$1180/t × 25 MT",
        paymentTerms: "40% advance, 60% on BL",
        incoterms: "CIF",
        deliveryWindow: "September 2026",
        qcArrangement: "Independent lab report at loading, cost shared",
        disputeResolution: "Arbitration in Mumbai (ICA rules)",
      },
      deviatedClauses: [],
      status: "auto-accepted",
      sellerConfirmedAt: null,
      sellerConfirmedBy: null,
      cancelledAt: null,
      cancelledBy: null,
    },
    shipmentDates: {
      id: "dates-demo-2",
      options: [
        { id: "option-demo-4", date: "2026-09-05T00:00:00.000Z", containerRef: "CNTR-91002", note: "Direct sailing, Mundra–Rotterdam" },
        { id: "option-demo-5", date: "2026-09-12T00:00:00.000Z", containerRef: "CNTR-91030", note: null },
      ],
      chosenOptionId: null,
      chosenBy: null,
      chosenAt: null,
      askedAt: "2026-08-28T10:00:00.000Z",
    },
    createdAt: "2026-08-21T09:30:00.000Z",
    updatedAt: "2026-08-28T10:00:00.000Z",
  },
  /* Contract-demo-6 — "term-sheet": every clause agreed except QC, which
   * the buyer and seller each proposed differently before it briefly
   * settled — then the buyer's PO changed it again at the moment of
   * issuing, a counter-offer that flips that one clause back to disputed
   * and leaves the PO waiting on the seller's confirmation. */
  {
    id: "contract-demo-6",
    reference: "AMA-2026-0006",
    dealId: "deal-14",
    conversationId: conv10Id,
    listingTitle: "Finger Turmeric — Grade A (Nizamabad Turmeric Growers Collective)",
    buyerId: "sourcing@silkrouteimports.example",
    buyerName: "Silk Route Imports",
    sellerId: "seed-nizamabad-turmeric",
    sellerName: "Nizamabad Turmeric Growers Collective",
    kamId: "priya@amama.com",
    kamName: "Priya Nair",
    stage: "term-sheet",
    stageHistory: [
      { stage: "summary", at: "2026-08-26T09:10:00.000Z", by: "Priya Nair", note: "Contract opened from the agreed deal" },
      { stage: "term-sheet", at: "2026-08-26T09:15:00.000Z", by: "Priya Nair", note: "Term sheet opened" },
    ],
    terms: {
      pricePerTonneUsd: 2650,
      quantityMt: 30,
      incoterm: "CIF",
      paymentTerm: "20% advance, 80% on BL",
      originPort: "Kakinada, India",
      destinationPort: "Antwerp, Belgium",
      qualitySpec: "Finger turmeric, curcumin content min 4%",
      notes: null,
    },
    requests: [
      {
        id: "request-demo-11",
        party: "buyer",
        title: "Import documentation",
        note: "Need your IEC and delivery address to finalize logistics.",
        fields: [
          { id: "field-demo-c6-1", label: "Import Export Code (IEC)", type: "text", required: true, help: null, value: "AAICE5541982" },
        ],
        documents: [
          {
            id: "doc-demo-c6-1",
            label: "Import licence copy",
            required: true,
            help: null,
            files: [{ id: "file-demo-c6-1", name: "import-licence.pdf", size: 319_000, uploadedAt: "2026-08-27T09:00:00.000Z" }],
          },
        ],
        status: "submitted",
        submittedAt: "2026-08-27T09:05:00.000Z",
        updatedAt: "2026-08-27T09:05:00.000Z",
      },
      {
        id: "request-demo-12",
        party: "seller",
        title: "Export documentation",
        note: "Need your export packing format and bank details for this shipment.",
        fields: [
          {
            id: "field-demo-c6-2",
            label: "Preferred packing format",
            type: "select",
            required: true,
            options: ["50kg jute bags", "25kg PP bags"],
            help: null,
            value: null,
          },
        ],
        documents: [
          { id: "doc-demo-c6-2", label: "Export licence / IEC", required: true, help: null, files: [] },
          { id: "doc-demo-c6-3", label: "Bank details for payment", required: false, help: null, files: [] },
        ],
        status: "open",
        submittedAt: null,
        updatedAt: "2026-08-26T10:05:00.000Z",
      },
    ],
    clauses: [
      { id: "clause-demo-41", key: "productSpec", label: "Product spec", value: "Finger turmeric, curcumin content min 4%", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-26T09:15:00.000Z" },
      { id: "clause-demo-42", key: "packagingSpec", label: "Packaging spec", value: "50kg jute bags", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-26T09:15:00.000Z" },
      { id: "clause-demo-43", key: "priceCurrency", label: "Price & currency", value: "$2650/t × 30 MT", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-26T09:15:00.000Z" },
      { id: "clause-demo-44", key: "paymentTerms", label: "Payment terms", value: "20% advance, 80% on BL", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-26T09:15:00.000Z" },
      { id: "clause-demo-45", key: "incoterms", label: "Incoterms", value: "CIF", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-26T09:15:00.000Z" },
      { id: "clause-demo-46", key: "deliveryWindow", label: "Delivery window", value: "October 2026", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-26T09:15:00.000Z" },
      {
        id: "clause-demo-47",
        key: "qcArrangement",
        label: "QC arrangement",
        value: "Independent SGS inspection at loading port, buyer's cost, results binding on both sides",
        status: "disputed",
        proposals: [
          { value: "SGS inspection at loading port, seller's cost", by: "seller", byName: "Nizamabad Turmeric Growers Collective", at: "2026-08-27T10:00:00.000Z" },
          { value: "SGS inspection at loading port, seller's cost", by: "buyer", byName: "Silk Route Imports", at: "2026-08-27T15:00:00.000Z" },
          {
            value: "Independent SGS inspection at loading port, buyer's cost, results binding on both sides",
            by: "buyer",
            byName: "Silk Route Imports",
            at: "2026-08-29T09:00:00.000Z",
          },
        ],
        linkedMessageText: null,
        updatedAt: "2026-08-29T09:00:00.000Z",
      },
      { id: "clause-demo-48", key: "disputeResolution", label: "Dispute resolution", value: "Arbitration in Mumbai (ICA rules)", status: "agreed", proposals: [], linkedMessageText: null, updatedAt: "2026-08-26T09:15:00.000Z" },
    ],
    termSheetOpenedAt: "2026-08-26T09:15:00.000Z",
    draftBody: null,
    draftVersion: 0,
    amendments: [],
    approvals: { buyer: { agreed: false, at: null, by: null, note: null }, seller: { agreed: false, at: null, by: null, note: null } },
    signatures: { buyer: { agreed: false, at: null, by: null, note: null }, seller: { agreed: false, at: null, by: null, note: null } },
    po: {
      issuedAt: "2026-08-29T09:00:00.000Z",
      issuedByName: "Silk Route Imports",
      terms: {
        productSpec: "Finger turmeric, curcumin content min 4%",
        packagingSpec: "50kg jute bags",
        priceCurrency: "$2650/t × 30 MT",
        paymentTerms: "20% advance, 80% on BL",
        incoterms: "CIF",
        deliveryWindow: "October 2026",
        qcArrangement: "Independent SGS inspection at loading port, buyer's cost, results binding on both sides",
        disputeResolution: "Arbitration in Mumbai (ICA rules)",
      },
      deviatedClauses: ["qcArrangement"],
      status: "pending-seller-confirmation",
      sellerConfirmedAt: null,
      sellerConfirmedBy: null,
      cancelledAt: null,
      cancelledBy: null,
    },
    shipmentDates: null,
    createdAt: "2026-08-26T09:10:00.000Z",
    updatedAt: "2026-08-29T09:00:00.000Z",
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
//
// Bumped to "4" for the shipment/deal-assignment scenarios added here —
// a browser that already ran "3" had genuinely exhausted every unassigned
// deal and every logged shipment in its own local testing, which read as
// "Assign a team member: 0" and "No shipments logged yet" even though
// nothing was broken; the bump forces one more clean reseed so those demo
// queues aren't permanently empty for a browser that's been used for a while.
//
// Bumped to "5" — contract-demo-1's term sheet is now fully agreed with
// no PO issued, the scenario the new "raise the purchase order" action
// item needs to actually be demoable on the buyer demo account.
//
// Bumped to "6" — the full farm-to-delivery logistics pipeline (stage,
// cutoffs, documents, cold-chain readings) was added to every seeded
// shipment, plus a brand-new pre-booking shipment for the demo seller
// account so the new dispatch checklist has something real to act on.
//
// Bumped to "7" — a browser whose `amama.marketplace.rfqs` key ended up
// empty (whatever the cause) was stuck there forever once its seed
// version already matched, since `seedRfqsIfEmpty` only ever writes to a
// genuinely empty store and the version guard skips re-running the
// clear-then-reseed step otherwise. This forces one more clean pass;
// `seller-rfqs-view.tsx` also now seeds defensively on its own mount.
const SEED_VERSION = "9"

const DEMO_LOCAL_STORAGE_KEYS = [
  "amama.marketplace.deals",
  "amama.marketplace.conversations",
  "amama.marketplace.listings",
  "amama.admin.staffChat",
  "amama.verification",
  "amama.contracts",
  "amama.marketplace.rfqs",
] as const

function seedAdminDemoData() {
  if (typeof window === "undefined") return
  const seededVersion = window.localStorage.getItem("amama.admin.seedVersion")

  // A version mismatch (including "ran an older generation before this
  // constant existed") means the seed content itself changed underneath
  // whatever this browser already has — clear it so the fresh seed can
  // actually land instead of being silently skipped by each store's own
  // "only if empty" guard. This is a demo-only prototype with no real
  // backend anywhere, so a browser's accumulated demo state is always
  // disposable; it isn't real data anyone would lose.
  if (seededVersion !== null && seededVersion !== SEED_VERSION) {
    for (const key of DEMO_LOCAL_STORAGE_KEYS) window.localStorage.removeItem(key)
  }

  // Deliberately *not* gated on the version check above beyond that: each
  // of these already only writes to a genuinely empty store, so calling
  // them again on a browser whose version already matches is always a
  // safe no-op — except in exactly the case that matters, where one
  // individual key (a deal, an RFQ, whatever) ended up empty on its own
  // — a stray `localStorage.clear()` during testing, a browser extension,
  // anything — while the version flag it sits next to didn't move. An
  // early return keyed only on the version would leave that one store
  // empty forever, since nothing else would ever ask it to reseed itself
  // again. Running the full idempotent set every time is what makes an
  // individually-empty store self-heal instead.
  seedDealsIfEmpty(SEED_DEALS)
  seedConversationsIfEmpty(SEED_CONVERSATIONS)
  seedStaffChatIfEmpty(SEED_STAFF_MESSAGES)
  seedContractsIfEmpty(SEED_CONTRACTS)
  seedRfqsIfEmpty(SEED_RFQS)
  window.localStorage.setItem("amama.admin.seedVersion", SEED_VERSION)
}

/** The same clear-then-reseed step `seedAdminDemoData` runs on a version
 *  bump, but on demand — for whenever a browser's own testing (assigning
 *  every deal, working through every shipment) has drained the demo
 *  queues and someone just wants a fresh set to look at again, without
 *  needing an actual code change to force it. Reloads the page afterward
 *  so every store re-reads from the freshly-seeded `localStorage`. */
function resetAdminDemoData() {
  if (typeof window === "undefined") return
  for (const key of DEMO_LOCAL_STORAGE_KEYS) window.localStorage.removeItem(key)
  window.localStorage.removeItem("amama.admin.seedVersion")
  window.location.reload()
}

export { seedAdminDemoData, resetAdminDemoData }
