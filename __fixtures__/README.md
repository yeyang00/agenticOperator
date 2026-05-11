# Codegen fixtures

Hand-curated reference data for the Action Object codegen verifier
(`scripts/verify-snapshots.ts`). Each fixture pairs an input JSON
(matching the shape returned by `GET /api/v1/ontology/actions/{ref}/rules`)
with the byte-exact emit output the codegen should produce for that input.

## Layout

```
__fixtures__/
└── actions/
    ├── matchResume.input.json       happy path; all 11 sections render
    ├── matchResume.expected.ts
    ├── manualEntry.input.json       sparse: no submissionCriteria, no rules,
    ├── manualEntry.expected.ts      empty notifications, actor=["Human"]
    ├── createJD.input.json          acronym in name; tests toKebab
    ├── createJD.expected.ts
    ├── jdReview.input.json          minimal data; ensures actor-neutral rendering
    └── jdReview.expected.ts
```

## Running

```bash
# Verify all fixtures match expected output
npm run verify:ontology

# Refresh expected outputs after an intentional renderer change
npm run verify:ontology -- --update
```

## Determinism notes

- `meta.compiledAt` is forced to `1970-01-01T00:00:00.000Z` during fixture
  emission so timestamps don't churn the diff. Real CLI runs produce the
  current ISO timestamp.
- `meta.domain` is forced to `RAAS-v1`.
- The fixture verifier uses `parseAction(json)` instead of `fetchAction` —
  no network, no env, hermetic.

## Refresh workflow (spec §11.3)

1. Run `npm run verify:ontology` and observe diffs.
2. Inspect every diff line. Reject if any unrelated section changed
   (whitespace drift, accidental key reorder, etc.) — those would indicate
   a bug elsewhere.
3. If diffs are intentional, run `npm run verify:ontology -- --update`.
4. Commit the input/expected pair update in the same PR as the renderer
   change so the reviewer sees both sides.
