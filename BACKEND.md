# Connecting the demo to a real Paladin backend

This demo is **data-driven** and **replay-first**. The UI never executes anything;
it renders a *recording* — a step-by-step ledger story — and lets you scrub
through it. Going "live" means producing recordings from a real Paladin run.

```
                 ┌─────────────────────────────────────────────┐
   capture once  │  examples/bond  ──drive──►  Paladin nodes     │
   (Node script) │        │                    (JSON-RPC)        │
                 │        └── after each step: read state ───────┤
                 │                          │                    │
                 │                          ▼                    │
                 │                 recordings/bond.json          │
                 └─────────────────────────────────────────────┘
                                            │  (static file or GET endpoint)
   demo (no infra) ── DataSource.getRecording('bond') ──► render + scrub
```

Because the recording is immutable, **stepping back never re-executes anything** —
there is no `execute` API and no invalid-state risk.

---

## The pieces in this project

| File | Role |
|---|---|
| `recordings/*.json` | **Source of truth.** One self-describing recording per use case (the ledger story). |
| `recordings/index.json` | Manifest of available scenarios `[{id,name,tagline}]` (the tabs). |
| `datasource.js` | The **seam**. Loads recordings + exposes `getRecording` / `listScenarios` / `canSee`. |
| `app.jsx` | UI. Loads recordings *through* the DataSource (async) and redacts via `DS.canSee`. |
| `capture/capture-bond.template.mjs` | Template that drives the real flow and emits `recordings/bond.json`. |

### Loading recordings
The app loads `recordings/*.json` by default (they are the source of truth).
Override the folder with `paladin-demo.html?recordings=<baseUrl>`. The files are
fetched, so the project must be **served over HTTP** (e.g. `python3 -m http.server`),
not opened from a `file://` path.

---

## Recording schema

A recording is one JSON object (see `recordings/bond.json` for a full example):

```jsonc
{
  "id": "bond",
  "name": "Bond DvP",
  "tagline": "…",                 // shown next to the scenario tabs
  "concept": "…",                 // the "Why it matters" callout
  "columns":  ["issuer","custodian","investor","regulator","sepolia","base"],
  "viewers":  ["omniscient","issuer","custodian","investor","regulator","public"],
  "parties": {                    // self-contained: a new use case is just a new file
    "issuer":   { "name":"Bond Depository", "role":"Issuer", "kind":"inst" },
    "regulator":{ "name":"Regulator", "role":"Oversight", "kind":"authority" },
    "base":     { "name":"Paladin base ledger", "role":"Shared EVM", "kind":"public" }
    // …one entry per id used in columns. kind: inst | authority | public
  },
  "groupLabels": { "primary":"Institutions", "public":"Public ledgers" }, // optional
  "steps":  [ /* one per stage, in order */ {
      "title": "Execute the atomic swap (DvP)",
      "plain": "plain-language explanation",
      "tech":  "mono one-liner (RPC / SDK call)",
      "badges": ["priv","pub"],
      "motion": [                 // optional: animate a token between columns
        { "label": "USDC 100", "tone": "pub",  "from": "sepolia",   "to": "custodian" },
        { "label": "BOND 100", "tone": "priv", "from": "custodian", "to": "investor"  }
      ]
  }],
  "facts": [ /* ledger entries; each appears in one column over a step range */ {
      "col":   "custodian",       // which column it lives in
      "kind":  "priv",            // "pub" = on the shared/public ledger, "priv" = restricted
      "title": "BOND custody",
      "detail":"900 units",
      "from":  8,                 // first step index it's visible (0-based)
      "until": 9,                 // optional; hidden from this step onward (exclusive)
      "see":   ["issuer","custodian","regulator"],  // priv only: who can see it
      "locked": true              // optional; renders a lock + "snap" animation
  }]
}
```

- `columns` / `viewers` reference **party ids**; each id is described in the
  recording's own `parties` map — names, roles, and a `kind`:
  `inst` (participant) · `authority` (oversight actor; gets the shield + tint) ·
  `public` (public ledger; green). Columns auto-group into *primary* vs *public*
  by `kind`; the regulator/authority treatment is driven by `kind`, never a
  hard-coded id, so any use case can have an authority actor — or none.
  (If `parties` is omitted, an id renders with its raw id as its name.)
- The visible facts at step *s* in column *c* are those with
  `col === c && from <= s && (until == null || s < until)`.

---

## Visibility — Option A (now) vs Option B (later)

**Option A — declared (current).** Each private fact carries a `see: [...]` list.
`DataSource.canSee(fact, viewer)` returns true if the fact is public, the viewer
is `omniscient`, or the viewer is in `see`. The capture script writes these lists
— which is fine, because *you* create the privacy groups and know the membership.
`public` viewer sees only `kind:"pub"` facts (the genuine outsider view).

**Option B — real per-node visibility (clean seam already in place).** Instead of
declaring `see`, capture *what each identity's node actually returns* at each step,
and the redaction becomes node-enforced rather than asserted:

1. In the capture script, after each op, query **each viewer's node** and record
   per-viewer results, e.g. `fact.views = { investor:{seen:true,…}, issuer:{seen:false} }`.
2. In `datasource.js`, swap `canSee` for the `perNodeCanSee` stub already written
   there (reads `fact.views[viewer]`).

No UI changes — the redaction call site already routes through `DataSource.canSee`.

---

## Add a new use case (no code changes)

1. Write `recordings/<id>.json` following the schema above (its own `parties`,
   `columns`, `viewers`, `steps`, `facts`).
2. Add `{ "id": "<id>", "name": "…", "tagline": "…" }` to `recordings/index.json`.
3. Open with `?source=recording` — it appears as a new scenario tab.

The frontend is use-case agnostic: it renders whatever the recording declares
(any actors, any number of columns/viewers/steps, any column grouping). Nothing
in `app.jsx` knows about bonds, Zeto, or a regulator specifically.

---

## Where each fact's real data comes from

| Surface | Source | RPC / API |
|---|---|---|
| Pente group state (bond tracker, subscription, allow-list) | members' nodes only | `pgroup_*` |
| Noto balances / locks (BOND custody, lock, holding) | owning node, domain receipt | `pstate_*`, `ptx_getTransactionReceipt` |
| Base-ledger anchors (state roots, Noto contract, Atom, public tracker) | the shared base chain | any node / Besu JSON-RPC |
| Sepolia USDC (wallet, lock, transfer) | a **separate public chain** | Sepolia RPC via ethers/viem |
| Zeto amounts | encrypted; owner only (until viewing key) | Zeto domain APIs + selective disclosure |

The **"View as"** toggle maps cleanly onto these: *View as Bank A* ⇒ read Bank A's
node; *Public / outsider* ⇒ read only the base chain + Sepolia with no group access;
*Regulator* ⇒ a node added as an observer/member of the groups.

---

## Step-by-step to run it locally

1. **Stand up Paladin** locally (Getting Started → the operator stack; typically
   3 nodes — one per identity). Confirm health via the built-in UI.
2. **Run `examples/bond`** unmodified to validate the flow end-to-end.
3. **Capture:** copy `capture/capture-bond.template.mjs` next to the example,
   reuse the example's imports + node/identity setup, fill the `/*TODO*/` reads
   from real receipts/state, and run it → `recordings/bond.json`.
4. **Replay:** open `paladin-demo.html?source=recording`. Done — real values,
   real addresses, same UI.
5. *(Optional)* serve `recordings/` from a tiny read-only endpoint instead of a
   static file, and/or add `capture-zeto` the same way.

> Note: everything on screen today (amounts like 100,000 / 1,000 / 100, the
> `0x9f…3a` style ids, names) are **authored placeholders** in the recordings.
> They become real automatically once the recordings come from a capture run.
