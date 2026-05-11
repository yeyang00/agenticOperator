#!/usr/bin/env node
/**
 * CI / pre-merge drift checker for v4 templates.
 *
 * The v4 public ActionObject meta no longer exposes per-rule version
 * fingerprints, so this checker currently has no committed version map to
 * compare against. It exits cleanly and records that drift detection is
 * unavailable until a replacement metadata surface is introduced.
 */

process.stderr.write("\n=== Drift report ===\n");
process.stderr.write("Status: unavailable\n");
process.stderr.write("Reason: v4 ActionObject meta no longer includes committed per-rule version fingerprints.\n");
process.stderr.write("\nNo drift check performed.\n");
