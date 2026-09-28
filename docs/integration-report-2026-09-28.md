# Integration report — 28 September 2026

All four parts are merged into `main` and the system runs end to end. This records what was
merged, what was tested and passed, **what could not be tested here**, and what the measured
numbers mean for the claims on the deck.

---

## 1. What was merged

| PR | Author | What it lands |
| --- | --- | --- |
| #5 | Faizan Ahmad Ansari | Offline AC-2 provenance demo in the Gallery, for screenshots without a running backend |
| #6 | Farhan Quamar | The complete backend: API, BullMQ worker, WebSocket streaming, hash-chained audit, exports, Prisma schema and seed — plus the missing half of the shared contract (`api.ts`, `events.ts`, `spans.ts`) |

PR #6 closes two follow-ups from the 27 September review: `packages/shared` now exports the
API shapes, so `apps/web/src/shared-temp.ts` can be deleted and its imports pointed back at
`@ps154/shared`.

One integration commit was added on top (§4).

---

## 2. Test results

### Static checks

`npm run check` — typecheck, tests and production build across all four packages:

| Package | Tests |
| --- | --- |
| `@ps154/shared` | 5 passed |
| `@ps154/ai` | 25 passed |
| `@ps154/server` | 10 passed |
| `@ps154/web` | 20 passed |
| **Total** | **60 passed**, 9 of 9 turbo tasks successful |

### End-to-end, against the running system

PostgreSQL and Redis in Docker, schema pushed, append-only trigger installed, three users
seeded, API and worker running, web dev server proxying to the API.

| Check | Criterion | Result |
| --- | --- | --- |
| Ingest `samples/demo-incident.md` | FR-1, FR-5, FR-36 | 32 spans, canonical object stored |
| Batch of three formats returns `202` immediately | SRS §10.4 | three tasks `waiting` |
| All three reach `ready`, none errors | AC-1 | pass |
| WebSocket dropped mid-batch, resumed from last `seq` | AC-13 | no frame lost, none repeated |
| Snapshot agrees with the stream | — | `complete` both sides |
| Per-format tone override recorded in `effective_config` | AC-11 | on the LinkedIn post only |
| Operator submits, reviewer approves | AC-6 | both transitions persisted |
| Operator approves their own artefact | AC-10 | **403**, refused |
| Markdown export | FR-28 | valid document returned |
| Audit chain verifies | AC-14 | `valid: true`, 13 rows |
| Ordinary `UPDATE` on `audit_log` | NFR-11 | `ERROR: audit_log is append-only` |
| Superuser disables the trigger and edits row 3 | AC-14 | chain reports `valid: false`, `first_broken_seq: 3` |
| Row restored | AC-14 | chain valid again |
| Web app loads and proxies to the API | — | login through `:5173` returns a token |

The audit sequence is the strongest result here: the database refuses the edit, a superuser
can force it anyway, and the chain then names the exact row. That is tamper-evidence
demonstrated, not asserted.

---

## 3. What could NOT be tested on this machine

**No model ran during any of the above.** There is no `GROQ_API_KEY` in the local `.env`, and
Ollama is not installed here, so every run above used the offline stub.

This means these remain unverified by this report:

| Not tested | Why | Who can close it |
| --- | --- | --- |
| Real cloud generation quality and latency | no API key here | D — benchmarks in §5 cover this |
| Real on-device generation | Ollama not installed here | D |
| **AC-5** — restricted source making zero outbound calls | needs a real model to be meaningful; with the stub nothing calls out regardless, so the test proves nothing | B and D, on a machine with both providers |
| **AC-16** — the injected 37→42 fault caught and repaired | needs the verifier on real model output | D |
| **AC-9** — one format failing while others succeed | the stub cannot fail | B |
| **AC-3** — a source edit propagating consistently | needs real extraction | D |

AC-5 deserves emphasis: **it cannot be demonstrated with the stub**. A silent network monitor
beside a system that is not calling any model proves nothing at all. It has to be run with a
working key and a working Ollama, or the claim on the deck is not evidenced.

---

## 4. The integration fix, and why it mattered

`apps/server/src/engine.ts` falls back to a deterministic stub whenever no model is reachable.
As merged, that fallback reported:

- `provider: 'local'`, `model: 'deterministic-generator'`
- `grounding_score: 1.0`
- `verification: { passed: true, fixes: [], open_issues: [] }`
- a canonical object containing `Critical Infrastructure Unit`, `Threat Actor Group`,
  `Perimeter Telemetry Gateway` and the indicator `192.168.10.45` — none of which appear in
  any source document
- an advisory citing `https://nciipc.gov.in/advisories`, likewise invented

It also caught **every** exception from the real path, including `EgressBlocked`, and
continued into the stub.

The consequence: a demo run with a missing key, an expired key, a rate limit or a network
blip would have shown a judge fabricated entities and a fabricated indicator, on a card
reporting a perfect grounding score and a clean verification pass, labelled as the on-device
model. That is precisely the failure this product exists to detect, produced by the product
itself.

The fix keeps the fallback — it is genuinely useful for working without a key — but makes it
unable to lie:

- copies only source text; invents no entity, indicator, recommendation or reference
- `grounding_score: 0`, `verification.passed: false`, with an open issue naming the stub, so
  every card shows a flag
- `model: 'offline-stub (no model ran)'`, which reaches the card, the audit log and exports
- a banner on API and worker startup
- `EgressBlocked` is re-thrown, never swallowed, so a sovereignty failure always fails loudly

Verified after the change: the audit log records `model=offline-stub (no model ran)` and
`grounding=0` for every artefact.

Two further repo bugs were fixed in the same commit:

- `.env.example` configured `GEMINI_API_KEY` and `gemini-flash-latest` while the engine reads
  `GROQ_API_KEY` and defaults to `llama-3.3-70b-versatile`. A fresh clone could not reach a
  model, and would have silently landed on the stub.
- `apps/server/package.json` declared `dependencies` twice; JSON keeps the last, so the first
  block was silently discarded.

---

## 5. The measured numbers, and what they mean for the deck

D's benchmark, three runs per format:

| Model | Format | Extraction | Generation | Grounding | Revisions |
| --- | --- | --- | --- | --- | --- |
| Cloud | Advisory | 4.324 s | 23.905 s | 1.00 | 0/3 |
| Cloud | Executive | 29.165 s | 45.404 s | 1.00 | 1/3 |
| Cloud | LinkedIn | 30.724 s | 41.049 s | 1.00 | 0/3 |
| Local | Advisory | 195.160 s | 130.536 s | 1.00 | 0/3 |
| Local | Executive | 127.015 s | 87.084 s | 0.90 | 2/3 |
| Local | LinkedIn | 133.277 s | 93.843 s | 0.88 | 3/3 |

Cloud: 1 of 9 drafts needed a revision. Local: 5 of 9.

**What is good.** Cloud grounding is 1.00 across every format — every non-framing claim
resolved to a real span. The revision loop behaves as designed, and the local model's lower
grounding (0.88–0.90) with more revisions is exactly the honest story the deck already tells:
the on-device model is weaker, and the same verifier catches its mistakes.

**What the deck must not claim.** Slide 5 promises *five artefacts from a 3,000-word source in
under 60 seconds*, marked **target**. These numbers do not yet support it:

- Cloud generation alone runs 23.9–45.4 s per format.
- Cloud extraction runs 4.3–30.7 s, and extraction happens once per source.
- Even with formats generated concurrently, a worst case of roughly 30 s extraction plus
  45 s generation is about 75 s — over the target.
- On the local model a single format takes 3–5 minutes. A restricted demo run is several
  minutes long, which is a staging problem, not just a number.

Two things follow. First, **the word *target* has to stay on that claim** until an actual
three-format end-to-end run is timed — the total is not the sum of these columns, and nobody
has measured it yet. Second, **someone should time that run**, because it is the number slide
4 needs and it is one command once a key is in place.

The local-model timings also mean the AC-5 restricted demo cannot be performed live at
conversational pace. Either pre-record it, or use the smallest viable local model and say so.

---

## 6. What is left

| # | Item | Owner |
| --- | --- | --- |
| 1 | Set `GROQ_API_KEY` in `.env`, then run the three-format batch and time it. That number goes on slide 4 | D |
| 2 | Run AC-5 with a real key and Ollama, with a network monitor open. Capture it | B and D |
| 3 | Run AC-16 with `DEMO_PERTURB=1` and screenshot the `1 fix` badge | D |
| 4 | Delete `apps/web/src/shared-temp.ts`, import from `@ps154/shared`, reconcile any shape differences | C |
| 5 | Take the six screenshots — the UI runs, and the Gallery has an offline provenance demo that needs no backend | C |
| 6 | Deck still claims six generation parameters (code has four) and seven artefact types (code has five) | A |
| 7 | Deck slide 3 still names Gemini; the engine uses Groq | A |
| 8 | `main` is still unprotected | D |

Items 6 and 7 were raised on 27 September and are unchanged.

---

## 7. Summary

The product is integrated and works: a source goes in, spans and a fact index come out of it,
a batch fans out to three formats across a bounded worker pool, progress streams to the
browser over a WebSocket that survives a disconnection, artefacts persist with their claims,
a reviewer approves them, exports render, and every state change lands in an audit chain that
detects tampering and names the row.

What has not been shown on this machine is the part that needs a model: real generation, real
verification, and the sovereignty demonstration. Those are D's benchmarks and a session with
a key — not gaps in the integration, but gaps in the evidence, and the deck should only claim
what has actually been measured.
