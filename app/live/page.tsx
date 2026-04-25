"use client";
import React from "react";
import { Shell } from "@/components/shared/Shell";
import { LiveContent } from "@/components/live/LiveContent";
import { useApp } from "@/lib/i18n";

export default function LivePage() {
  const { t } = useApp();
  return (
    <Shell crumbs={[t("nav_group_operate"), t("nav_runs"), "RUN-J2041"]} directionTag={t("dirC") + " · 实时运行剧场"}>
      <LiveContent />
    </Shell>
  );
}
