"use client";
import React from "react";
import { Shell } from "@/components/shared/Shell";
import { FleetContent } from "@/components/fleet/FleetContent";
import { useApp } from "@/lib/i18n";

export default function FleetPage() {
  const { t } = useApp();
  return (
    <Shell crumbs={[t("nav_group_operate"), t("nav_fleet")]} directionTag={t("dirA") + " · 舰队指挥"}>
      <FleetContent />
    </Shell>
  );
}
