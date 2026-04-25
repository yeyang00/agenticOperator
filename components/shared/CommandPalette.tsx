"use client";
import React from "react";
import clsx from "clsx";
import { Ic } from "./Ic";
import { useApp } from "@/lib/i18n";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useApp();
  const [q, setQ] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!open) return null;

  const sections = [
    {
      title: t("cmd_actions"),
      items: [
        { icon: <Ic.bolt />, label: t("cmd_run_now"), meta: "Sourcer-01" },
        { icon: <Ic.pause />, label: t("cmd_pause"), meta: "Screener-03" },
        { icon: <Ic.plus />, label: t("cmd_deploy"), meta: "" },
        { icon: <Ic.clock />, label: t("cmd_rollback"), meta: "v2.3.1 → v2.3.0" },
      ],
    },
    {
      title: t("cmd_nav"),
      items: [
        { icon: <Ic.play />, label: t("cmd_open_runs"), meta: "G → R" },
        { icon: <Ic.book />, label: t("cmd_open_audit"), meta: "G → A" },
      ],
    },
    {
      title: t("cmd_agents"),
      items: [
        { icon: <Ic.cpu />, label: "Sourcer-01 · " + t("role_sourcer"), meta: "v2.3.1" },
        { icon: <Ic.cpu />, label: "Screener-03 · " + t("role_screener"), meta: "v1.9.4" },
        { icon: <Ic.cpu />, label: "Interviewer-AI · " + t("role_interviewer"), meta: "v0.7.2" },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-start justify-center pt-[72px]"
      style={{ background: "rgba(15,23,42,0.20)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[min(560px,90%)] bg-surface border border-line rounded-lg shadow-sh-3 overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-line">
          <Ic.search />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("cmd_placeholder")}
            className="flex-1 border-0 outline-0 bg-transparent text-[14px] text-ink-1 placeholder:text-ink-4"
          />
          <kbd className="mono text-[10px] bg-panel border border-line rounded-sm px-1.5 py-[1px] text-ink-3">esc</kbd>
        </div>
        <div className="max-h-[340px] overflow-auto p-1.5">
          {sections.map((s, si) => (
            <div key={si}>
              <div className="text-[10.5px] tracking-[0.06em] uppercase text-ink-4 px-2.5 pt-2.5 pb-1.5">
                {s.title}
              </div>
              {s.items.map((it, i) => (
                <div
                  key={i}
                  className={clsx(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-[13px]",
                    si === 0 && i === 0
                      ? "bg-accent-bg text-[color:var(--c-accent)]"
                      : "hover:bg-accent-bg hover:text-[color:var(--c-accent)]"
                  )}
                >
                  <span className="w-[22px] h-[22px] grid place-items-center rounded-sm bg-panel border border-line text-ink-2">
                    {it.icon}
                  </span>
                  <span>{it.label}</span>
                  {it.meta && <span className="ml-auto mono text-[10.5px] text-ink-4">{it.meta}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 px-3.5 py-2 border-t border-line bg-panel text-[11px] text-ink-3">
          <span>
            <kbd className="mono text-[10px] bg-surface border border-line rounded-sm px-1.5 py-[1px] text-ink-3">↑↓</kbd> {t("cmd_jump")}
          </span>
          <span>
            <kbd className="mono text-[10px] bg-surface border border-line rounded-sm px-1.5 py-[1px] text-ink-3">↵</kbd> {t("cmd_actions")}
          </span>
          <span className="ml-auto">{t("brand")}</span>
        </div>
      </div>
    </div>
  );
}
