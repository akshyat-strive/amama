"use client"

import * as React from "react"
import { ArrowLeftIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { usePeek } from "@/features/internal/peek-context"
import { EntityLink } from "@/features/internal/entity-link"
import { Eyebrow, Mono, Pill, docStatusTone, severityTone, type Tone } from "@/features/internal/tower-ui"
import * as W from "@/features/tradechain/demo-world"

/**
 * The right peek panel.
 *
 * Any entity id clicked anywhere in the product opens here, in place,
 * without losing the screen behind it. It is the single most important
 * part of the shell: it is what turns twelve separate screens into one
 * interconnected record set, because every record it shows is itself made
 * of links to other records.
 */

const dt = (value: string | null | undefined, withTime = true): string => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
    timeZone: "Asia/Kolkata",
  }).format(date)
}

const usd = (value: number): string => `USD ${value.toLocaleString("en-US")}`

/** Label/value rows for the panel. Kept local to this file rather than
 *  shared: the panel is a narrow single column, so it wants the stacked
 *  two-line treatment that would waste space on a full-width screen. */
function FieldList({
  rows,
  className,
}: {
  rows: { label: string; value: React.ReactNode }[]
  className?: string
}) {
  return (
    <dl className={cn("divide-y divide-border", className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="shrink-0 text-[12px] text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0 text-right text-[13px] font-medium text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** A labelled group of links — "4 lots", "20 pallets" — so a record's
 *  children are reachable without a separate screen. */
function LinkGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="py-3">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1.5">{children}</div>
    </div>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-[13px] leading-relaxed text-muted-foreground">{children}</p>
}

function PeekBody({ entityRef }: { entityRef: W.EntityRef }) {
  const resolved = W.resolveEntity(entityRef)
  if (!resolved) return <Prose>This record could not be found.</Prose>

  switch (entityRef.kind) {
    case "trade": {
      const trade = resolved.record as W.Trade
      const lots = W.lotsForTrade(trade.id)
      const container = W.containerForTrade(trade.id)
      const stage = W.stageByNo(trade.currentStage)
      const documents = W.documentsForTrade(trade.id)
      const open = documents.filter((d) => d.requirement === "M" && d.status !== "VERIFIED" && d.status !== "NA")
      return (
        <>
          <FieldList
            rows={[
              { label: "Buyer", value: <EntityLink kind="buyer" id={trade.buyerId} mono={false} /> },
              { label: "KAM", value: <EntityLink kind="user" id={trade.kamId} mono={false} /> },
              { label: "Product", value: <EntityLink kind="variant" id={trade.variantId} mono={false} /> },
              { label: "Stage", value: <EntityLink kind="stage" id={String(trade.currentStage)} mono={false}>{`${String(trade.currentStage).padStart(2, "0")} · ${stage.short}`}</EntityLink> },
              { label: "Route", value: `${trade.portOfLoading} → ${trade.portOfDischarge}` },
              { label: "Incoterm", value: trade.incoterm },
              { label: "Payment", value: trade.paymentTerms },
              { label: "Contracted", value: `${trade.qtyContractedMt} MT` },
              { label: "Shipping", value: trade.qtyShippedMt === null ? "—" : `${trade.qtyShippedMt} MT` },
              { label: "Price", value: `${usd(trade.priceUsdPerMt)} / MT` },
              { label: "Delivery window", value: `${dt(trade.deliveryWindow[0], false)} – ${dt(trade.deliveryWindow[1], false)}` },
              { label: "Signed", value: dt(trade.contractSignedAt) },
              { label: "Open gates", value: open.length === 0 ? "None" : `${open.length} mandatory document${open.length === 1 ? "" : "s"}` },
            ]}
          />
          <div className="divide-y divide-border">
            <LinkGroup label="Spec">
              <span className="text-[13px] leading-relaxed text-muted-foreground">{trade.spec}</span>
            </LinkGroup>
            {lots.length > 0 ? (
              <LinkGroup label={`${lots.length} lots`}>
                {lots.map((lot) => (
                  <EntityLink key={lot.id} kind="lot" id={lot.id} />
                ))}
              </LinkGroup>
            ) : null}
            {container ? (
              <LinkGroup label="Container">
                <EntityLink kind="container" id={container.id} />
              </LinkGroup>
            ) : null}
            <LinkGroup label="Sellers">
              {trade.sellerIds.map((id) => (
                <EntityLink key={id} kind="seller" id={id} mono={false} className="text-[13px]" />
              ))}
            </LinkGroup>
            <LinkGroup label="Next action">
              <span className="text-[13px] text-foreground">
                {trade.nextAction.label}
                <span className="text-muted-foreground">
                  {" "}· {W.roleById(trade.nextAction.ownerRole).label} · due {dt(trade.nextAction.dueAt)}
                </span>
              </span>
            </LinkGroup>
          </div>
        </>
      )
    }

    case "lot": {
      const lot = resolved.record as W.Lot
      const qc = W.qcRecordById(lot.qcRecordId)
      const pallets = W.palletsForLot(lot.id)
      return (
        <>
          <FieldList
            rows={[
              { label: "Trade", value: <EntityLink kind="trade" id={lot.tradeId} /> },
              { label: "Grower", value: <EntityLink kind="seller" id={lot.sellerId} mono={false} /> },
              { label: "Variety", value: <EntityLink kind="variant" id={lot.variantId} mono={false} /> },
              { label: "Harvested", value: dt(lot.harvestedAt) },
              { label: "Shelf-life clock from", value: dt(lot.shelfLifeStart) },
              { label: "Accepted", value: `${(lot.qtyAcceptedKg / 1000).toFixed(2)} MT` },
              { label: "Grade", value: lot.grade },
              { label: "QC decision", value: <Pill tone={lot.qcDecision === "PASS" ? "ok" : lot.qcDecision === "CONDITIONAL" ? "warn" : "crit"}>{lot.qcDecision}</Pill> },
              { label: "GPS", value: <Mono>{lot.gps[0].toFixed(4)}, {lot.gps[1].toFixed(4)}</Mono> },
              { label: "State", value: lot.state },
            ]}
          />
          <div className="divide-y divide-border">
            {lot.qcNote ? (
              <LinkGroup label="QC note">
                <span className="text-[13px] leading-relaxed text-muted-foreground">{lot.qcNote}</span>
              </LinkGroup>
            ) : null}
            {qc ? (
              <LinkGroup label="Measurements">
                <div className="w-full divide-y divide-border">
                  {qc.measurements.map((m) => (
                    <div key={m.label} className="flex items-baseline justify-between gap-3 py-1.5">
                      <span className="text-[12px] text-muted-foreground">{m.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] font-medium tabular-nums">{m.value}</span>
                        <Pill tone={m.pass ? "ok" : "crit"}>{m.pass ? "in spec" : "out"}</Pill>
                      </span>
                    </div>
                  ))}
                </div>
              </LinkGroup>
            ) : null}
            {pallets.length > 0 ? (
              <LinkGroup label={`${pallets.length} pallets`}>
                {pallets.map((pallet) => (
                  <EntityLink key={pallet.id} kind="pallet" id={pallet.id} />
                ))}
              </LinkGroup>
            ) : null}
          </div>
        </>
      )
    }

    case "pallet": {
      const pallet = resolved.record as W.Pallet
      return (
        <>
          <FieldList
            rows={[
              { label: "Trade", value: <EntityLink kind="trade" id={pallet.tradeId} /> },
              { label: "Lot", value: <EntityLink kind="lot" id={pallet.lotId} /> },
              { label: "Cartons", value: pallet.cartons },
              { label: "Net", value: `${pallet.netKg} kg` },
              { label: "Gross", value: `${pallet.grossKg} kg` },
              { label: "Pulp temp at pack", value: `${pallet.pulpTempAtPackC} °C` },
              { label: "Export QC", value: <Pill tone={pallet.qcResult === "approved" ? "ok" : pallet.qcResult === "substituted" ? "warn" : "crit"}>{pallet.qcResult}</Pill> },
            ]}
          />
          {pallet.note ? <Prose>{pallet.note}</Prose> : null}
        </>
      )
    }

    case "container": {
      const container = resolved.record as W.Container
      return (
        <>
          <FieldList
            rows={[
              { label: "Trade", value: <EntityLink kind="trade" id={container.tradeId} /> },
              { label: "Type", value: container.type },
              { label: "Booking", value: <Mono>{container.bookingRef}</Mono> },
              { label: "Line", value: `${container.line} · ${container.vessel} ${container.voyage}` },
              { label: "Set point", value: `${container.setpointC} °C · vent ${container.ventCbmPerHr} CBM/hr · ${container.humidityPct}% RH` },
              { label: "PTI", value: <Mono>{container.ptiRef}</Mono> },
              { label: "Seal", value: container.sealNo ? <Mono>{container.sealNo}</Mono> : "—" },
              { label: "VGM", value: container.vgmKg ? `${container.vgmKg.toLocaleString("en-US")} kg` : "—" },
              { label: "Gate-in cut-off", value: dt(container.cutoffGateIn) },
              { label: "VGM cut-off", value: dt(container.cutoffVgm) },
              { label: "SI cut-off", value: dt(container.cutoffSi) },
              { label: "ETD / ETA", value: `${dt(container.etd, false)} → ${dt(container.eta, false)}` },
              { label: "Genset off", value: dt(container.gensetOffAt) },
              { label: "Terminal power", value: dt(container.terminalPlugInAt) },
              { label: "Gated in", value: dt(container.gateInAt) },
              { label: "State", value: <Pill tone={container.state === "gated-in" || container.state === "sailed" ? "ok" : "warn"}>{container.state}</Pill> },
            ]}
          />
          <div className="divide-y divide-border">
            {container.backupBookingRef ? (
              <LinkGroup label="Backup sailing">
                <span className="text-[13px] text-muted-foreground">
                  <Mono>{container.backupBookingRef}</Mono> · ETD {dt(container.backupEtd, false)}
                </span>
              </LinkGroup>
            ) : null}
            {container.palletIds.length > 0 ? (
              <LinkGroup label={`${container.palletIds.length} pallets`}>
                {container.palletIds.map((id) => (
                  <EntityLink key={id} kind="pallet" id={id} />
                ))}
              </LinkGroup>
            ) : null}
          </div>
        </>
      )
    }

    case "document": {
      const document = resolved.record as W.TradeDocument
      return (
        <>
          <FieldList
            rows={[
              { label: "Trade", value: <EntityLink kind="trade" id={document.tradeId} /> },
              { label: "Stage", value: <EntityLink kind="stage" id={String(document.stage)} mono={false}>{`${String(document.stage).padStart(2, "0")} · ${W.stageByNo(document.stage).short}`}</EntityLink> },
              { label: "Status", value: <Pill tone={docStatusTone(document.status)}>{document.status}</Pill> },
              { label: "Required", value: document.requirement === "M" ? "Mandatory" : "Optional" },
              { label: "Issuer", value: document.issuer },
              { label: "Issued", value: dt(document.issuedOn) },
              { label: "Expires", value: dt(document.expiresOn, false) },
              { label: "Verified by", value: document.verifiedBy ? <EntityLink kind="user" id={document.verifiedBy} mono={false} /> : "—" },
            ]}
          />
          <div className="divide-y divide-border">
            <LinkGroup label="Why it exists">
              <span className="text-[13px] leading-relaxed text-muted-foreground">{document.why}</span>
            </LinkGroup>
            {document.blocks.length > 0 ? (
              <LinkGroup label="Blocks">
                {document.blocks.map((block) => (
                  <Pill key={block} tone="crit">{block}</Pill>
                ))}
              </LinkGroup>
            ) : null}
            {document.attachedTo ? (
              <LinkGroup label="Attached to">
                <EntityLink kind={document.attachedTo.kind} id={document.attachedTo.id} />
              </LinkGroup>
            ) : null}
            {document.note ? (
              <LinkGroup label="Note">
                <span className="text-[13px] leading-relaxed text-muted-foreground">{document.note}</span>
              </LinkGroup>
            ) : null}
          </div>
        </>
      )
    }

    case "user": {
      const user = resolved.record as W.InternalUser
      const role = W.roleById(user.role)
      const trades = W.TRADES.filter((trade) => trade.kamId === user.id)
      return (
        <>
          <FieldList
            rows={[
              { label: "Role", value: role.label },
              { label: "Email", value: user.email },
              { label: "Phone", value: <Mono>{user.phone}</Mono> },
              { label: "Based", value: user.base },
            ]}
          />
          <div className="divide-y divide-border">
            <LinkGroup label="Remit">
              <span className="text-[13px] leading-relaxed text-muted-foreground">{role.remit}</span>
            </LinkGroup>
            {role.escalatesTo.length > 0 ? (
              <LinkGroup label="Escalates to">
                {role.escalatesTo.map((id) => (
                  <Pill key={id} tone="muted">{W.roleById(id).label}</Pill>
                ))}
              </LinkGroup>
            ) : null}
            {trades.length > 0 ? (
              <LinkGroup label={`${trades.length} trades owned`}>
                {trades.map((trade) => (
                  <EntityLink key={trade.id} kind="trade" id={trade.id} />
                ))}
              </LinkGroup>
            ) : null}
          </div>
        </>
      )
    }

    case "buyer": {
      const buyer = resolved.record as W.Buyer
      const trades = W.tradesForBuyer(buyer.id)
      return (
        <>
          <FieldList
            rows={[
              { label: "Contact", value: buyer.contact },
              { label: "Email", value: buyer.email },
              { label: "Location", value: `${buyer.city}, ${buyer.country}` },
              { label: "KAM", value: <EntityLink kind="user" id={buyer.kamId} mono={false} /> },
              { label: "KYC", value: <Pill tone={buyer.kyc === "verified" ? "ok" : buyer.kyc === "missing" ? "crit" : "warn"}>{buyer.kyc}</Pill> },
              { label: "Prefers", value: buyer.incotermPreference },
              { label: "Customer since", value: dt(buyer.since, false) },
              { label: "Lifetime", value: usd(buyer.lifetimeUsd) },
            ]}
          />
          <div className="divide-y divide-border">
            <LinkGroup label="Buys">
              {buyer.products.map((id) => (
                <EntityLink key={id} kind="product" id={id} mono={false} className="text-[13px]" />
              ))}
            </LinkGroup>
            {trades.length > 0 ? (
              <LinkGroup label={`${trades.length} trades`}>
                {trades.map((trade) => (
                  <EntityLink key={trade.id} kind="trade" id={trade.id} />
                ))}
              </LinkGroup>
            ) : null}
          </div>
        </>
      )
    }

    case "seller": {
      const seller = resolved.record as W.Seller
      const trades = W.tradesForSeller(seller.id)
      return (
        <>
          <FieldList
            rows={[
              { label: "Entity", value: seller.entity },
              { label: "Location", value: `${seller.village}, ${seller.district}, ${seller.state}` },
              { label: "GPS", value: <Mono>{seller.gps[0].toFixed(4)}, {seller.gps[1].toFixed(4)}</Mono> },
              { label: "Area", value: seller.areaHa > 0 ? `${seller.areaHa} ha` : "Processor — no land" },
              { label: "Altitude", value: `${seller.altitudeM} m` },
              { label: "Capacity", value: `${seller.capacityMtPerSeason} MT / season` },
              { label: "QC pass rate", value: `${seller.passRatePct}%` },
              { label: "KYC", value: <Pill tone={seller.kyc === "verified" ? "ok" : seller.kyc === "missing" ? "crit" : "warn"}>{seller.kyc}</Pill> },
              { label: "KAM", value: <EntityLink kind="user" id={seller.kamId} mono={false} /> },
              { label: "Onboarded", value: dt(seller.onboardedAt, false) },
            ]}
          />
          <div className="divide-y divide-border">
            <LinkGroup label="Grows">
              {seller.products.map((id) => (
                <EntityLink key={id} kind="product" id={id} mono={false} className="text-[13px]" />
              ))}
            </LinkGroup>
            {trades.length > 0 ? (
              <LinkGroup label={`${trades.length} trades`}>
                {trades.map((trade) => (
                  <EntityLink key={trade.id} kind="trade" id={trade.id} />
                ))}
              </LinkGroup>
            ) : null}
          </div>
        </>
      )
    }

    case "product": {
      const product = resolved.record as W.Product
      const variants = W.variantsForProduct(product.id)
      return (
        <>
          <FieldList
            rows={[
              { label: "Category", value: W.CATEGORIES.find((c) => c.id === product.categoryId)?.label ?? product.categoryId },
              { label: "HS code", value: <Mono>{product.hsCode}</Mono> },
              { label: "Shelf life", value: `${product.shelfLifeDays} days` },
              { label: "Carriage set point", value: `${product.setpointC} °C` },
            ]}
          />
          <div className="divide-y divide-border">
            <LinkGroup label={`${variants.length} variants`}>
              {variants.map((variant) => (
                <EntityLink key={variant.id} kind="variant" id={variant.id} mono={false} className="text-[13px]" />
              ))}
            </LinkGroup>
          </div>
        </>
      )
    }

    case "variant": {
      const variant = resolved.record as W.Variant
      const listings = W.listingsForVariant(variant.id)
      return (
        <>
          <FieldList
            rows={[
              { label: "Product", value: <EntityLink kind="product" id={variant.productId} mono={false} /> },
              { label: "Spec", value: variant.spec },
              { label: "Sellers offering", value: listings.length },
              { label: "From", value: listings.length > 0 ? `${usd(Math.min(...listings.map((l) => l.priceUsdPerMt)))} / MT` : "—" },
            ]}
          />
          <div className="divide-y divide-border">
            {listings.length > 0 ? (
              <LinkGroup label="Offers">
                {listings.map((listing) => (
                  <EntityLink key={listing.id} kind="listing" id={listing.id} mono={false} className="text-[13px]">
                    {`${W.sellerById(listing.sellerId)?.entity ?? listing.sellerId} — ${usd(listing.priceUsdPerMt)}`}
                  </EntityLink>
                ))}
              </LinkGroup>
            ) : null}
          </div>
        </>
      )
    }

    case "listing": {
      const listing = resolved.record as W.Listing
      return (
        <FieldList
          rows={[
            { label: "Seller", value: <EntityLink kind="seller" id={listing.sellerId} mono={false} /> },
            { label: "Variant", value: <EntityLink kind="variant" id={listing.variantId} mono={false} /> },
            { label: "Price", value: `${usd(listing.priceUsdPerMt)} / MT` },
            { label: "Available", value: `${listing.availableMt} MT` },
            { label: "Min order", value: `${listing.minOrderMt} MT` },
            { label: "Incoterm", value: listing.incoterm },
            { label: "Lead time", value: `${listing.leadTimeDays} days` },
            { label: "Status", value: <Pill tone={listing.status === "available" ? "ok" : "warn"}>{listing.status}</Pill> },
            { label: "Updated", value: dt(listing.updatedAt, false) },
          ]}
        />
      )
    }

    case "conversation": {
      const conversation = resolved.record as W.Conversation
      const messages = W.messagesForConversation(conversation.id)
      const last = messages[messages.length - 1]
      return (
        <>
          <FieldList
            rows={[
              { label: "Kind", value: conversation.kind.replace("-", " ↔ ") },
              { label: "Trade", value: conversation.tradeId ? <EntityLink kind="trade" id={conversation.tradeId} /> : "—" },
              { label: "RFQ", value: conversation.rfqId ? <EntityLink kind="rfq" id={conversation.rfqId} /> : "—" },
              { label: "Messages", value: messages.length },
              { label: "Started", value: dt(conversation.startedAt) },
              { label: "Last message", value: dt(conversation.lastMessageAt) },
              { label: "Unread", value: conversation.unread },
            ]}
          />
          <div className="divide-y divide-border">
            <LinkGroup label="Participants">
              {conversation.participantIds.map((id) => {
                const kind: W.EntityKind = id.startsWith("u-") ? "user" : id.startsWith("b-") ? "buyer" : "seller"
                return <EntityLink key={id} kind={kind} id={id} mono={false} className="text-[13px]" />
              })}
            </LinkGroup>
            {last ? <Prose>{`Latest — ${last.body}`}</Prose> : null}
          </div>
        </>
      )
    }

    case "rfq": {
      const rfq = resolved.record as W.Rfq
      const quotes = W.quotesForRfq(rfq.id)
      return (
        <>
          <FieldList
            rows={[
              { label: "Buyer", value: <EntityLink kind="buyer" id={rfq.buyerId} mono={false} /> },
              { label: "KAM", value: <EntityLink kind="user" id={rfq.kamId} mono={false} /> },
              { label: "Product", value: <EntityLink kind="variant" id={rfq.variantId} mono={false} /> },
              { label: "Quantity", value: `${rfq.qtyMt} MT` },
              { label: "Incoterm", value: rfq.incoterm },
              { label: "Destination", value: rfq.destination },
              { label: "Window", value: `${dt(rfq.deliveryWindow[0], false)} – ${dt(rfq.deliveryWindow[1], false)}` },
              { label: "Raised", value: dt(rfq.raisedAt) },
              { label: "Respond by", value: dt(rfq.respondBy) },
              { label: "Status", value: <Pill tone={rfq.status === "awarded" ? "ok" : rfq.status === "lost" ? "crit" : "warn"}>{rfq.status}</Pill> },
              { label: "Trade", value: rfq.tradeId ? <EntityLink kind="trade" id={rfq.tradeId} /> : "—" },
            ]}
          />
          <div className="divide-y divide-border">
            <LinkGroup label="Specification">
              <div className="w-full divide-y divide-border">
                {rfq.specLines.map((line) => (
                  <div key={line.label} className="flex items-baseline justify-between gap-3 py-1.5">
                    <span className="text-[12px] text-muted-foreground">{line.label}</span>
                    <span className="text-[13px] font-medium tabular-nums">{line.requirement}</span>
                  </div>
                ))}
              </div>
            </LinkGroup>
            <LinkGroup label="Packaging">
              <span className="text-[13px] leading-relaxed text-muted-foreground">{rfq.packaging}</span>
            </LinkGroup>
            <LinkGroup label={`${quotes.length} quotes`}>
              {quotes.map((quote) => (
                <EntityLink key={quote.id} kind="quote" id={quote.id} />
              ))}
            </LinkGroup>
            <LinkGroup label={`${rfq.invitations.length} invited`}>
              {rfq.invitations.map((invitation) => (
                <EntityLink
                  key={invitation.sellerId}
                  kind="seller"
                  id={invitation.sellerId}
                  mono={false}
                  className="text-[13px]"
                />
              ))}
            </LinkGroup>
          </div>
        </>
      )
    }

    case "quote": {
      const quote = resolved.record as W.Quote
      return (
        <>
          <FieldList
            rows={[
              { label: "RFQ", value: <EntityLink kind="rfq" id={quote.rfqId} /> },
              { label: "Seller", value: <EntityLink kind="seller" id={quote.sellerId} mono={false} /> },
              { label: "Price", value: `${usd(quote.priceUsdPerMt)} / MT` },
              { label: "Available", value: `${quote.availableMt} MT` },
              { label: "Incoterm", value: quote.incoterm },
              { label: "Lead time", value: `${quote.leadTimeDays} days` },
              { label: "Valid until", value: dt(quote.validUntil, false) },
              { label: "Submitted", value: dt(quote.submittedAt) },
              { label: "Status", value: <Pill tone={quote.status === "accepted" ? "ok" : quote.status === "not-selected" || quote.status === "withdrawn" ? "muted" : "warn"}>{quote.status}</Pill> },
            ]}
          />
          {quote.note ? <Prose>{quote.note}</Prose> : null}
        </>
      )
    }

    case "termSheet": {
      const sheet = resolved.record as W.TermSheet
      const agreed = sheet.clauses.filter((c) => c.status === "agreed").length
      return (
        <>
          <FieldList
            rows={[
              { label: "Buyer", value: <EntityLink kind="buyer" id={sheet.buyerId} mono={false} /> },
              { label: "KAM", value: <EntityLink kind="user" id={sheet.kamId} mono={false} /> },
              { label: "RFQ", value: <EntityLink kind="rfq" id={sheet.rfqId} /> },
              { label: "Version", value: `v${sheet.version}` },
              { label: "Status", value: <Pill tone={sheet.status === "signed" ? "ok" : sheet.status === "rejected" ? "crit" : "warn"}>{sheet.status}</Pill> },
              { label: "Clauses agreed", value: `${agreed} of ${sheet.clauses.length}` },
              { label: "Opened", value: dt(sheet.openedAt) },
              { label: "Closed", value: dt(sheet.closedAt) },
              { label: "Trade", value: sheet.tradeId ? <EntityLink kind="trade" id={sheet.tradeId} /> : "—" },
              { label: "PO", value: sheet.poId ? <EntityLink kind="po" id={sheet.poId} /> : "—" },
            ]}
          />
          <div className="divide-y divide-border">
            {sheet.clauses.map((clause) => (
              <div key={clause.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] font-semibold">{clause.label}</p>
                  <Pill tone={clause.status === "agreed" ? "ok" : clause.status === "disputed" ? "crit" : "muted"}>
                    {clause.status}
                  </Pill>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{clause.amamaPosition}</p>
                {clause.buyerPosition ? (
                  <p className="mt-1 text-[12px] leading-relaxed text-status-warning">Buyer: {clause.buyerPosition}</p>
                ) : null}
                {clause.note ? (
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground italic">{clause.note}</p>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )
    }

    case "po": {
      const po = resolved.record as W.PurchaseOrder
      return (
        <>
          <FieldList
            rows={[
              { label: "Buyer", value: <EntityLink kind="buyer" id={po.buyerId} mono={false} /> },
              { label: "KAM", value: <EntityLink kind="user" id={po.kamId} mono={false} /> },
              { label: "Term sheet", value: po.termSheetId ? <EntityLink kind="termSheet" id={po.termSheetId} /> : "—" },
              { label: "Trade", value: po.tradeId ? <EntityLink kind="trade" id={po.tradeId} /> : "—" },
              { label: "Issued", value: dt(po.issuedAt) },
              { label: "Quantity", value: `${po.qtyMt} MT` },
              { label: "Price", value: `${usd(po.priceUsdPerMt)} / MT` },
              { label: "Incoterm", value: po.incoterm },
              { label: "Payment", value: po.paymentTerms },
              { label: "Status", value: <Pill tone={po.status === "auto-accepted" || po.status === "confirmed" ? "ok" : po.status === "cancelled" ? "muted" : "warn"}>{po.status}</Pill> },
              { label: "Confirmed", value: dt(po.confirmedAt) },
            ]}
          />
          {po.deviations.length > 0 ? (
            <div className="divide-y divide-border">
              <LinkGroup label="Deviations from the term sheet">
                <div className="w-full space-y-1.5">
                  {po.deviations.map((deviation) => (
                    <p key={deviation} className="text-[13px] leading-relaxed text-status-warning">
                      {deviation}
                    </p>
                  ))}
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    A PO that changes an agreed term is a counter-offer, not an acceptance — nothing is committed
                    until it is confirmed.
                  </p>
                </div>
              </LinkGroup>
            </div>
          ) : (
            <Prose>
              This PO matched the agreed term sheet on every clause, so it was accepted automatically — no seller
              confirmation was required.
            </Prose>
          )}
        </>
      )
    }

    case "shipment": {
      const shipment = resolved.record as W.Shipment
      const paid = shipment.charges.filter((charge) => charge.payer === "AMAMA")
      const ourCost = paid.reduce((sum, charge) => sum + charge.amountUsd, 0)
      return (
        <>
          <FieldList
            rows={[
              { label: "Trade", value: <EntityLink kind="trade" id={shipment.tradeId} /> },
              { label: "Container", value: shipment.containerId ? <EntityLink kind="container" id={shipment.containerId} /> : "Not allocated" },
              { label: "Status", value: <Pill tone={shipment.status === "delivered" ? "ok" : shipment.status === "in-transit" ? "brand" : "warn"}>{shipment.status}</Pill> },
              { label: "Carrier", value: `${shipment.carrier} · ${shipment.vessel} ${shipment.voyage}` },
              { label: "Booking", value: <Mono>{shipment.bookingRef}</Mono> },
              { label: "Route", value: `${shipment.portOfLoading} → ${shipment.portOfDischarge}` },
              { label: "Incoterm", value: `${shipment.incoterm} · freight ${shipment.freightTerms.toLowerCase()}` },
              { label: "ETD", value: dt(shipment.etd) },
              { label: "ETA", value: dt(shipment.eta) },
              { label: "ETA variance", value: shipment.etaVarianceHrs === 0 ? "On schedule" : `+${shipment.etaVarianceHrs} hrs` },
              { label: "Transit", value: `${shipment.transitDays} days` },
              { label: "B/L", value: shipment.blNo ? <Mono>{shipment.blNo}</Mono> : "Not released" },
              { label: "Our freight cost", value: usd(ourCost) },
            ]}
          />
          <div className="divide-y divide-border">
            <LinkGroup label={`${shipment.legs.length} legs`}>
              <div className="w-full divide-y divide-border">
                {shipment.legs.map((leg) => (
                  <div key={leg.id} className="flex items-baseline justify-between gap-3 py-1.5">
                    <span className="min-w-0 text-[12px] text-muted-foreground">
                      {leg.from} → {leg.to}
                    </span>
                    <Pill tone={leg.state === "complete" ? "ok" : leg.state === "in-progress" ? "brand" : "muted"}>
                      {leg.mode}
                    </Pill>
                  </div>
                ))}
              </div>
            </LinkGroup>
          </div>
        </>
      )
    }

    case "stage": {
      const stage = resolved.record as W.Stage
      const phase = W.phaseForStage(stage.n)
      return (
        <>
          <FieldList
            rows={[
              { label: "Phase", value: phase.label },
              { label: "Owner", value: W.roleById(stage.ownerRole).label },
              { label: "Risk", value: <Pill tone={stage.risk > 50 ? "crit" : stage.risk > 35 ? "warn" : "ok"}>{`${stage.risk} · ${stage.band}`}</Pill> },
              { label: "SLA", value: stage.sla },
              { label: "Input", value: stage.input },
              { label: "Output", value: stage.output },
            ]}
          />
          <div className="divide-y divide-border">
            <LinkGroup label="Trigger"><span className="text-[13px] text-muted-foreground">{stage.trigger}</span></LinkGroup>
            <LinkGroup label="System does"><span className="text-[13px] text-muted-foreground">{stage.systemAction}</span></LinkGroup>
            <LinkGroup label="Human does"><span className="text-[13px] text-muted-foreground">{stage.humanAction}</span></LinkGroup>
            <LinkGroup label={`${stage.docs.length} documents`}>
              {stage.docs.map((doc) => (
                <Pill key={doc.name} tone={doc.requirement === "M" ? "brand" : "muted"}>{doc.name}</Pill>
              ))}
            </LinkGroup>
          </div>
        </>
      )
    }

    case "event": {
      const event = resolved.record as W.WorldEvent
      return (
        <>
          <FieldList
            rows={[
              { label: "When", value: dt(event.at) },
              { label: "Kind", value: event.kind },
              { label: "Trade", value: event.tradeId ? <EntityLink kind="trade" id={event.tradeId} /> : "—" },
              { label: "Actor", value: event.actorId ? <EntityLink kind={event.actorId.startsWith("u-") ? "user" : event.actorId.startsWith("b-") ? "buyer" : "seller"} id={event.actorId} mono={false} /> : "System" },
            ]}
          />
          <Prose>{event.summary}</Prose>
          {event.subject ? (
            <div className="divide-y divide-border">
              <LinkGroup label="Subject">
                <EntityLink kind={event.subject.kind} id={event.subject.id} />
              </LinkGroup>
            </div>
          ) : null}
        </>
      )
    }

    case "notification": {
      const notification = resolved.record as W.Notification
      return (
        <>
          <FieldList
            rows={[
              { label: "Severity", value: <Pill tone={severityTone(notification.level)}>{notification.level}</Pill> },
              { label: "Raised", value: dt(notification.at) },
              { label: "Owner", value: W.roleById(notification.ownerRole).label },
              { label: "Trade", value: notification.tradeId ? <EntityLink kind="trade" id={notification.tradeId} /> : "—" },
              { label: "Stage", value: notification.stage ? <EntityLink kind="stage" id={String(notification.stage)} mono={false}>{`${String(notification.stage).padStart(2, "0")} · ${W.stageByNo(notification.stage).short}`}</EntityLink> : "—" },
            ]}
          />
          <Prose>{notification.body}</Prose>
          {notification.subject ? (
            <div className="divide-y divide-border">
              <LinkGroup label="Subject">
                <EntityLink kind={notification.subject.kind} id={notification.subject.id} />
              </LinkGroup>
            </div>
          ) : null}
        </>
      )
    }

    default:
      return <Prose>No detail view for this record type yet.</Prose>
  }
}

const KIND_LABEL: Record<W.EntityKind, string> = {
  trade: "Trade", lot: "Lot", pallet: "Pallet", container: "Container", document: "Document",
  user: "Team member", buyer: "Buyer", seller: "Seller", product: "Product", variant: "Variant",
  listing: "Listing", conversation: "Conversation", rfq: "RFQ", quote: "Quote",
  termSheet: "Term sheet", po: "Purchase order", shipment: "Shipment", stage: "Stage",
  event: "Event", notification: "Notification",
}

/** The panel chrome. Slides in from the end edge and pushes nothing — it
 *  overlays, so the screen behind keeps its scroll position. */
function PeekPanel() {
  const { current, canGoBack, back, close } = usePeek()
  const resolved = current ? W.resolveEntity(current) : null
  const open = Boolean(current && resolved)

  return (
    <>
      <button
        type="button"
        aria-hidden={!open}
        tabIndex={-1}
        onClick={close}
        className={cn(
          "fixed inset-0 z-50 bg-foreground/20 transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 end-0 z-50 flex w-[min(30rem,100vw)] flex-col border-s border-border bg-card shadow-2xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"
        )}
      >
        {current && resolved ? (
          <>
            <header className="flex shrink-0 items-start gap-2 border-b border-border px-4 py-3">
              {canGoBack ? (
                <button
                  type="button"
                  onClick={back}
                  aria-label="Back"
                  className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ArrowLeftIcon className="size-4" />
                </button>
              ) : null}
              <div className="min-w-0 flex-1">
                <Eyebrow>{KIND_LABEL[current.kind]}</Eyebrow>
                <h2 className="mt-0.5 truncate text-[16px] font-bold tracking-tight">{resolved.title}</h2>
                <p className="truncate text-[12px] text-muted-foreground">{resolved.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close panel"
                className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
              <PeekBody entityRef={current} />
            </div>
          </>
        ) : null}
      </aside>
    </>
  )
}

export { PeekPanel }
export type { Tone }
