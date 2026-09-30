# MetaMorph.AI

MetaMorph.AI transforms one trusted source into audience-specific artefacts while preserving source spans, claims, verification results, and audit history.

The repository is a TypeScript Turborepo monorepo. The cloud model provider is **Google Gemini** (Groq remains available); `AI_PROVIDER` chooses. The local model provider is **Ollama**.


## Repository Structure

```text
apps/
  server/                 Express API and BullMQ worker
  web/                    React + Vite frontend
packages/
  shared/                 Zod contracts shared by every package
  ai/                     Gemini/Ollama routing, extraction, generation, verification
prisma/
  schema.prisma           PostgreSQL schema
  append-only.sql         Audit-log protection trigger
  seed.ts                 Demo user seed
samples/                  Synthetic input documents
docs/                     SRS, implementation guides, reports, and deck assets
.github/workflows/        Continuous integration
docker-compose.yml        Local PostgreSQL and Redis services
```

## Runtime Architecture

```text
Browser (React/Vite)
        |
        v
Express API ---- PostgreSQL/Prisma
        |
        +-------- Redis/BullMQ -------- Worker
                                      |
                                      +-- Gemini for public/internal sources
                                      +-- Ollama for restricted sources or fallback
```

The API accepts source documents, extracts canonical facts, creates generation batches, and exposes authentication, review, export, audit, and WebSocket stream endpoints. The worker processes each artefact asynchronously and writes claims, provenance, verification, provider metadata, and status changes to PostgreSQL. Redis provides the queue, rate limiting, locks, and live event streams.

## Requirements

- Node.js 22 LTS or newer
- npm 10 or newer
- Docker Desktop with the WSL 2 backend on Windows
- A Gemini API key for cloud generation: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- Ollama is optional for local restricted-source generation

## Start From A Fresh Clone

Run these commands from the repository root:

```bash
git clone https://github.com/MdFareedKhan01/sih_ps154.git
cd sih_ps154
npm install
cp .env.example .env
```

On PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

Open `.env` and set a real Gemini key and a long JWT secret:

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash-lite
JWT_SECRET=replace-with-a-long-random-string
```

Start the infrastructure, initialize Prisma, and verify the repository:

```bash
docker compose up -d
npm run db:setup
npm run check
```

`npm run db:setup` pushes the Prisma schema, installs the append-only audit trigger, and seeds the demo users. Docker Desktop must be running before this command.

Start the development processes:

```bash
npm run dev
```

Open the web application at <http://localhost:5173>. The API listens on <http://localhost:8080> and exposes <http://localhost:8080/health>.

The seeded demo users are `operator`, `reviewer`, and `admin`, all with the password `demo1234`. New accounts created through the signup page receive the `operator` role.

## Providers

### Gemini cloud provider

Gemini is used for `public` sources and for `internal` sources after configured sensitive terms are redacted. Configure:

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash-lite
CLOUD_RPM=10
```

Without a valid key, the server uses an explicitly labelled offline stub. The stub is suitable for UI and pipeline development, but it does not represent real model quality or verification.

### Ollama local provider

Ollama is used for `restricted` sources and as the local fallback when Gemini is unavailable or rate-limited:

```bash
ollama pull qwen2.5:7b
```

Configure the local endpoint and model if needed:

```dotenv
OLLAMA_URL=http://localhost:11434
LOCAL_MODEL=qwen2.5:7b
LOCAL_NUM_CTX=8192
LOCAL_TIMEOUT_MS=180000
```

Restricted content never goes to Gemini. Internal content is redacted before it is sent to Gemini and restored after the response.

## Environment Variables

`.env.example` contains the complete configuration template. The important groups are:

| Group | Variables | Purpose |
| --- | --- | --- |
| Database | `DATABASE_URL` | PostgreSQL connection used by Prisma |
| Queue | `REDIS_URL` | Redis connection used by BullMQ and streams |
| API | `PORT`, `WEB_ORIGIN`, `JWT_SECRET` | HTTP port, CORS origin, and token signing |
| Gemini | `AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `CLOUD_RPM` | Cloud generation |
| Groq (alternative) | `AI_PROVIDER=groq`, `GROQ_API_KEY`, `CLOUD_MODEL` | Cloud generation |
| Ollama | `OLLAMA_URL`, `LOCAL_MODEL`, `LOCAL_NUM_CTX`, `LOCAL_TIMEOUT_MS` | Local generation |
| AI policy | `REDACT_TERMS`, `DEMO_PERTURB` | Redaction and verifier demo controls |

Never commit `.env`, API keys, passwords, or real operational data.

## Commands

All commands run from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the web app, API, and worker with reloads |
| `npm run dev:web` | Start only the Vite frontend |
| `npm run dev:api` | Start only the API |
| `npm run dev:worker` | Start only the BullMQ worker |
| `npm run check` | Typecheck, test, and build every workspace |
| `npm test` | Run all workspace tests |
| `npm run db:setup` | Push schema, install trigger, and seed users |
| `npm run db:push` | Push only the Prisma schema |
| `npm run db:trigger` | Install only the audit trigger |
| `npm run db:seed` | Seed only the demo users |
| `npm run smoke` | Run the API/worker end-to-end smoke check |
| `npm run try -- samples/demo-incident.md public advisory` | Run the AI engine harness |
| `npm run build` | Build all production packages, including the web bundle |
| `npm run docs:html` | Rebuild generated guide HTML from Markdown; requires Pandoc |

## Deployment Shape

The repository separates deployment into four runtime services:

1. **Web:** build with `npm run build` and serve `apps/web/dist` from a static host or reverse proxy.
2. **API:** run the server API process with the production `.env` and expose port `8080` behind HTTPS.
3. **Worker:** run one or more worker processes with access to the same PostgreSQL and Redis instances.
4. **Data services:** use managed PostgreSQL and Redis in production; do not use the Docker Compose data volumes as a production database.

Gemini is an external cloud dependency for public and internal generation. Ollama must run on infrastructure controlled by the deployment when restricted generation is required. Configure CORS with the deployed web origin, use a strong `JWT_SECRET`, keep secrets in the deployment platform's secret store, and run `npm run db:setup` against the intended database before starting API traffic.

The current repository provides local Docker Compose infrastructure and application start scripts; cloud-specific containers, IaC, TLS termination, secret-store configuration, migrations, backups, and autoscaling remain deployment-environment responsibilities.

## Troubleshooting

| Problem | Resolution |
| --- | --- |
| `P1001: Can't reach database server` | Start Docker Desktop and run `docker compose up -d`; verify `DATABASE_URL` matches `PG_PORT`. |
| `P1000: Authentication failed` | Check the PostgreSQL username, password, database, and port in `.env`. |
| Gemini calls fall back to the offline stub | Set `AI_PROVIDER` and the matching key (`GEMINI_API_KEY` or `GROQ_API_KEY`), and confirm `GEMINI_MODEL` (or `CLOUD_MODEL` for Groq) is a model your account can use. |
| Restricted generation fails | Install Ollama, pull the configured model, and confirm `OLLAMA_URL` is reachable. |
| `Cannot find module '@ps154/shared'` | Run `npm install` from the repository root. |
| Prisma Client is not initialized | Run `npm install` or `npx prisma generate` from the repository root. |
| Port already in use | Change `PG_PORT`, `REDIS_PORT`, `PORT`, or `WEB_ORIGIN` consistently in `.env` and restart the services. |

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) installs dependencies with `npm ci` and runs `npm run check` on pushes to `main` and pull requests. Keep the working tree clean and run `npm run check` before deployment.
