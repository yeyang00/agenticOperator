"use client";
/**
 * /rule-check Dashboard — Prove-centric KPI + activity view.
 *
 * Built top-down: this is UI-2. Wires from `MOCK_RUNS` until Phase UI-5
 * swaps in real data from `lib/rule-check/`.
 */
import React from "react";
import Link from "next/link";
import { Btn, Card, CardHead, Metric, StatusDot, Spark } from "@/components/shared/atoms";
import { useApp } from "@/lib/i18n";
import { MOCK_RUNS } from "./mock";
import { DecisionBadge } from "./atoms/DecisionBadge";
import { ValidationLight } from "./atoms/ValidationLight";

export function RuleCheckDashboardContent() {
  const { t } = useApp();
  const runs = MOCK_RUNS;

  // Aggregate KPIs from MOCK_RUNS.
  const total = runs.length;
  const passed = runs.filter((r) => r.finalDecision.decision === "passed").length;
  const blocked = runs.filter((r) => r.finalDecision.decision === "blocked").length;
  const pending = runs.filter((r) => r.finalDecision.decision === "pending_human").length;
  const avgConf =
    runs.reduce((a, r) => a + (r.llmParsed?.confidence ?? 0), 0) / Math.max(1, runs.length);
  const avgLat =
    runs.reduce((a, r) => a + r.llmRaw.latencyMs, 0) / Math.max(1, runs.length);

  // Top rules by activity (mock: derive from MOCK_RUNS groups).
  const ruleStats = aggregateByRule(runs);

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Sub-header */}
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-1">{t("rc_dashboard")}</h1>
          <p className="mt-1 text-xs text-ink-3">{t("rc_dashboard_sub")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost">
            <span>{t("rc_export")}</span>
          </Btn>
          <Link
            href="/rule-check/audit"
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-[12px] text-ink-1 hover:bg-panel"
          >
            {t("rc_open_audit")}
          </Link>
        </div>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label={t("rc_m_total")} value={String(total)} spark />
        <KpiCard label={t("rc_m_pass_rate")} value={pct(passed, total)} spark variant="ok" />
        <KpiCard label={t("rc_m_block_rate")} value={pct(blocked, total)} spark variant="err" />
        <KpiCard label={t("rc_m_hitl_rate")} value={pct(pending, total)} spark variant="warn" />
        <KpiCard label={t("rc_m_avg_confidence")} value={(avgConf * 100).toFixed(0) + "%"} spark />
        <KpiCard label={t("rc_m_avg_latency")} value={avgLat.toFixed(0) + "ms"} spark />
      </div>

      {/* Body grid: 1fr 360px */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          {/* Top rules */}
          <Card>
            <CardHead><span className="text-[12.5px] font-medium text-ink-1">{t("rc_top_rules")}</span></CardHead>
            <div className="p-3">
              <table className="tbl w-full text-[12px]">
                <thead>
                  <tr>
                    <th>{t("rc_rule")}</th>
                    <th>runs</th>
                    <th>{t("rc_passed")}</th>
                    <th>{t("rc_blocked")}</th>
                    <th>{t("rc_pending_human")}</th>
                    <th>{t("rc_m_avg_confidence")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ruleStats.map((rs) => (
                    <tr key={rs.ruleId}>
                      <td className="font-mono">
                        <Link
                          href={`/rule-check/runs?ruleId=${encodeURIComponent(rs.ruleId)}`}
                          className="text-accent hover:underline"
                        >
                          {rs.ruleId}
                        </Link>
                      </td>
                      <td>{rs.total}</td>
                      <td>{rs.passed}</td>
                      <td>{rs.blocked}</td>
                      <td>{rs.pending}</td>
                      <td>{(rs.avgConf * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* LLM reliability */}
          <Card>
            <CardHead><span className="text-[12.5px] font-medium text-ink-1">{t("rc_llm_reliability")}</span></CardHead>
            <div className="grid grid-cols-3 gap-3 p-3">
              <Metric
                label={t("rc_v_schema")}
                value={pct(runs.filter((r) => r.validation.schemaValid).length, runs.length)}
              />
              <Metric
                label={t("rc_v_evidence_grounded")}
                value={pct(runs.filter((r) => r.validation.evidenceGrounded).length, runs.length)}
              />
              <Metric label={t("rc_m_avg_confidence")} value={(avgConf * 100).toFixed(0) + "%"} />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {/* Recent activity */}
          <Card>
            <CardHead><span className="text-[12.5px] font-medium text-ink-1">{t("rc_recent_activity")}</span></CardHead>
            <div className="flex flex-col divide-y divide-line">
              {runs.map((r) => (
                <Link
                  key={r.runId}
                  href={`/rule-check/runs/${r.runId}`}
                  className="flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-panel"
                >
                  <DecisionBadge value={r.finalDecision.decision} size="sm" />
                  <span className="font-mono text-ink-2">{r.input.ruleId}</span>
                  <span className="text-ink-3">·</span>
                  <span className="text-ink-2">{r.input.candidateId}</span>
                  <span className="ml-auto">
                    <ValidationLight report={r.validation} variant="mini" />
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHead><span className="text-[12.5px] font-medium text-ink-1">{t("rc_alerts")}</span></CardHead>
            <div className="p-3 text-[12px] text-ink-3">
              <div className="flex items-center gap-2 py-1">
                <StatusDot kind="warn" />
                <span>{pending} run(s) awaiting human review &gt; 24h</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  spark,
  variant,
}: {
  label: string;
  value: string;
  spark?: boolean;
  variant?: "ok" | "warn" | "err";
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3 shadow-sh-1">
      <div className="text-[10.5px] uppercase tracking-wide text-ink-3">{label}</div>
      <div
        className="mt-1 text-xl font-semibold"
        style={{
          color:
            variant === "ok"
              ? "var(--c-ok)"
              : variant === "err"
                ? "var(--c-err)"
                : variant === "warn"
                  ? "var(--c-warn)"
                  : "var(--c-ink-1)",
        }}
      >
        {value}
      </div>
      {spark && (
        <div className="mt-1">
          <Spark />
        </div>
      )}
    </div>
  );
}

interface RuleStat {
  ruleId: string;
  total: number;
  passed: number;
  blocked: number;
  pending: number;
  avgConf: number;
}

function aggregateByRule(runs: typeof MOCK_RUNS): RuleStat[] {
  const map = new Map<string, RuleStat>();
  for (const r of runs) {
    const id = r.input.ruleId;
    let s = map.get(id);
    if (!s) {
      s = { ruleId: id, total: 0, passed: 0, blocked: 0, pending: 0, avgConf: 0 };
      map.set(id, s);
    }
    s.total++;
    if (r.finalDecision.decision === "passed") s.passed++;
    if (r.finalDecision.decision === "blocked") s.blocked++;
    if (r.finalDecision.decision === "pending_human") s.pending++;
    s.avgConf += r.llmParsed?.confidence ?? 0;
  }
  return Array.from(map.values()).map((s) => ({
    ...s,
    avgConf: s.avgConf / Math.max(1, s.total),
  }));
}

function pct(num: number, denom: number): string {
  if (denom === 0) return "—";
  return Math.round((num / denom) * 100) + "%";
}
