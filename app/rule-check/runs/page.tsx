"use client";
import React from "react";
import { Shell } from "@/components/shared/Shell";
import { RunListContent } from "@/components/rule-check/RunListContent";
import { useApp } from "@/lib/i18n";

export default function RunListPage() {
  const { t } = useApp();
  return (
    <Shell
      crumbs={[t("nav_group_trust"), t("nav_rule_check"), t("rc_runs")]}
      directionTag={t("rc_runs")}
    >
      <RunListContent />
    </Shell>
  );
}
