"use client";
import React from "react";
import { Shell } from "@/components/shared/Shell";
import { DataSourcesContent } from "@/components/datasources/DataSourcesContent";
import { useApp } from "@/lib/i18n";

export default function DataSourcesPage() {
  const { t } = useApp();
  return (
    <Shell crumbs={[t("nav_group_build"), t("nav_integrations"), "全部连接器"]} directionTag="数据源 · Integrations">
      <DataSourcesContent />
    </Shell>
  );
}
