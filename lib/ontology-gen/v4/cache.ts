/**
 * In-process cache for V4-1 (Runtime LLM strategy).
 *
 * Key = hash(actionRef, domain, client, ruleVersions). When upstream rule
 * versions change, the key naturally invalidates.
 */

import { createHash } from "node:crypto";

import type { ActionObjectV4 } from "./types";

const cache = new Map<string, ActionObjectV4>();

export function makeCacheKey(parts: {
  actionRef: string;
  domain: string;
  client?: string;
  ruleVersions: Record<string, string>;
}): string {
  const sortedRules = Object.entries(parts.ruleVersions).sort(([a], [b]) => a.localeCompare(b));
  const payload = JSON.stringify([parts.actionRef, parts.domain, parts.client ?? "", sortedRules]);
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

export function cacheGet(key: string): ActionObjectV4 | undefined {
  return cache.get(key);
}

export function cacheSet(key: string, value: ActionObjectV4): void {
  cache.set(key, value);
}

export function cacheClear(): void {
  cache.clear();
}

export function cacheStats(): { size: number; keys: string[] } {
  return { size: cache.size, keys: [...cache.keys()] };
}
