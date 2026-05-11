/**
 * enrichAction — fetch all relevant DataObject + Event schemas alongside the Action.
 *
 * For each rule's `relatedEntities` (referenced DataObjects) and the action's
 * `targetObjects`/`triggeredEvents`/`trigger`, we concurrently fetch the live
 * schema. The result is an `EnrichedAction` containing the action plus
 * fully-typed schemas the LLM can use to generate field-aware instructions
 * without inventing field names.
 */

import { getJson } from "../client";
import { OntologyContractError } from "../errors";
import type { Action } from "../types.public";

import type {
  DataObjectProperty,
  DataObjectSchema,
  EnrichedAction,
  EventDataField,
  EventSchema,
  EventStateMutation,
} from "./types";

interface EnrichOptions {
  apiBase?: string;
  apiToken?: string;
  timeoutMs?: number;
}

export async function enrichAction(action: Action, opts?: EnrichOptions): Promise<EnrichedAction> {
  const apiBase = opts?.apiBase ?? process.env["ONTOLOGY_API_BASE"] ?? "";
  const apiToken = opts?.apiToken ?? process.env["ONTOLOGY_API_TOKEN"] ?? "";
  if (!apiBase || !apiToken) {
    throw new Error("enrichAction requires ONTOLOGY_API_BASE and ONTOLOGY_API_TOKEN");
  }

  // ── collect referenced DataObject ids ──
  const dataObjIds = new Set<string>();
  for (const t of action.targetObjects ?? []) dataObjIds.add(t);
  for (const inp of action.inputs ?? []) {
    const src = inp.sourceObject;
    if (src) dataObjIds.add(stripFieldFromSourceObject(src));
  }
  for (const out of action.outputs ?? []) {
    // outputs occasionally have sourceObject too; otherwise nothing to add
    const src = (out as { sourceObject?: string }).sourceObject;
    if (src) dataObjIds.add(stripFieldFromSourceObject(src));
  }
  for (const step of action.actionSteps ?? []) {
    for (const inp of step.inputs ?? []) {
      const src = inp.sourceObject;
      if (src) dataObjIds.add(stripFieldFromSourceObject(src));
    }
    // rules have relatedEntities only at upstream; not on our typed Action.
    // Side-effect dataChanges referencing object types
  }
  for (const dc of action.sideEffects?.dataChanges ?? []) {
    if (dc.objectType) dataObjIds.add(dc.objectType);
  }

  // ── collect Event ids ──
  const eventIds = new Set<string>();
  for (const t of action.trigger ?? []) eventIds.add(t);
  for (const e of action.triggeredEvents ?? []) eventIds.add(e);
  for (const n of action.sideEffects?.notifications ?? []) {
    if (n.triggeredEvent) eventIds.add(n.triggeredEvent);
  }

  // ── parallel fetch ──
  const fetchOpts = { apiBase, apiToken, timeoutMs: opts?.timeoutMs };
  const dataObjectSchemas: Record<string, DataObjectSchema> = {};
  const eventSchemas: Record<string, EventSchema> = {};

  const dataObjPromises = [...dataObjIds].map(async (id) => {
    try {
      const raw = (await getJson({
        ...fetchOpts,
        path: `/api/v1/ontology/objects/${encodeURIComponent(id)}?domain=${encodeURIComponent(action.id ? "RAAS-v1" : "RAAS-v1")}`,
      })) as Record<string, unknown>;
      const parsed = parseDataObjectResponse(id, raw);
      if (parsed) dataObjectSchemas[id] = parsed;
    } catch {
      /* swallow — best-effort enrichment, missing object → not in schemas */
    }
  });

  const eventPromises = [...eventIds].map(async (id) => {
    try {
      const raw = (await getJson({
        ...fetchOpts,
        path: `/api/v1/ontology/events/${encodeURIComponent(id)}?domain=RAAS-v1`,
      })) as Record<string, unknown>;
      const parsed = parseEventResponse(id, raw);
      if (parsed) eventSchemas[id] = parsed;
    } catch {
      /* swallow */
    }
  });

  await Promise.all([...dataObjPromises, ...eventPromises]);

  return { action, dataObjectSchemas, eventSchemas };
}

// helpers

function stripFieldFromSourceObject(src: string): string {
  // sourceObject may be "Resume.resume_id" or just "Resume"
  const idx = src.indexOf(".");
  return idx >= 0 ? src.slice(0, idx) : src;
}

function parseDataObjectResponse(id: string, raw: Record<string, unknown>): DataObjectSchema | null {
  if (!raw || typeof raw !== "object") return null;
  const propsRaw = raw["properties"];
  let properties: DataObjectProperty[] = [];
  if (typeof propsRaw === "string") {
    try {
      const parsed = JSON.parse(propsRaw);
      if (Array.isArray(parsed)) properties = parsed.filter(isDataObjectProperty);
    } catch {
      throw new OntologyContractError(
        `DataObject ${id}: properties is a string but not valid JSON`,
        { id },
      );
    }
  } else if (Array.isArray(propsRaw)) {
    properties = propsRaw.filter(isDataObjectProperty);
  }

  return {
    id,
    name: typeof raw["name"] === "string" ? (raw["name"] as string) : id,
    description: typeof raw["description"] === "string" ? (raw["description"] as string) : "",
    primaryKey: typeof raw["primary_key"] === "string" ? (raw["primary_key"] as string) : "",
    properties,
  };
}

function isDataObjectProperty(v: unknown): v is DataObjectProperty {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { name?: unknown }).name === "string" &&
    typeof (v as { type?: unknown }).type === "string"
  );
}

function parseEventResponse(id: string, raw: Record<string, unknown>): EventSchema | null {
  if (!raw || typeof raw !== "object") return null;
  const payloadRaw = raw["payload"];
  let eventData: EventDataField[] = [];
  let stateMutations: EventStateMutation[] = [];
  let sourceAction: string | undefined;

  let payload: Record<string, unknown> | null = null;
  if (typeof payloadRaw === "string") {
    try {
      payload = JSON.parse(payloadRaw) as Record<string, unknown>;
    } catch {
      payload = null;
    }
  } else if (typeof payloadRaw === "object" && payloadRaw !== null) {
    payload = payloadRaw as Record<string, unknown>;
  }

  if (payload) {
    if (typeof payload["source_action"] === "string") {
      sourceAction = payload["source_action"] as string;
    }
    const ed = payload["event_data"];
    if (Array.isArray(ed)) {
      eventData = ed.filter(isEventDataField).map((f) => ({
        name: f.name,
        type: f.type,
        targetObject: f.target_object ?? f.targetObject,
      }));
    }
    const sm = payload["state_mutations"];
    if (Array.isArray(sm)) {
      stateMutations = sm.filter(isEventStateMutation).map((m) => {
        const props = m.impacted_properties ?? m.impactedProperties;
        return {
          targetObject: m.target_object ?? m.targetObject ?? "",
          mutationType: m.mutation_type ?? m.mutationType ?? "",
          impactedProperties: Array.isArray(props) ? props : [],
        };
      });
    }
  }

  return {
    id,
    name: typeof raw["name"] === "string" ? (raw["name"] as string) : id,
    description: typeof raw["description"] === "string" ? (raw["description"] as string) : "",
    sourceAction,
    eventData,
    stateMutations,
  };
}

function isEventDataField(v: unknown): v is { name: string; type: string; target_object?: string; targetObject?: string } {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { name?: unknown }).name === "string" &&
    typeof (v as { type?: unknown }).type === "string"
  );
}

function isEventStateMutation(v: unknown): v is {
  target_object?: string;
  targetObject?: string;
  mutation_type?: string;
  mutationType?: string;
  impacted_properties?: string[];
  impactedProperties?: string[];
} {
  return typeof v === "object" && v !== null;
}
