"use client";
import React from "react";
import { Shell } from "@/components/shared/Shell";
import { RuleCheckDashboardContent } from "@/components/rule-check/RuleCheckDashboardContent";
import { useApp } from "@/lib/i18n";

export default function RuleCheckDashboardPage() {
  const { t } = useApp();
  return (
    <Shell
      crumbs={[t("nav_group_trust"), t("nav_rule_check")]}
      directionTag={t("rc_dashboard") + " · Prove"}
    >
      <RuleCheckDashboardContent />
    </Shell>
  );
}
