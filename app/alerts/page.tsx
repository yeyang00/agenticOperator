"use client";
import React from "react";
import { Shell } from "@/components/shared/Shell";
import { AlertsContent } from "@/components/alerts/AlertsContent";
import { useApp } from "@/lib/i18n";

export default function AlertsPage() {
  const { t } = useApp();
  return (
    <Shell crumbs={[t("nav_group_operate"), t("nav_alerts"), "AL-1042"]} directionTag={t("al_title") + " · Alerts"}>
      <AlertsContent />
    </Shell>
  );
}
