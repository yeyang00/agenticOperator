"use client";
/**
 * /rule-check — Runs aggregate page (PRIMARY landing per SPEC §9.2 v2).
 *
 * 3-region layout:
 *   Top:         Header (title + scope + actions: Matrix link, Run new batch)
 *                + Dashboard strip (KPIs + 7-day spark)
 *   Bottom:      List (left, 360px) + Preview (right, flex-1)
 *                Equal-height; each column scrolls independently.
 *
 * Single-click row → preview updates (no navigation). Preview's
 * [Open full detail →] navigates to /rule-check/runs/<runId>.
 */

import Link from "next/link";
import { useState } from "react";
import { RunsDashboard } from "./atoms/RunsDashboard";
import { RunsList } from "./atoms/RunsList";
import { RunsPreview } from "./atoms/RunsPreview";
import { useApp } from "@/lib/i18n";
import type { AggregateRow, AggregateMetrics } from "@/app/rule-check/actions";

export interface AggregateContentProps {
  rows: AggregateRow[];
  aggregate: AggregateMetrics;
  scopeLabel: string;
}

export function AggregateContent({
  rows,
  aggregate,
  scopeLabel,
}: AggregateContentProps) {
  const { t } = useApp();
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(
    rows[0]?.runId,
  );

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 p-6">
      <header className="flex items-end justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-ink-1">
            {t("rc_aggregate_title")}
          </h1>
          <p className="mt-1 text-[12px] text-ink-3">{scopeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/rule-check/matrix"
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-[12px] text-ink-1 hover:bg-panel"
          >
            {t("rc_matrix_link")} →
          </Link>
          <Link
            href="/dev/rule-check"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-accent bg-accent px-3 py-1.5 text-[12px] text-white hover:opacity-90"
          >
            ↻ {t("rc_run_new_batch")}
          </Link>
        </div>
      </header>

      <div className="flex-shrink-0">
        <RunsDashboard aggregate={aggregate} />
      </div>

      <div
        className="grid gap-4 flex-1 min-h-0"
        style={{ gridTemplateColumns: "minmax(360px, 1fr) minmax(0, 1.5fr)" }}
      >
        <div className="min-w-0 min-h-0 overflow-y-auto">
          <RunsList
            rows={rows}
            selectedRunId={selectedRunId}
            onSelect={setSelectedRunId}
          />
        </div>
        <div className="min-w-0 min-h-0 overflow-y-auto">
          <RunsPreview runId={selectedRunId} />
        </div>
      </div>
    </div>
  );
}
