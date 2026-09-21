"use client"

import * as React from "react"
import { CalendarPlusIcon, PlusIcon, SendIcon, SparklesIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  askShipmentDates,
  CONTRACT_STAGE_LABELS,
  CONTRACT_STAGE_ORDER,
  openTermSheet,
  publishDraft,
  requestTermSheet,
  resolveAmendment,
  setStage,
  updateTerms,
  type Contract,
  type TermSheetFieldType,
} from "@/features/contracts/contract-store"

type DraftField = { label: string; type: TermSheetFieldType; required: boolean }
type DraftDocument = { label: string; required: boolean }

/**
 * What a KAM actually asks each side for, ready-made. Typing the same
 * eight questions for every contract is how term sheets get skipped, so
 * the common case is one click and the fields stay editable underneath.
 */
const REQUEST_PRESETS: Record<
  "buyer" | "seller",
  { id: string; title: string; fields: DraftField[]; documents: DraftDocument[] }[]
> = {
  buyer: [
    {
      id: "buyer-delivery",
      title: "Delivery & import details",
      fields: [
        { label: "Consignee name", type: "text", required: true },
        { label: "Delivery address", type: "textarea", required: true },
        { label: "Destination port", type: "text", required: true },
        { label: "Import licence number", type: "text", required: false },
        { label: "Required delivery by", type: "date", required: false },
      ],
      documents: [
        { label: "Import licence", required: true },
        { label: "Company registration", required: false },
      ],
    },
    {
      id: "buyer-payment",
      title: "Payment & banking details",
      fields: [
        { label: "Preferred payment term", type: "select", required: true },
        { label: "Bank name", type: "text", required: true },
        { label: "SWIFT / BIC", type: "text", required: false },
      ],
      documents: [{ label: "Letter of credit", required: false }],
    },
  ],
  seller: [
    {
      id: "seller-export",
      title: "Export & quality details",
      fields: [
        { label: "Exporter legal name", type: "text", required: true },
        { label: "Port of loading", type: "text", required: true },
        { label: "Harvest / production date", type: "date", required: true },
        { label: "Packing specification", type: "textarea", required: false },
      ],
      documents: [
        { label: "Phytosanitary certificate", required: true },
        { label: "Lab / quality report", required: true },
        { label: "Certificate of origin", required: false },
      ],
    },
    {
      id: "seller-logistics",
      title: "Loading & container details",
      fields: [
        { label: "Container type", type: "select", required: true },
        { label: "Ready-to-load date", type: "date", required: true },
      ],
      documents: [{ label: "Packing list", required: true }],
    },
  ],
}

const FIELD_TYPES: TermSheetFieldType[] = ["text", "number", "date", "select", "textarea"]

/** Everything only the KAM can do to a contract, in one place under the
 *  read-only record both sides share. */
function ContractAuthoring({ contract, kamName }: { contract: Contract; kamName: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-amama-deep/30 bg-amama-subtle/40 p-5">
      <div>
        <h3 className="text-[15px] font-semibold">Account manager tools</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Only you can see this. Everything you send here lands in the deal conversation as a card the
          right side can act on.
        </p>
      </div>

      <TermsPanel contract={contract} />
      {!contract.termSheetOpenedAt ? (
        <Section title="Term sheet">
          <p className="text-[12px] text-muted-foreground">
            Opens the clause-by-clause negotiation card in the conversation — both sides propose and agree each
            clause from there.
          </p>
          <Button className="mt-3" onClick={() => openTermSheet(contract.id, kamName)}>
            <SendIcon className="size-4" />
            Open term sheet for negotiation
          </Button>
        </Section>
      ) : null}
      <RequestBuilder contract={contract} />
      <DraftPanel contract={contract} kamName={kamName} />
      <ShipmentDatesPanel contract={contract} kamName={kamName} />
      {contract.amendments.some((amendment) => !amendment.resolved) ? (
        <AmendmentsPanel contract={contract} />
      ) : null}
      <StagePanel contract={contract} kamName={kamName} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] border border-border bg-card p-4">
      <h4 className="text-[13px] font-bold text-foreground">{title}</h4>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function TermsPanel({ contract }: { contract: Contract }) {
  return (
    <Section title="Contract terms">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <LabelledInput
          label="Payment term"
          value={contract.terms.paymentTerm ?? ""}
          placeholder="e.g. 30% advance, 70% against B/L"
          onChange={(value) => updateTerms(contract.id, { paymentTerm: value || null })}
        />
        <LabelledInput
          label="Incoterm"
          value={contract.terms.incoterm ?? ""}
          placeholder="e.g. CIF"
          onChange={(value) => updateTerms(contract.id, { incoterm: value || null })}
        />
        <LabelledInput
          label="Origin port"
          value={contract.terms.originPort ?? ""}
          onChange={(value) => updateTerms(contract.id, { originPort: value || null })}
        />
        <LabelledInput
          label="Destination port"
          value={contract.terms.destinationPort ?? ""}
          onChange={(value) => updateTerms(contract.id, { destinationPort: value || null })}
        />
        <div className="sm:col-span-2">
          <LabelledInput
            label="Quality specification"
            value={contract.terms.qualitySpec ?? ""}
            placeholder="e.g. Moisture ≤ 8%, defects ≤ 2%"
            onChange={(value) => updateTerms(contract.id, { qualitySpec: value || null })}
          />
        </div>
      </div>
    </Section>
  )
}

function LabelledInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[12px] font-medium text-foreground">
      {label}
      <Input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

/**
 * Builds one side's term sheet. A preset fills it in; the rows stay
 * editable so an unusual deal can still ask for exactly what it needs.
 */
function RequestBuilder({ contract }: { contract: Contract }) {
  const [party, setParty] = React.useState<"buyer" | "seller">("buyer")
  // `null`, not `undefined` — Base UI decides controlled-vs-uncontrolled on
  // the first render, and `undefined` there means "uncontrolled forever".
  const [presetId, setPresetId] = React.useState<string | null>(null)
  const [title, setTitle] = React.useState("")
  const [note, setNote] = React.useState("")
  const [fields, setFields] = React.useState<DraftField[]>([])
  const [documents, setDocuments] = React.useState<DraftDocument[]>([])

  const applyPreset = (presetId: string) => {
    const preset = REQUEST_PRESETS[party].find((entry) => entry.id === presetId)
    if (!preset) return
    setTitle(preset.title)
    setFields(preset.fields.map((field) => ({ ...field })))
    setDocuments(preset.documents.map((document) => ({ ...document })))
  }

  const send = () => {
    if (!title.trim() || (fields.length === 0 && documents.length === 0)) return
    requestTermSheet(contract.id, {
      party,
      title: title.trim(),
      note: note.trim() || null,
      fields: fields
        .filter((field) => field.label.trim())
        .map((field) => ({
          label: field.label.trim(),
          type: field.type,
          required: field.required,
          help: null,
          options: field.type === "select" ? ["Yes", "No"] : undefined,
        })),
      documents: documents
        .filter((document) => document.label.trim())
        .map((document) => ({ label: document.label.trim(), required: document.required, help: null })),
    })
    setTitle("")
    setNote("")
    setFields([])
    setDocuments([])
    setPresetId(null)
  }

  return (
    <Section title="Ask a side for details & documents">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[12px] font-medium text-foreground">
            Who are you asking?
            <Select
              value={party}
              onValueChange={(value) => {
                setParty((value as "buyer" | "seller") ?? "buyer")
                setPresetId(null)
                setFields([])
                setDocuments([])
                setTitle("")
              }}
            >
              <SelectTrigger>
                {/* Base UI renders the raw value unless told otherwise, and
                    "buyer" is not what the KAM is picking — a named company is. */}
                <SelectValue>
                  {(value) =>
                    value === "seller" ? `${contract.sellerName} (seller)` : `${contract.buyerName} (buyer)`
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer">{contract.buyerName} (buyer)</SelectItem>
                <SelectItem value="seller">{contract.sellerName} (seller)</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1.5 text-[12px] font-medium text-foreground">
            Start from a template
            <Select
              value={presetId}
              onValueChange={(value) => {
                const next = value ?? null
                setPresetId(next)
                if (next) applyPreset(next)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a template">
                  {(value) =>
                    REQUEST_PRESETS[party].find((preset) => preset.id === value)?.title ?? "Choose a template"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {REQUEST_PRESETS[party].map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        <LabelledInput label="Title" value={title} placeholder="What are you asking for?" onChange={setTitle} />

        <label className="flex flex-col gap-1.5 text-[12px] font-medium text-foreground">
          Note (optional)
          <Textarea
            rows={2}
            value={note}
            placeholder="Anything that helps them fill this in correctly…"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        <RowEditor
          label="Questions"
          addLabel="Add question"
          rows={fields}
          onAdd={() => setFields((current) => [...current, { label: "", type: "text", required: true }])}
          onRemove={(index) => setFields((current) => current.filter((_, i) => i !== index))}
          renderRow={(field, index) => (
            <>
              <Input
                value={field.label}
                placeholder="Question"
                className="min-w-0 flex-1"
                onChange={(event) =>
                  setFields((current) =>
                    current.map((entry, i) => (i === index ? { ...entry, label: event.target.value } : entry))
                  )
                }
              />
              <Select
                value={field.type}
                onValueChange={(value) =>
                  setFields((current) =>
                    current.map((entry, i) =>
                      i === index ? { ...entry, type: (value as TermSheetFieldType) ?? "text" } : entry
                    )
                  )
                }
              >
                <SelectTrigger size="sm" className="w-[104px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <RequiredToggle
                checked={field.required}
                onChange={(checked) =>
                  setFields((current) =>
                    current.map((entry, i) => (i === index ? { ...entry, required: checked } : entry))
                  )
                }
              />
            </>
          )}
        />

        <RowEditor
          label="Documents"
          addLabel="Add document"
          rows={documents}
          onAdd={() => setDocuments((current) => [...current, { label: "", required: true }])}
          onRemove={(index) => setDocuments((current) => current.filter((_, i) => i !== index))}
          renderRow={(document, index) => (
            <>
              <Input
                value={document.label}
                placeholder="Document name"
                className="min-w-0 flex-1"
                onChange={(event) =>
                  setDocuments((current) =>
                    current.map((entry, i) => (i === index ? { ...entry, label: event.target.value } : entry))
                  )
                }
              />
              <RequiredToggle
                checked={document.required}
                onChange={(checked) =>
                  setDocuments((current) =>
                    current.map((entry, i) => (i === index ? { ...entry, required: checked } : entry))
                  )
                }
              />
            </>
          )}
        />

        <Button
          className="self-start"
          disabled={!title.trim() || (fields.length === 0 && documents.length === 0)}
          onClick={send}
        >
          <SendIcon className="size-4" />
          Send to {party === "buyer" ? contract.buyerName : contract.sellerName}
        </Button>
      </div>
    </Section>
  )
}

function RowEditor<T>({
  label,
  addLabel,
  rows,
  onAdd,
  onRemove,
  renderRow,
}: {
  label: string
  addLabel: string
  rows: T[]
  onAdd: () => void
  onRemove: (index: number) => void
  renderRow: (row: T, index: number) => React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-foreground">{label}</span>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <PlusIcon className="size-3.5" />
          {addLabel}
        </Button>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          {renderRow(row, index)}
          <button
            type="button"
            aria-label="Remove row"
            onClick={() => onRemove(index)}
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

function RequiredToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      Required
    </label>
  )
}

/** Writes the draft both sides then have to agree. The generator is a
 *  starting point built from what's already known — terms plus whatever
 *  each side has submitted — not a finished document. */
function DraftPanel({ contract, kamName }: { contract: Contract; kamName: string }) {
  const [body, setBody] = React.useState(contract.draftBody ?? "")

  const generate = () => {
    const submitted = contract.requests.filter((request) => request.status === "submitted")
    const answers = submitted
      .flatMap((request) =>
        request.fields
          .filter((field) => field.value)
          .map((field) => `  ${field.label}: ${field.value}`)
      )
      .join("\n")

    setBody(
      [
        `SALE CONTRACT ${contract.reference}`,
        "",
        `Seller: ${contract.sellerName}`,
        `Buyer: ${contract.buyerName}`,
        `Goods: ${contract.listingTitle}`,
        "",
        "COMMERCIAL TERMS",
        `  Price: ${contract.terms.pricePerTonneUsd} USD per tonne`,
        `  Quantity: ${contract.terms.quantityMt} MT`,
        `  Total value: ${contract.terms.pricePerTonneUsd * contract.terms.quantityMt} USD`,
        `  Incoterm: ${contract.terms.incoterm ?? "to be agreed"}`,
        `  Payment: ${contract.terms.paymentTerm ?? "to be agreed"}`,
        `  Origin: ${contract.terms.originPort ?? "to be confirmed"}`,
        `  Destination: ${contract.terms.destinationPort ?? "to be confirmed"}`,
        `  Quality: ${contract.terms.qualitySpec ?? "as per sample"}`,
        ...(answers ? ["", "PARTY DETAILS", answers] : []),
        "",
        `Prepared by ${kamName} for Amama Exports.`,
      ].join("\n")
    )
  }

  return (
    <Section title={contract.draftBody ? `Revise draft (currently v${contract.draftVersion})` : "Write the draft"}>
      <div className="flex flex-col gap-3">
        <Textarea
          rows={10}
          value={body}
          placeholder="Write the contract, or generate a starting point from the terms above."
          onChange={(event) => setBody(event.target.value)}
          className="font-mono text-[12px]"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={generate}>
            <SparklesIcon className="size-4" />
            Generate from terms
          </Button>
          <Button disabled={!body.trim()} onClick={() => publishDraft(contract.id, body.trim(), kamName)}>
            <SendIcon className="size-4" />
            {contract.draftBody ? "Share revised draft" : "Share with both sides"}
          </Button>
        </div>
        {contract.draftBody ? (
          <p className="text-[12px] text-muted-foreground">
            Sharing a revised draft resets both sides&apos; agreement — they&apos;ll each need to accept the new
            version.
          </p>
        ) : null}
      </div>
    </Section>
  )
}

/** The sail dates this desk can actually honour, given which containers
 *  are free. The buyer picks one from the chat. */
function ShipmentDatesPanel({ contract, kamName }: { contract: Contract; kamName: string }) {
  const [options, setOptions] = React.useState<{ date: string; containerRef: string }[]>([
    { date: "", containerRef: "" },
  ])

  const valid = options.filter((option) => option.date)

  return (
    <Section title="Offer shipping dates">
      <div className="flex flex-col gap-3">
        <p className="text-[12px] text-muted-foreground">
          Only offer dates you have a container free for — {contract.buyerName} picks one and that starts the
          shipment.
        </p>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              type="date"
              value={option.date}
              className="min-w-0 flex-1"
              onChange={(event) =>
                setOptions((current) =>
                  current.map((entry, i) => (i === index ? { ...entry, date: event.target.value } : entry))
                )
              }
            />
            <Input
              value={option.containerRef}
              placeholder="Container ref"
              className="min-w-0 flex-1"
              onChange={(event) =>
                setOptions((current) =>
                  current.map((entry, i) => (i === index ? { ...entry, containerRef: event.target.value } : entry))
                )
              }
            />
            <button
              type="button"
              aria-label="Remove date"
              onClick={() => setOptions((current) => current.filter((_, i) => i !== index))}
              className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOptions((current) => [...current, { date: "", containerRef: "" }])}
          >
            <PlusIcon className="size-3.5" />
            Add a date
          </Button>
          <Button
            size="sm"
            disabled={valid.length === 0}
            onClick={() => {
              askShipmentDates(
                contract.id,
                valid.map((option) => ({
                  date: option.date,
                  containerRef: option.containerRef.trim() || null,
                  note: null,
                })),
                kamName
              )
              setOptions([{ date: "", containerRef: "" }])
            }}
          >
            <CalendarPlusIcon className="size-4" />
            Send {valid.length > 0 ? `${valid.length} ` : ""}dates to {contract.buyerName}
          </Button>
        </div>
      </div>
    </Section>
  )
}

function AmendmentsPanel({ contract }: { contract: Contract }) {
  return (
    <Section title="Open change requests">
      <ul className="flex flex-col gap-2">
        {contract.amendments
          .filter((amendment) => !amendment.resolved)
          .map((amendment) => (
            <li key={amendment.id} className="flex items-start gap-2 rounded-[14px] bg-status-warning/10 p-3">
              <div className="min-w-0 flex-1 text-[13px]">
                <span className="font-semibold">{amendment.raisedByName}</span>
                <p className="mt-0.5">{amendment.text}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => resolveAmendment(contract.id, amendment.id)}>
                Mark handled
              </Button>
            </li>
          ))}
      </ul>
    </Section>
  )
}

function StagePanel({ contract, kamName }: { contract: Contract; kamName: string }) {
  return (
    <Section title="Move this contract">
      <div className="flex flex-wrap gap-1.5">
        {CONTRACT_STAGE_ORDER.map((stage) => (
          <Button
            key={stage}
            size="sm"
            variant={stage === contract.stage ? "default" : "outline"}
            onClick={() => setStage(contract.id, stage, kamName)}
          >
            {CONTRACT_STAGE_LABELS[stage]}
          </Button>
        ))}
      </div>
    </Section>
  )
}

export { ContractAuthoring }
