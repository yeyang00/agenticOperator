"use client";
/**
 * /rule-check/rules — rule library.
 *
 * Derived from MOCK_RUNS unique rule ids; in UI-5 will read from Ontology
 * (live rule definitions) joined with run stats.
 */
import React from "react";
import { Card, CardHead, Badge } from "@/components/shared/atoms";
import { useApp } from "@/lib/i18n";
import { MOCK_RUNS } from "./mock";

interface RuleEntry {
  id: string;
  name: string;
  sourceText: string;
  applicableScope: string;
  runs: number;
}

export function RuleLibraryContent() {
  const { t } = useApp();
  const entries: RuleEntry[] = aggregateRules();

  return (
    <div className="flex flex-col gap-4 p-6">
      <header>
        <h1 className="text-xl font-semibold text-ink-1">{t("rc_rules")}</h1>
        <p className="mt-1 text-xs text-ink-3">{entries.length} rules in scope</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {entries.map((r) => (
          <Card key={r.id}>
            <CardHead>
              <span className="font-mono text-[12px] text-ink-1">{r.id}</span>
              <Badge variant="info">{r.applicableScope}</Badge>
              <span className="ml-auto text-[11px] text-ink-3">{r.runs} runs</span>
            </CardHead>
            <div className="p-3 flex flex-col gap-2">
              <div className="text-[13px] font-medium text-ink-1">{r.name}</div>
              <div className="text-[12px] text-ink-2 leading-relaxed">{r.sourceText}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function aggregateRules(): RuleEntry[] {
  const map = new Map<string, RuleEntry>();
  for (const r of MOCK_RUNS) {
    const id = r.input.ruleId;
    const existing = map.get(id);
    if (existing) {
      existing.runs++;
      continue;
    }
    map.set(id, {
      id,
      name: r.fetched.rule.name,
      sourceText: r.fetched.rule.sourceText,
      applicableScope: r.fetched.rule.applicableScope,
      runs: 1,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
}
