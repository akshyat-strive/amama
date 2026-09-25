"use client"

import * as W from "@/features/tradechain/demo-world"
import { InfoTip } from "@/features/dashboard/info-tip"

const SCENARIO_SHORT: Record<W.ScenarioKey, string> = {
  A: "Ran as planned",
  B: "Late, but recoverable",
  C: "Quantity, quality or sailing lost",
  D: "A document blocked the gate",
  E: "Terms changed mid-flight",
}

function ScenarioInfo({ scenario }: { scenario?: W.ScenarioKey }) {
  return (
    <InfoTip
      title="Scenarios"
      rows={W.SCENARIOS.map((meta) => ({
        label: `${meta.key} · ${meta.label}`,
        value: (
          <span className={scenario === meta.key ? "font-semibold text-foreground" : "font-normal text-muted-foreground"}>
            {SCENARIO_SHORT[meta.key]}
          </span>
        ),
      }))}
    >
      Every stage ends one of five ways.
    </InfoTip>
  )
}

const CLOCK_INFO: Record<string, string> = {
  "Shelf life": "Starts at harvest and never pauses. Temperature excursions debit extra days.",
  "Cut-off": "Terminal gate-in, VGM and shipping-instruction deadlines. Miss one and the container rolls to the next sailing — about 7 days.",
  Payment: "The buyer's balance, usually due a fixed number of days after the bill of lading.",
  "Your payout": "Released at settlement against your QC-accepted quantity. Open KYC holds it.",
}

function ClockInfo({ label }: { label: string }) {
  return <InfoTip title={label}>{CLOCK_INFO[label]}</InfoTip>
}

function StageInfo({ stage }: { stage: W.Stage }) {
  return (
    <InfoTip
      title={stage.name}
      rows={[
        { label: "Input", value: stage.input },
        { label: "Output", value: stage.output },
        { label: "Trigger", value: stage.trigger },
        { label: "System", value: stage.systemAction },
        { label: "People", value: stage.humanAction },
      ]}
    />
  )
}

function DocumentsInfo() {
  return (
    <InfoTip title="Documents are gates">
      No document, no filing. No filing, no export order. No export order, no gate-in. No gate-in, no bill of lading. No bill
      of lading, no payment.
    </InfoTip>
  )
}

function SpineInfo() {
  return (
    <InfoTip title="Traceability">
      One transaction ID from contract to payout. Every lot, pallet, container and bill of lading carries it, so a claim at
      destination traces back to a farm block.
    </InfoTip>
  )
}

function QuantityInfo() {
  return (
    <InfoTip title="Quantities">
      Contracted, harvested, accepted, packed, shipped and delivered all differ. Every gap is a fact someone explains.
    </InfoTip>
  )
}

function ExcursionInfo() {
  return (
    <InfoTip title="Excursions">
      Time above the set point. Each one is logged with its cause, its cost in shelf-life days, and who signed it off.
    </InfoTip>
  )
}

export { ClockInfo, DocumentsInfo, ExcursionInfo, QuantityInfo, ScenarioInfo, SpineInfo, StageInfo }
