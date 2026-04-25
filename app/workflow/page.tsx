"use client";
import React from "react";
import { Shell } from "@/components/shared/Shell";
import { WorkflowContent } from "@/components/workflow/WorkflowContent";
import { useApp } from "@/lib/i18n";

export default function WorkflowPage() {
  const { t } = useApp();
  return (
    <Shell crumbs={[t("nav_group_build"), t("nav_workflows"), t("wf_title")]} directionTag={t("dirB") + " · 工作流画布"}>
      <WorkflowContent />
    </Shell>
  );
}
