"use client";
import React from "react";
import { Shell } from "@/components/shared/Shell";
import { RunDetailContent } from "@/components/rule-check/RunDetailContent";
import { useApp } from "@/lib/i18n";

export default function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { t } = useApp();
  const { runId } = React.use(params);
  return (
    <Shell
      crumbs={[
        t("nav_group_trust"),
        t("nav_rule_check"),
        t("rc_runs"),
        runId.slice(0, 8),
      ]}
      directionTag={t("rc_run_detail")}
    >
      <RunDetailContent runId={runId} />
    </Shell>
  );
}
