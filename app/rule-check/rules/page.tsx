"use client";
import React from "react";
import { Shell } from "@/components/shared/Shell";
import { RuleLibraryContent } from "@/components/rule-check/RuleLibraryContent";
import { useApp } from "@/lib/i18n";

export default function RuleLibraryPage() {
  const { t } = useApp();
  return (
    <Shell
      crumbs={[t("nav_group_trust"), t("nav_rule_check"), t("rc_rules")]}
      directionTag={t("rc_rules")}
    >
      <RuleLibraryContent />
    </Shell>
  );
}
