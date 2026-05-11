"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

interface FormValues {
  ref: string;
  domain: string;
  client: string;
  dept: string;
  strategy: "v3" | "v4-1" | "v4-2" | "v4-3" | "v4-4";
}

export function PreviewForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [values, setValues] = useState<FormValues>({
    ref: params.get("ref") ?? "",
    domain: params.get("domain") ?? "RAAS-v1",
    client: params.get("client") ?? "",
    dept: params.get("dept") ?? "",
    strategy: (params.get("strategy") as FormValues["strategy"]) || "v3",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (values.ref) next.set("ref", values.ref);
    if (values.domain) next.set("domain", values.domain);
    if (values.client) next.set("client", values.client);
    if (values.dept) next.set("dept", values.dept);
    if (values.strategy) next.set("strategy", values.strategy);
    startTransition(() => {
      router.push(`/dev/action-preview?${next.toString()}`);
    });
  }

  function field<K extends keyof FormValues>(key: K) {
    return {
      value: values[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setValues((v) => ({ ...v, [key]: e.target.value })),
    };
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4 shadow-sh-1"
    >
      <Field label="Action ref" required help="name or numeric id">
        <input
          {...field("ref")}
          required
          placeholder="matchResume"
          className="w-48 rounded border border-line bg-bg px-2 py-1 text-sm text-ink-1 focus:border-accent focus:outline-none"
        />
      </Field>
      <Field label="Domain" required>
        <input
          {...field("domain")}
          required
          placeholder="RAAS-v1"
          className="w-32 rounded border border-line bg-bg px-2 py-1 text-sm text-ink-1 focus:border-accent focus:outline-none"
        />
      </Field>
      <Field label="Client" help="optional rule scope">
        <input
          {...field("client")}
          placeholder="(any)"
          className="w-40 rounded border border-line bg-bg px-2 py-1 text-sm text-ink-1 focus:border-accent focus:outline-none"
        />
      </Field>
      <Field label="Client department" help="reserved (no-op until upstream)">
        <input
          {...field("dept")}
          placeholder="(any)"
          className="w-44 rounded border border-line bg-bg px-2 py-1 text-sm text-ink-1 focus:border-accent focus:outline-none"
        />
      </Field>
      <Field label="Strategy" help="v3 / v4-1 / v4-2 / v4-3 / v4-4">
        <select
          value={values.strategy}
          onChange={(e) => setValues((v) => ({ ...v, strategy: e.target.value as FormValues["strategy"] }))}
          className="w-36 rounded border border-line bg-bg px-2 py-1 text-sm text-ink-1 focus:border-accent focus:outline-none"
        >
          <option value="v3">v3 (legacy)</option>
          <option value="v4-1">v4-1 (runtime LLM, guarded)</option>
          <option value="v4-2">v4-2 (function tpl)</option>
          <option value="v4-3">v4-3 (static tpl)</option>
          <option value="v4-4">v4-4 (fill-in original)</option>
        </select>
      </Field>
      <button
        type="submit"
        disabled={isPending || !values.ref || !values.domain}
        className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-2 disabled:opacity-50"
      >
        {isPending ? "Resolving…" : "Resolve"}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-ink-3">
        {label}
        {required ? <span className="text-err">*</span> : null}
        {help ? <span className="ml-1 text-ink-4">— {help}</span> : null}
      </span>
      {children}
    </label>
  );
}
