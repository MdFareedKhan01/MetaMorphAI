# PPT build kit — everything needed to finish the deck

Written 26 September 2026. Self-contained: you should not need to ask anyone anything
to build the slides from this file. It does **not** repeat Guide A — where Guide A already
has the material (video script, jury Q&A, words to avoid), this file points at it.

**Companion files**

| What | Where |
| --- | --- |
| The five content slides, rendered | `docs/deck/slides/*.html`, and the live deck at <https://claude.ai/artifact/C7HDQhJuRBqn5c2NMX7tcP> |
| Video script, Q&A sheet, words to avoid | `docs/final/SIH26154-Guide-A-Deck-and-Narrative.md`, Steps 6, 7, 8 |
| Every technical claim | `docs/final/SIH26154-SRS-Final.md` |

Open the live deck in a browser beside PowerPoint. It exports to `.pptx` and PDF from its
own page, so you can lift shapes if that is faster than rebuilding them.

---

## 0. DAY 3 CORRECTIONS — read this first

Checked against the code on `main`, 27 September. **Three claims on the deck are not true
yet.** Fix these before anything else; they are the exact kind of unverifiable claim this
product is pitched against, and a judge with the repo open can check all three.

| Deck says | Code says | Do this |
| --- | --- | --- |
| Slide 2: "**Six** generation parameters — audience, tone, language, detail, objective, style" | `packages/shared/src/config.ts` has **four**: audience, tone, detail, language | Either Fareed adds `objective` and `style` today, or **change the slide to four** and drop those two words |
| Slide 2: "One source, **seven** artefact types … all generated together" | `FormatId` has **five**: advisory, executive_summary, linkedin_post, x_thread, video_package | Say "**five artefact types today, seven specified**". Presentation and infographic are stretch, not built |
| Slide 3 diagram: "CLOUD, **GEMINI**" | `packages/ai/src/adapters.ts` imports `groq-sdk` and exports `new GroqAdapter()` | Change the deck to **Groq**, and get the exact model id from Fareed. Also tell B/D that `.env.example` still says `GEMINI_API_KEY` — it is stale |

**Internal inconsistency to fix while you are there:** the slide 2 strip says "TRANSFORM —
5 formats, one source" but The Resolution says seven, and "One index, not five prompts"
disagrees with both. Pick **five** everywhere on slide 2 and the slide is honest and
consistent in one edit.

### Two slides are still the sonar team's content

| Page | Problem |
| --- | --- |
| 3 | The **TechStack block** is SONAR-DRISHTI's: YOLOv8s, ONNX Runtime, OpenCV, scikit-learn, TensorRT, XTF ping-header parser, pyproj, shapely, Django, Celery, React-Leaflet, Recharts. None of it is ours. Replace with the tech-stack strip in §3, slide 3 |
| 8 | **Research and References is entirely the sonar deck**: AI4Shipwrecks, SubPipeMini2, Roboflow side-scan-sonar, Kaggle sonar-mine, AURORA, SW-Net, DFSE-YOLO, GhostNetZero, GhostVision, Transformer-YOLOv5. Replace wholesale with §3, slide 6 |

Page 8 is the most damaging error in the deck. It cites another problem statement's datasets
and papers under our team name.

### Delete three pages

Pages **4**, **6** and **9** are leftovers — two raw text dumps of slide content and one
blank page. Deleting them takes the deck to six pages: title plus five content slides, which
is the cap.

### Also on page 3

The **Node / Technical content** table is truncated in every row — "unpdf, mammoth → UTF-8,
CRLF to", "z.toJSONSchema( Canonical) in the". Either widen the column and let it wrap, or
delete the table: the architecture diagram beside it already carries the story, and a
half-sentence reads worse than no sentence.

### What is missing entirely

1. **No screenshot anywhere in the deck.** Guide A calls screenshot #4 — a claim selected,
   its source highlighted — the key image. Faizan's UI merged this morning, so these can be
   taken today. Without one, the deck asserts a running system and shows none.
2. **No measured numbers anywhere.** The old slide 4 had a "measured on the prototype" block;
   the rewrite dropped it. Feasibility is scored on evidence. Put the block back, bracketed,
   and fill it when Fareed sends the table.
3. **The two drift examples are gone from slide 2.** They were the argument: *consistent with
   a possible* becoming *was attacked by*, and 37 becoming 42. The new illustration strip is
   good, but it shows the pipeline, not why the pipeline must exist. If anything on slide 2
   has to give way, give way to these.

### Smaller fixes

- Slide 1 does not carry the product name. Add **MetaMorph-AI** under the PS title.
- Slide 1's title wraps oddly — "Gen AI" sits alone on the label line.
- Slide 7's "Nation/Public" stakeholder overlaps the "last mile" text block over the India map.
- Confirm **Team ID 120014 / StrawHats** is right for *this* problem statement, not carried
  over from the sonar submission.

## 1. The clock

Deadline **30 September**. Guide A's plan submits on the 29th and keeps the 30th as buffer.

| Day | What must happen | Who |
| --- | --- | --- |
| Sat 26 | Slide text into the official template; figures placed | You |
| Sun 27 | **Assets arrive**: screenshots, network-monitor capture, measured numbers | C, B, D |
| Mon 28 | Video recorded and edited; deck final; timed dry run | You + C |
| Tue 29 | Submit, screenshot the confirmation | You |
| Wed 30 | Buffer only | — |

**If you are away until the 29th**, the asset day and the video day both pass without you.
Do §5 *today*, before you go — it is the one thing that cannot be recovered later. Assets
waiting in the team chat on your return turn a two-day job into a few hours; assets not yet
requested turn it into a missed deadline.

---

## 2. Three decisions, before you place anything

| # | Decision | Recommended | Where it appears |
| --- | --- | --- | --- |
| 1 | **Product name** | `PRAMAAN` (प्रमाण — proof) with "Intelligence Content Transformation Engine" underneath | Slide 1 and slide 2 title |
| 2 | **Team name** | The name registered on the SIH portal | Slide 1, and every slide's footer |
| 3 | **Six parameters or four** | Six. Tell Farhan, Faizan and Fareed today | Slides 2 and 3 |

**On the name.** All three winning decks lead with a short codename, not a description.
SONAR-DRISHTI, FLOW SENSE, FALKON. `PRAMAAN` means *proof* — which is the product. If you
prefer MetaMorph.AI or something else, change it in two places and nothing else breaks.

**On the six parameters — the one open risk in the deck.** The problem statement names six
controllable parameters:

> *"target audience, tone, language, level of detail, communication objective and content style"*

Our `Config` has four: audience, tone, detail, language. Slides 2 and 3 both say **six**.
Either the team adds the two fields, or you change both slides to say four. The fix is small
— in `packages/shared/src/config.ts`:

```ts
objective: z.enum(['inform', 'warn', 'instruct', 'persuade', 'summarise']),
style: z.enum(['neutral', 'narrative', 'bulleted', 'technical']),
```

plus one line in `buildPrompt()`. It is a shared-schema change, so it needs a message in the
team chat before anyone writes it. Paste §5's message A today.

---

## 3. Slide-by-slide text

Copy straight from here. Bold means bold on the slide.

### Slide 1 — Title

Template fields, exactly as the portal gives them:

- Problem Statement ID — **SIH26154**
- Problem Statement Title — **Gen AI Platform for Automated Content Transformation**
- Theme — **Blockchain & Cybersecurity**
- PS Category — **Software**
- Team ID — *[from the portal]*
- Team Name — *[from the portal]*

Product name: **PRAMAAN** · Intelligence Content Transformation Engine
Tagline: *One trusted source. Many verified artefacts. Every sentence traceable.*

### Slide 2 — Our solution

**Headline:** We don't just generate content. We **transform intelligence** without losing its integrity.

**One-sentence pitch**, in a band under the headline — use it verbatim, and say it again at the end of the video:

> Our platform converts **trusted source intelligence** into controlled, audience-specific artefacts while preserving **factual integrity** and a **verifiable transformation trail**.

**OUR SOLUTION — the pipeline strip** (six boxes, left to right):

| Stage | Line under it |
| --- | --- |
| INGEST | Text, PDF, DOCX, URL + tier |
| UNDERSTAND | One fact index, every field cited |
| CONFIGURE | 6 parameters, per format |
| TRANSFORM | 7 artefact types, one source |
| VERIFY | In code, then one repair |
| PROVE | Click to source, sealed log |

Colour UNDERSTAND, TRANSFORM, VERIFY and PROVE as the four core words; leave INGEST and
CONFIGURE muted, so the spine reads at a glance.

**WHY WE STAND OUT**

- **Provenance is the architecture** — Every sentence carries the spans it came from. Click it; the source lights up.
- **Code checks the model** — A verifier tests every number, CVE, domain and hedge against the cited sentence.
- **One index, not seven prompts** — Every generator reads one extracted object, so artefacts cannot disagree.
- **Restricted cannot leave** — The egress gate is server-side, before a provider is chosen. Not a toggle.
- **Tamper-evidence, no chain** — Each audit row seals the one before it. Twenty lines, no ledger to run.

**WHERE REWRITING GOES WRONG** — two cards, the heart of the slide. Use them verbatim:

> SOURCE — "indicators **consistent with a possible** phishing campaign."
> REWRITE — "the organisation **was attacked by** a phishing campaign."
> **The hedge check catches it.**

> SOURCE — "**37** organisations were **potentially** exposed."
> REWRITE — "**42** organisations were exposed."
> **Right sentence cited, wrong number. Both caught.**

Caption under both: *Fluent, confident, and the evidence has quietly changed. No spell-check
or human skim catches either one.*

**THE RESOLUTION**

- **One source, seven artefact types** — advisory, summary, LinkedIn, X thread, video package, presentation, infographic — generated together.
- **Six generation parameters** — audience, tone, language, detail, objective, style — set globally, overridden per format.
- **It understands before it writes.** One cited fact index per source, so no two artefacts can contradict each other.
- **Verification is deterministic** — numbers, hedges and limits checked in code, then exactly one targeted repair.
- **Public, internal, restricted** routing enforced server-side, every action written to a hash-chained audit log.

Each of those five mirrors a sentence in the problem statement. A judge reading with the PS
in hand can tick them off.

### Slide 3 — Technical approach

**Headline:** An orchestrated pipeline **around** the model — not a prompt.

**Architecture strip:** BROWSER (React cards, live) → GATEWAY (Express 5, Zod, auth) →
QUEUE (BullMQ, 3 in flight) → **WORKER (egress gate lives here)** → ENGINE (extract, write,
verify) → PROVIDERS (cloud, on-device, cache). Highlight the worker box in the accent colour.

**THE FOUR MODULES**

- **M0 · UNDERSTAND** — Sentence spans with stable IDs, then one fact index. Every field cites the spans it came from.
- **M1 · TRANSFORM** — One spec per format: role, content plan, limits, JSON schema. Generators read the index, never the raw source.
- **M2 · VERIFY & REPAIR** — Deterministic checks, then one targeted revision carrying the findings. Two model calls, never three.
- **M3 · PROVE** — Claims resolve to source spans; each audit row carries the hash of the one before it.

**EVERY DRAFT IS CHECKED IN CODE**

- **Schema** — the content parses against the format's schema
- **Identifiers** — every number, CVE, IP and domain in a claim appears in the span it cites
- **Hedges** — a hedged source cannot become a certain claim
- **Severity** — one canonical value across every artefact
- **Constraints** — lengths, counts, emoji, script, durations
- **Grounding** — a fact must share a term with the span it cites

*A failure triggers one targeted revision carrying the exact findings — never a blind retry.*

**SOVEREIGNTY, STATED CORRECTLY**

- **Ingress** — Tailscale decides which devices reach the gateway.
- **Egress** — a classification check in worker code, before the adapter is chosen.
- Public → cloud provider · Internal → cloud, identifiers masked then restored · Restricted → on-device only
- *The worker holds the only path out of the host. That one arrow is what the rule governs — not a setting a user can flip.*

**Tech stack strip:** TypeScript end to end · React + Vite · Express 5 · BullMQ · Redis ·
PostgreSQL + Prisma · Zod schemas shared by client and server · Gemini in the cloud ·
Ollama on the device

### Slide 4 — Feasibility and viability

**Headline:** It runs today: three formats generated, **verified** and **traced** from one source.

| Challenge | How it is handled |
| --- | --- |
| The model states something the source does not support | Every number and hedge is checked against the sentence the claim cites; a human approves before release |
| The network or the provider fails on demo day | The on-device model takes over, then a cached pack; the demo runs on a laptop hotspot, not venue wifi |
| A source document tries to instruct the model | Source text is data inside delimiters, control flow is code, and injected text surfaces as unverified |
| Scope grows faster than the build | Five formats in the MVP; the two stretch formats stay locked behind passing acceptance tests |

**MEASURED ON THE PROTOTYPE** — every figure stays bracketed until Fareed's table arrives:

- Three formats, cloud model — **[n] s**
- Three formats, on-device — **[n] s**
- Mean grounding score — **[x]** over **[n]** runs
- Drafts needing a repair — **[n] of [n]**
- Model calls per artefact — **2 maximum**, enforced in code

*Target: five artefacts from a 3,000-word source in under 60 seconds. Verification is
deterministic and adds under 200 ms.*

**THE ROAD** — Today: one laptop, Docker Compose, three formats end to end · Next: X thread,
video package, Hindi, review workflow, exports · Deployment: on-premise, containerised,
on-device model

**Viability strip:** No cloud required · Model-agnostic · Scales sideways · Formats are
additive · Auditable by design

### Slide 5 — Impact and benefits

**Headline:** From a working day to minutes — with **a trail an auditor can check**.

| OPERATIONAL | SECURITY | SCALE |
| --- | --- | --- |
| One submission replaces five or six hand rewrites | Restricted material stays on the host, by policy in code | A new format is one registry entry, no pipeline change |
| Analyst hours return to analysis, not drafting | Every artefact traces to the passage it came from | Hindi is a parameter, not a second pipeline |
| One consistent message on every channel | A tampered audit record is detected and named | The model is replaceable; the guarantees are not |

**WHO BENEFITS**

- **Communications officer** — one submission instead of a day of rewriting; every draft arrives with its sources attached
- **Analyst** — writes the report once; no longer recasts it for five audiences
- **Sector CISO** — an advisory whose every claim links back to the source passage
- **Reviewer and auditor** — approval is recorded, and a changed record is detectable
- **The public** — awareness material in English and Hindi, from the same verified facts

**OUR PROMISE** — three cards:

- *Under 60 seconds — **target**.* Five artefacts from a 3,000-word source, in place of most of a working day.
- *Every sentence traceable.* Click any claim; the passage it came from highlights in the source.
- *Restricted never leaves.* Zero outbound calls on a restricted run, with a network monitor open beside it.

**Closing band:** Built for the **last mile of dissemination** at NTRO and NCIIPC — the gap
between a finished technical analysis and the five audiences who each need it in a different
shape, without a single fact drifting on the way.

### Slide 6 — Research and references

**Headline:** Every claim in this deck traces to a document — **the same rule the product enforces**.

**OUR DOCUMENTATION** — `[1]` SRS · `[2]` Backend guide · `[3]` Frontend guide ·
`[4]` AI systems guide · `[5]` Architecture note (2 pages, as the PS requires)

**RESEARCH AND STANDARDS**

- **NIST AI 600-1**, Generative AI Profile of the AI Risk Management Framework — the risk framing this design answers
- **OWASP Top 10 for LLM Applications** — prompt injection is the first risk listed; our containment follows it
- **C2PA specification** — content provenance; the external anchor our audit chain is built to adopt
- **Adjacent products** — Adobe GenStudio, Canva Magic Write, ChatGPT. They generate fluent text; none can trace a sentence to its source
- **Problem statement SIH26154**, National Technical Research Organisation

**PROJECT LINKS**

- Source code — `github.com/MdFareedKhan01/sih_ps154`
- README with setup instructions — in the repository root
- Demo video, under two minutes — *[link]*

**TOOLS AND MODELS** — Gemini API · Ollama with an open local model · TypeScript · React ·
Express · BullMQ · Redis · PostgreSQL · Prisma · Zod

> Open every standard yourself before citing it, and use the title exactly as the source
> gives it. Replace "Gemini API" with the exact model version once Fareed reports which one
> ran on the day.

---

## 4. Figures — which one goes where

> **Mermaid source for every figure is in `docs/deck/figures.md`**, each with an `init`
> block that forces a light theme, plus how to export at 3x for PowerPoint.

You have nine mermaid diagrams rendered from the guides, plus two built for the deck.
**Only two belong in a five-slide deck.** The rest are for the architecture note and the
Q&A backup; a figure that needs explaining costs more than it earns.

### In the deck

| Slide | Figure | Why it earns the space |
| --- | --- | --- |
| 2 | *(none)* | The pipeline strip is text, and the two drift cards are the argument. Adding a diagram here would crowd out both |
| 3 | **F2 · Whole system architecture** | The one figure a technical judge wants. Place it left, about two-thirds width |
| 3 | **C's screenshot #4** (a claim selected, its source highlighted) | Inset, right. The proof beside the design. Guide A calls it the key image of the deck |
| 4 | C's screenshots #3, #5, #6 | Evidence, not diagrams |
| 5, 6 | *(none)* | — |

If slide 3 will not hold both F2 and the screenshot, keep the screenshot. The architecture
can be described; provenance has to be seen.

### In the two-page architecture note

In this order. Together they tell the whole story without a word of hand-waving:

1. **F2 · Whole system architecture** — the tiers
2. **Sequence diagram** (Guide B Step 5) — one request end to end, browser to engine and back
3. **Ingestion flow** (Guide B Step 4) — file type, size gate, spans, canonical, 201 or 502
4. **F7 · The AI engine** — the technical detail, with the library and parameter names

### Keep as Q&A backup slides, after the last slide

Hidden slides the jury never sees unless they ask. Each answers one predictable question:

| Diagram | Answers |
| --- | --- |
| **Engine boundary** (Guide D Step 1) — B's server against D's `packages/ai` | *Who owns what? Where exactly is the gate?* |
| **Pipeline state machine** (Guide D Step 7) — running, validating, revising, ready, flagged, failed | *What happens when verification fails twice?* |
| **Provenance interaction** (Guide C Step 7) — operator, ClaimSpan, selection, SourcePane | *How does the click-to-source actually work?* |

### Not in the deck at all

The worker task state machine (Guide B Step 6), the review state machine (Guide B Step 9)
and the frontend screen flow (Guide C Step 1) are build documentation for the team. They are
correct and useful, and they say nothing a judge is asking. Leave them in the guides.

### About the merged figure

**F2 · Whole system architecture** at `docs/deck/slides/fig-system.html` now merges what was
spread across four of your diagrams: the tier map, the engine internals, the provider
fallback and the write-back paths. Five bands, top to bottom:

1. **CLIENT · React + Vite** — the five screens on one line
2. **POSTGRESQL · EXPRESS GATEWAY · REDIS** — the gateway between its two stores
3. **WORKER ×3 · EGRESS GATE** — accent-coloured, the only tier that can reach out
4. **ENGINE · packages/ai** — extract, route, generate, verify, repair ×1 as a chain inside one band
5. **CLOUD · ON-DEVICE · CACHED PACK** — the three providers, fed by one bus from the worker

Dashed lines are the write-backs: artefacts, claims and audit rows to PostgreSQL, and
progress events to the Redis stream the gateway forwards. When you present it, read it top
to bottom and stop on band 3 — that band is the whole security argument.

## 5. What to chase, and the messages to send today

Send these before you go. Each names one person, one artefact and one deadline.

**Message A — to the whole team, today**

> The problem statement names six generation parameters: audience, tone, language, detail,
> **communication objective** and **content style**. Our Config has four. Slides 2 and 3 say
> six. Can we add `objective` and `style` to `packages/shared/src/config.ts` plus one line in
> `buildPrompt()`? It is a shared-schema change so I am asking before anyone writes it.
> If we decide not to, tell me and I will change the slides to say four.

**Message B — to Faizan (C), due Sunday evening**

> Six screenshots for the deck, 1920×1080 PNG, projector mode on, browser zoom 110–125%,
> bookmarks bar hidden, no personal tabs. Frontend Guide Step 8 lists them:
> 1. Ingest with **Restricted** selected, its consequence sentence readable
> 2. Confirm: the extracted-facts panel beside the source
> 3. Workspace mid-run: one card ready, one revising, one running
> 4. A LinkedIn sentence selected with its passage highlighted in the source — **the key image of the deck**
> 5. The verification badge expanded, showing the repair
> 6. A restricted run's card showing *processed on this machine*

**Message C — to Farhan (B), due Sunday evening**

> Two things for the deck: a screenshot of a network monitor during a restricted run showing
> zero outbound provider calls, and the audit-tamper command with its output
> (`/audit/verify` returning invalid and naming the first broken row).

**Message D — to Fareed (D), due Sunday evening**

> The numbers table from AI Systems Guide Step 8: seconds per format on cloud and on-device,
> grounding score per format, how many of nine drafts needed a repair — medians of three runs
> each. Plus **the exact model names and versions** you used. Send the bad numbers too; I
> decide what goes on a slide, nobody invents one.

**Message E — to everyone, today**

> If I am unreachable and something blocks the deck, Farhan has the final say on the
> technical slides and Faizan on anything visual. Do not let a question wait for me.

---

## 6. Number discipline — the one rule that cannot bend

Every number on a slide is either **in Fareed's table**, or **labelled *target***. There is
no third option. This product exists to stop unverifiable claims; a deck that makes one
hands a judge the counter-argument for free.

Slide 4 is the only slide with brackets. When the table arrives, fill them and delete the
word *target* only where a number replaces it.

If Fareed's numbers never arrive: leave the brackets out entirely and say *target* on every
figure. A slide that says "target: under 60 seconds" is honest. A slide that says "42
seconds" without a measurement is the thing we are pitching against.

---

## 7. Building it in PowerPoint

1. **Start from the official template.** Never reorder or rename its mandated sections.
   If its section order differs from slides 2–6 here, move each block into its matching slot;
   the content stays the same, only the position changes.
2. **Confirm the slide cap with your coordinator.** All three winning decks are title page +
   5 content slides = 6 pages, which is what this kit assumes.
3. **Place the zones before the words.** Draw the boxes, then paste. Every slide here is
   zones, not paragraphs, and the zones are what make it readable at a glance.
4. **Nothing under 16pt**, and the body text on the reference decks sits around 11–12pt in a
   dense zone. Test by standing back from the screen.
5. **Bold the two or three words per line that carry the meaning.** All three winning decks
   do this; it is what makes a dense slide scannable.
6. **Screenshots at full resolution**, never stretched. Caption #5 *fault injected for
   demonstration*.
7. **Export to PDF and check** the fonts embedded and nothing reflowed.

---

## 8. Before you press Submit

From Guide A Step 9, plus what this kit adds:

- [ ] The official template is used, with its mandated sections in their order
- [ ] Slide 1 has the correct PS ID, title, theme, team name and team ID
- [ ] Every number on a slide is in Fareed's table, or labelled *target*
- [ ] The words-to-avoid search (Guide A Step 8) finds nothing — search the deck for
      "100%", "guaranteed", "physically", "blockchain-powered", "real-time", "zero hallucination"
- [ ] Both drift examples are on slide 2
- [ ] The provenance screenshot (#4) is in the deck
- [ ] Screenshot #5 is captioned *fault injected for demonstration*, and the video says *injected* aloud
- [ ] Nothing claims image or video **input** — the PS lists them, we decline them, and that is a Q&A answer, not a slide
- [ ] Product name and team name are consistent on every slide and in every footer
- [ ] The repo link works from a signed-out browser
- [ ] The video is under two minutes and plays from a signed-out browser
- [ ] The file is under the portal's size limit; fonts embedded if PDF
- [ ] Two teammates have proof-read it
- [ ] Submitted, with a screenshot of the confirmation saved

---

## 9. If you are short of time

Cut in this order. Everything above the line is what the deck cannot lose.

**Keep, always**

1. Slide 2's two drift examples — they are the argument
2. The provenance screenshot on slide 3 — it is the proof
3. Slide 4's challenge/mitigation table — it is what feasibility scores on
4. Honest numbers, or the word *target*

**Cut first, in this order**

1. The tech-stack strip on slide 3 — nice, not load-bearing
2. F2, keeping only F7 — one good diagram beats two rushed ones
3. Slide 5's "who benefits" list, down to three rows
4. Slide 6's adjacent-products line

**If the video cannot be made:** submit without it if the portal allows. A deck with honest
content and no video beats a rushed video that overclaims. Guide A Step 6 has the full script
if you get an hour back.

---

## 10. The four sentences to have by heart

For the jury, and for anyone who asks what you built. Guide A Step 7 has all fifteen answers;
these four carry the rest.

1. *Isn't this just an LLM wrapper?* — The model is one component. Around it: one fact index
   per source, every format written from it, a verifier in code checking every number and
   hedge against the sentence it cites, one targeted repair, classification-enforced routing
   and a sealed log. Swap the model and all of that still holds.
2. *Can you guarantee no hallucinations?* — No generative system should promise zero. We
   reduce and detect: formats are written only from extracted facts, every sentence carries
   its source, code checks numbers and hedges, unsupported sentences are marked unverified,
   and a human approves before release.
3. *Where does confidential data go?* — Three tiers. Restricted never leaves the machine,
   enforced on the server before any provider is chosen. Internal goes to the cloud with IPs,
   domains and names masked. Public goes directly.
4. *Why not blockchain?* — We did not bolt on a chain. The audit log is hash-linked, so
   changing any past entry is detected, and we can show it. A permissioned ledger or a C2PA
   manifest is the path for when an outside party must verify without trusting our database.
