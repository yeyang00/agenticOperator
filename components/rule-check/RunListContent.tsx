"use client";
/**
 * /rule-check/runs — triage view. Table of all runs with filters + decision
 * badges + 4-light validation indicators + click-through to detail.
 *
 * UI-3. Mocks for now; UI-5 wires to `lib/rule-check/` filesystem store.
 */
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Btn, Card, CardHead } from "@/components/shared/atoms";
import { useApp } from "@/lib/i18n";
import { MOCK_RUNS } from "./mock";
import { DecisionBadge } from "./atoms/DecisionBadge";
import { ValidationLight } from "./atoms/ValidationLight";
import type { RuleDecision } from "@/lib/rule-check";

type DecisionFilter = "all" | RuleDecision;

export function RunListContent() {
  const { t } = useApp();
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("all");
  const [ruleFilter, setRuleFilter] = useState("");
  const [candidateFilter, setCandidateFilter] = useState("");

  const filtered = useMemo(() => {
    return MOCK_RUNS.filter((r) => {
      if (decisionFilter !== "all" && r.finalDecision.decision !== decisionFilter) return false;
      if (ruleFilter && !r.input.ruleId.toLowerCase().includes(ruleFilter.toLowerCase())) return false;
      if (
        candidateFilter &&
        !r.input.candidateId.toLowerCase().includes(candidateFilter.toLowerCase())
      )
        return false;
      return true;
    });
  }, [decisionFilter, ruleFilter, candidateFilter]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-1">{t("rc_runs")}</h1>
          <p className="mt-1 text-xs text-ink-3">
            {filtered.length} / {MOCK_RUNS.length} runs
          </p>
        </div>
        <Btn variant="ghost">{t("rc_export")}</Btn>
      </header>

      {/* Filter bar */}
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface p-3 shadow-sh-1">
        <label className="flex items-center gap-1 text-[11px] text-ink-3">
          <span>{t("rc_filter_status")}:</span>
          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value as DecisionFilter)}
            className="rounded border border-line bg-bg px-2 py-1 text-[12px] text-ink-1"
          >
            <option value="all">all</option>
            <option value="passed">{t("rc_passed")}</option>
            <option value="blocked">{t("rc_blocked")}</option>
            <option value="pending_human">{t("rc_pending_human")}</option>
            <option value="not_started">{t("rc_not_started")}</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-[11px] text-ink-3">
          <span>{t("rc_filter_rule")}:</span>
          <input
            value={ruleFilter}
            onChange={(e) => setRuleFilter(e.target.value)}
            placeholder="10-7"
            className="rounded border border-line bg-bg px-2 py-1 text-[12px] text-ink-1 font-mono"
            style={{ width: 80 }}
          />
        </label>
        <label className="flex items-center gap-1 text-[11px] text-ink-3">
          <span>{t("rc_candidate")}:</span>
          <input
            value={candidateFilter}
            onChange={(e) => setCandidateFilter(e.target.value)}
            placeholder="C-MVP-001"
            className="rounded border border-line bg-bg px-2 py-1 text-[12px] text-ink-1 font-mono"
            style={{ width: 120 }}
          />
        </label>
        <span className="ml-auto text-[11px] text-ink-3">{t("rc_saved_views")}</span>
      </div>

      <Card>
        <CardHead>
          <span className="text-[12.5px] font-medium text-ink-1">{filtered.length} runs</span>
        </CardHead>
        <div className="overflow-x-auto">
          <table className="tbl w-full text-[12px]">
            <thead>
              <tr>
                <th>time</th>
                <th>{t("rc_run_id")}</th>
                <th>{t("rc_passed")}/{t("rc_blocked")}</th>
                <th>{t("rc_rule")}</th>
                <th>{t("rc_candidate")}</th>
                <th>{t("rc_confidence")}</th>
                <th>{t("rc_validation")}</th>
                <th>{t("rc_latency")}</th>
                <th>{t("rc_model")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-ink-3">
                    {t("rc_no_runs")}
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.runId} className="hover:bg-panel">
                  <td className="font-mono text-ink-3">{r.timestamp.slice(11, 19)}</td>
                  <td>
                    <Link
                      href={`/rule-check/runs/${r.runId}`}
                      className="font-mono text-accent hover:underline"
                    >
                      {r.runId.slice(0, 8)}
                    </Link>
                  </td>
                  <td>
                    <DecisionBadge
                      value={r.finalDecision.decision}
                      size="sm"
                      overridden={!!r.finalDecision.overrideReason}
                    />
                  </td>
                  <td className="font-mono">{r.input.ruleId}</td>
                  <td className="font-mono text-ink-2">{r.input.candidateId}</td>
                  <td>
                    {r.llmParsed ? (
                      <ConfBar value={r.llmParsed.confidence} />
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </td>
                  <td>
                    <ValidationLight report={r.validation} variant="mini" />
                  </td>
                  <td className="text-ink-3">{r.llmRaw.latencyMs}ms</td>
                  <td className="font-mono text-ink-3">{r.llmRaw.model}</td>
                  <td>
                    <Link
                      href={`/rule-check/runs/${r.runId}`}
                      className="text-accent text-[11px] hover:underline"
                    >
                      {t("rc_open_run")} →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ConfBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.8 ? "var(--c-ok)" : value >= 0.5 ? "var(--c-warn)" : "var(--c-err)";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 rounded-full bg-panel">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="font-mono text-[10.5px] text-ink-3">{pct}%</span>
    </div>
  );
}
