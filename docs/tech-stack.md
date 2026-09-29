# Technology stack

Everything the system is built from, with the version it actually runs on.

**Source of truth:** versions are read from `package-lock.json` (resolved), `package.json`,
`docker-compose.yml`, `.nvmrc` and `.github/workflows/ci.yml` as of **29 September 2026**.
They are not copied from the design guides, several of which named technologies the team
later replaced (Gemini became Groq, for example).

---

## 1. The stack in one screen

| Layer | Technology |
| --- | --- |
| **Language** | TypeScript 6.0 end to end · Node.js 22 · ES modules |
| **Frontend** | React 19 · Vite 8 · React Router 7 · Tailwind CSS 4 |
| **API** | Express 5 · `ws` WebSockets · Zod 4 validation · JWT + bcrypt |
| **Queue and events** | BullMQ 6 · Redis 7 (queue, rate limit, locks, Streams) |
| **Database** | PostgreSQL 16 · Prisma 6 |
| **AI** | Groq (`llama-3.3-70b-versatile`) in the cloud · Ollama (`qwen2.5:7b`) on the host |
| **Verification** | Deterministic TypeScript: regular expressions, a hedge lexicon, lexical overlap |
| **Documents in** | `unpdf` (PDF, per page) · `mammoth` (DOCX) · `Intl.Segmenter` (sentences) |
| **Integrity** | SHA-256 hash-chained audit log · PostgreSQL append-only trigger |
| **Build and test** | Turborepo 2 · Vitest 5 · Testing Library · oxlint · GitHub Actions |
| **Run** | Docker Compose (PostgreSQL + Redis) · API, worker and web on the host |

### Slide-ready strip

> **TypeScript** · **React 19 + Vite 8** · **Express 5** · **BullMQ + Redis Streams** ·
> **PostgreSQL + Prisma** · **Zod (one schema, both sides of the wire)** ·
> **Groq · Llama 3.3 70B** · **Ollama · Qwen 2.5 7B** · **Turborepo + Vitest**

---

## 2. Language and runtime

| Technology | Version | Role | Where |
| --- | --- | --- | --- |
| Node.js | 22 (`.nvmrc`); `engines` allows ≥ 20.12 | Runs the API, worker, scripts and tests | everywhere |
| npm | 10.9.2 (`packageManager`) | Package manager; workspaces link the four packages | root |
| TypeScript | 6.0.3 | One language for client, server, engine and contracts; `strict` mode | all packages |
| tsx | 4.23.15 | Runs TypeScript directly in development, no build step for the server | `dev:api`, `dev:worker`, scripts |
| ES modules | `"type": "module"` | Native `import`/`export` throughout | all packages |

## 3. Frontend — `apps/web`

| Technology | Version | Role |
| --- | --- | --- |
| React | 19.3.0 | UI. One independent state machine per artefact card |
| React Router | 7.18.4 | Client routing: login, signup, ingest, confirm, workspace, gallery |
| Vite | 8.3.1 | Dev server (proxies `/api` and the WebSocket to the API) and production bundle |
| `@vitejs/plugin-react` | 6.1.1 | JSX and fast refresh |
| Tailwind CSS | 4.3.3 (`@tailwindcss/vite` 4.3.3) | Styling; a `projector` class scales the UI for demos (Alt+P) |
| Native `WebSocket` | browser | Live progress frames with resume from the last `seq` |
| `localStorage` | browser | Holds the JWT under `ps154.token` |

## 4. API and server — `apps/server`

| Technology | Version | Role |
| --- | --- | --- |
| Express | 5.2.1 | REST API under `/api/v1`; async handlers reach the error middleware without try/catch |
| `ws` | 8.21.3 | WebSocket upgrade for `/api/v1/jobs/:id/stream` |
| `cors` | 2.8.6 | Restricts browser access to `WEB_ORIGIN` |
| `multer` | 2.4.0 | Multipart upload, in memory, 10 MB cap |
| `jsonwebtoken` | 9.0.3 | Signs and verifies session tokens (12 h) |
| `bcryptjs` | 3.0.3 | Password hashing, cost factor 10; pure JavaScript, no native build |
| `dotenv` | 18.0.3 | Loads the root `.env` |
| Zod | 4.6.5 | Validates every request body; also the source of the JSON Schemas sent to the models |

## 5. Queue, events and cache

| Technology | Version | Role |
| --- | --- | --- |
| Redis | 7 (`redis:7-alpine`) | Queue backing store, provider rate counter, task locks, event streams |
| BullMQ | 6.3.8 | Queue `generate`; worker concurrency **3**; one job per artefact; `attempts: 1` (retries live in the engine) |
| ioredis | 6.0.0 | Redis client. `maxRetriesPerRequest: null` as BullMQ requires; one duplicated connection per WebSocket for blocking `XREAD` |
| Redis Streams | native | `stream:{batch_id}` event log, trimmed to ~1000 entries, expires after 6 h. A reconnecting client resumes from its last id, which Pub/Sub cannot do |

**Redis keys in use:** the BullMQ keys · `lock:task:{task_id}` (300 s) · `stream:{batch_id}` (6 h) ·
`ratelimit:provider:cloud` (60 s window).

## 6. Database — `prisma/`

| Technology | Version | Role |
| --- | --- | --- |
| PostgreSQL | 16 (`postgres:16-alpine`) | System of record: users, sources, batches, artefacts, claims, audit log |
| Prisma | 6.19.3 (client and CLI) | Schema, client and `db push`. Pinned to 6; Prisma 7 changed client generation |
| PL/pgSQL trigger | — | `prisma/append-only.sql` rejects `UPDATE` and `DELETE` on `audit_log` |
| Advisory lock | `pg_advisory_xact_lock(154)` | Serialises audit inserts so the hash chain stays linear |
| JSONB | native | Stores spans, the canonical object, artefact content, verification and metadata |

## 7. AI engine — `packages/ai`

| Technology | Version | Role |
| --- | --- | --- |
| **Groq** via `groq-sdk` | 1.6.0 | Cloud inference for `public` and `internal` sources |
| **Llama 3.3 70B Versatile** | `llama-3.3-70b-versatile` (default `CLOUD_MODEL`) | The cloud model. `temperature 0`, strict `json_schema` output, up to 8192 completion tokens |
| **Ollama** | host install, `OLLAMA_URL` | Local inference for `restricted` sources and as fallback |
| **Qwen 2.5 7B** | `qwen2.5:7b` (default `LOCAL_MODEL`) | The on-device model. `num_ctx 8192`, `format` = JSON Schema, 180 s timeout |
| Zod → JSON Schema | `z.toJSONSchema` (Zod 4) | Each format's output schema is generated, never hand-typed, and reused to validate the reply |
| `Intl.Segmenter` | built into Node | Sentence spans with no NLP dependency. Lives in `splitSpans()` in `packages/shared`, called at ingestion |
| Regular expressions and a lexicon | — | CVE, IPv4, domain (including `[.]` defanging), MD5/SHA-1/SHA-256, number extraction; an English and Devanagari hedge lexicon |
| Lexical overlap | — | Term overlap ≥ 0.5 between a claim and its cited sentence; also assigns citations to claims that lack one. **No embeddings, no vector store** |

**Model access:** the cloud adapter is `GroqAdapter`; the local adapter is `OllamaAdapter`
(plain `fetch` to `/api/chat`). Both implement one `LLMAdapter` interface, and the router is
the only way a prompt leaves the package.

## 8. Document parsing

| Technology | Version | Role |
| --- | --- | --- |
| `unpdf` | 1.8.1 | PDF text, one string per page, so each span records its page number |
| `mammoth` | 1.12.3 | DOCX to raw text |
| Native `Buffer` | — | Plain text and Markdown |

Scanned PDFs have no text layer and are not read. OCR is out of scope.

## 9. Security primitives

| Mechanism | Implementation |
| --- | --- |
| Authentication | Signed JWT, 12 h, secret from `JWT_SECRET` (minimum 16 characters) |
| Passwords | bcrypt, cost 10; signup requires ≥ 8 characters |
| Authorisation | `requireRole(...)` on each route; roles `operator`, `reviewer`, `admin`; signup always creates an operator |
| Egress control | Classification check in `router.ts` before any adapter is chosen |
| Masking | `Redactor` replaces IPs, URLs, emails, domains with `<<KIND_n>>` and restores them on return |
| Tamper evidence | SHA-256 over `prev_hash, seq, actor, target, action, metadata, ts`; `GET /audit/verify` recomputes the chain |
| Append-only | PostgreSQL trigger on `audit_log` |

## 10. Build, test and quality

| Technology | Version | Role |
| --- | --- | --- |
| Turborepo | 2.11.4 | Task graph and caching: `typecheck`, `test`, `build`; `npm run check` runs all three |
| Vitest | 5.0.2 | Test runner for all four packages |
| Testing Library | react 16.3.3 · user-event 14.6.7 · jest-dom 7.0.1 | Component tests |
| jsdom | 29.1.1 | Browser simulation for component tests |
| oxlint | 1.85.0 | Linting for the web app (advisory, not a gate) |
| GitHub Actions | `actions/checkout@v5`, `actions/setup-node@v5`, `ubuntu-latest` | On every pull request and every push to `main`: `npm ci` then `npm run check` |

**Current suite:** 61 tests in 16 files — shared 5 · ai 25 · server 10 · web 21.
Plus `npm run smoke`, an end-to-end script against the running stack.

## 11. Infrastructure and deployment

| Technology | Role |
| --- | --- |
| Docker Compose | PostgreSQL and Redis only. Host ports default to 5432 and 6379; `PG_PORT` and `REDIS_PORT` override them |
| Host processes | API, worker and web run on the host with `tsx watch` and Vite. Containerising them is not done |
| Ollama | Runs on the host, outside Compose, so model weights survive `docker compose down` |
| Named volumes | `pg_data`, `redis_data` |

## 12. Documentation tooling

| Technology | Role |
| --- | --- |
| Markdown | Every document in `docs/` |
| pandoc 3.x | `npm run docs:html` renders the SRS and guides to HTML |
| Mermaid 11 | Diagrams inside those HTML files, loaded from a CDN |
| Headless Chrome | Rasterises the SVG figures in `docs/figures/` to PNG |

---

## 13. Deliberately not used

Each of these was proposed at some point and declined, for a stated reason.

| Not used | Why |
| --- | --- |
| Vector database, embeddings, RAG | One source fits in the model's context. Retrieval earns its place across a corpus, which this system does not have |
| A second model to grade the first | A model grading a model can be wrong in the same direction twice. Verification is plain code |
| A blockchain or ledger | The audit log is hash-linked and needs no network. A permissioned ledger or C2PA manifest is the roadmap for external verification |
| A model choosing the next step | Control flow, routing and egress are code. The source is untrusted input, and a model-driven orchestrator could be steered by it |
| Python | Nothing required it. Shared Zod schemas across client and server removed a class of drift |
| MCP server | The engine's functions are shaped for it, but no server is built |
| Image or video input, OCR | Each is a separate parsing subsystem |
| Rendered video or generated images | The video package is text: script, storyboard, narration |
| Model fine-tuning | Prompting plus schema validation meets the requirement |
| Tailscale in code | A deployment choice for restricting who reaches the gateway. Nothing in the repository configures it |

## 14. Present in the repository but not in use

| Item | State |
| --- | --- |
| `archiver` 8.0.0 | Declared in `apps/server`; the pack export it was meant for is not built |
| `packages/ai/src/claims.ts`, `grounding.ts` | Not imported by anything |
| `apps/web/src/shared-temp.ts` | A stand-in for types that `@ps154/shared` now exports; still imported by several components |
| `@google/genai` (Gemini) | Removed from the lockfile. Some guides and the SRS still name Gemini |
| `GEMINI_API_KEY` | Removed from `.env.example`; older guides still mention it |
