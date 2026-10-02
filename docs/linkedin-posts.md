# LinkedIn posts: MetaMorph-AI (SIH 2026, SIH26154)

Six posts, one per team member. Each person posts their own, tags the other five, and links the same repo and video. Post them over two to three days in the order below, so each one lands on its own and the earlier posts can be linked from the later ones.

**Before posting**
- Replace every `[LINK]` with the real URL, and every `@Name` with the person's LinkedIn tag (type `@`, pick the profile).
- The facts below are checked against the repo and the benchmark. Keep them that way: do not add "under 60 seconds", "tamper-proof", "seven formats" or "Hindi verification", because none of them is true today.
- Faiqa's and Asad's posts are written from their roles. Add one concrete detail each of you remembers (a decision, a diagram, a source you read), because that is what makes a post sound like the person.
- Attach one image per post (suggested below). The architecture and workspace screenshots are in `docs/`.

**Shared links:** repo `https://github.com/MdFareedKhan01/MetaMorphAI` · demo video `[LINK]` · event: Smart India Hackathon 2026, problem statement SIH26154 (NTRO), team StrawHats (120014).

**Shared hashtags (use 4 to 5 per post):** #SIH2026 #SmartIndiaHackathon #GenAI #CyberSecurity #TeamStrawHats #MetaMorphAI

---

## Post 1 · Rehan Fazal · Team lead, integration, deck and narrative
**Order:** first. **Image:** the slide-3 architecture slide, or a 20-second screen recording of upload → cards → click-to-source.

> We just submitted MetaMorph-AI to Smart India Hackathon 2026, and I want to tell you what we built and who built it.
>
> The problem (SIH26154, NTRO): one threat report has to reach a ministry, a sector CERT and the public, each in a different shape. Rewriting it by hand takes most of a day. An AI can do it in seconds, but it can quietly turn "a possible phishing campaign" into "was attacked", or change 42 into 37.
>
> Our answer: understand the source once into a cited fact index, write every format from that index, check every claim with code (not another model), and let a human approve. Click any sentence and the passage it came from lights up.
>
> My part was keeping five people's modules working as one product: wiring the engine into the API and the queue, the browser into the live stream, then testing the whole path end to end, and telling the story in the deck and the demo.
>
> What I learned: the hard part of a team project is the seams. Each module worked alone. Making them agree on one contract (shared Zod schemas) is what made the product real.
>
> Over the next days, each teammate will share their part. Please follow along: @Md Fareed Khan (AI engine) · @Faiqa (architecture) · @Farhan Quamar (backend) · @Faizan Ahmad Ansari (frontend) · @Asad (research and documentation).
>
> Repo: [LINK] · Demo: [LINK]
>
> #SIH2026 #SmartIndiaHackathon #GenAI #CyberSecurity #TeamStrawHats

---

## Post 2 · Md Fareed Khan · AI engine
**Order:** second. **Image:** the AI flowchart (`docs/figures/note-flow.png` if present, or slide 3), or the verifier showing a flagged claim.

> Our AI engine for Smart India Hackathon has one rule: the model writes, but code decides whether it is allowed to.
>
> I built the engine behind MetaMorph-AI. The path of one report:
>
> 1. Extract. One model call turns numbered sentences into a cited fact index: severity, actors, systems, indicators. Any citation the model invents is dropped.
> 2. Generate. Each format is written from that index only, with its own prompt and JSON Schema, so formats cannot contradict each other.
> 3. Verify, in plain code. Do the citations exist? Does the claim overlap its cited sentence? Does every number, CVE and IP appear there? Did "possibly" survive? Is the claim cut off mid-sentence?
> 4. Repair once. A failure triggers exactly one targeted repair with only the failing claims, then a full re-check. Two model calls is a hard cap, and a test enforces it.
>
> Routing is also code. A router decides before any provider is chosen: restricted material goes only to an on-device model (Ollama, Qwen 2.5 7B); public and internal go to Gemini, with an on-device fallback.
>
> What the numbers said: on Gemini Flash-Lite, generation took about 6 to 12 seconds per format, grounding 1.00, and all nine benchmark drafts passed. Three needed the repair, which is why the loop exists. We moved from Groq to Gemini mid-hackathon because it performed better on our benchmark, and the adapter design made that a small change.
>
> The honest limit: the grounding score measures citation overlap, not truth. That is why numbers and hedges are checked separately.
>
> Thanks to @Rehan Fazal, @Faiqa, @Farhan Quamar, @Faizan Ahmad Ansari and @Asad. Repo: [LINK]
>
> #SIH2026 #GenAI #LLM #AIEngineering #CyberSecurity #MetaMorphAI

---

## Post 3 · Faiqa · System architect
**Order:** third. **Image:** Figure 1 of the architecture note (the numbered pipeline).

> A good architecture is the one you can explain on one page. For Smart India Hackathon, ours had to fit in two.
>
> I was the system architect for MetaMorph-AI. The questions I had to settle early, because everyone else's work depended on them:
>
> - Where does a prompt leave the system? Answer: one place, a router, so there is a single point to review. Restricted data is routed on-device by code, before any provider is chosen.
> - How does a browser follow slow AI work? Answer: a queue (BullMQ on Redis) with one job per format, and Redis Streams for progress, so a reconnecting browser replays what it missed instead of losing it.
> - How do five people's modules stay in sync? Answer: one set of Zod schemas shared by the browser, the API and the engine. There is no hand-written copy to drift.
> - How do we know nobody edited the record? Answer: a SHA-256 hash-chained audit log. Tamper-evident, not tamper-proof, and we say so.
>
> The system is deliberately boring where it can be (Express, PostgreSQL, Redis) and strict where it matters (routing, verification, audit).
>
> [Add one decision you are proud of, or one you changed your mind about.]
>
> Full architecture note and diagrams are in the repo: [LINK]. Thanks to @Rehan Fazal, @Md Fareed Khan, @Farhan Quamar, @Faizan Ahmad Ansari and @Asad.
>
> #SIH2026 #SystemDesign #SoftwareArchitecture #CyberSecurity #TeamStrawHats

---

## Post 4 · Farhan Quamar · Backend
**Order:** fourth. **Image:** a screenshot of a batch with three cards finishing, or the API/queue diagram.

> The part of an AI product nobody sees is the part that decides whether it works: the backend.
>
> For MetaMorph-AI at Smart India Hackathon, I built the server:
>
> - Express 5 API with JWT sessions and three roles (operator, reviewer, admin). An operator cannot approve their own batch.
> - Ingestion of text, PDF (page-aware) and DOCX, split into numbered sentence spans that never change afterwards, so every claim keeps a stable link to its sentence.
> - A BullMQ queue on Redis: one job per format, three running at once. A batch request returns in milliseconds while the work continues.
> - Live progress over WebSocket using Redis Streams, which replays missed events after a dropped connection.
> - PostgreSQL with Prisma, and an append-only audit log where each row stores a SHA-256 hash of the previous one. A database trigger refuses updates and deletes, and an endpoint names the first broken row.
>
> The lesson: reliability is a design choice you make on day one. Streams instead of Pub/Sub, jobs instead of long requests, and one validated contract between browser and server.
>
> [Add one bug or trade-off you remember: for example a rate limit, a port clash, or a queue behaviour.]
>
> Thanks to @Rehan Fazal, @Md Fareed Khan, @Faiqa, @Faizan Ahmad Ansari and @Asad. Repo: [LINK]
>
> #SIH2026 #BackendDevelopment #NodeJS #PostgreSQL #Redis #TeamStrawHats

---

## Post 5 · Faizan Ahmad Ansari · Frontend
**Order:** fifth. **Image:** a 15-second screen recording: click a sentence, the source passage highlights.

> In an AI tool for government security work, the interface has one job: let a person check the AI.
>
> I built the MetaMorph-AI front end for Smart India Hackathon. The idea that shaped everything: every sentence is clickable, and clicking it highlights the exact passage it came from, with the page number for PDFs. Underlines show how far the source supports a claim, and an unsupported one is marked "unverified".
>
> What is in it:
> - Ingest with drag-and-drop upload and three classification tiers (public, internal, restricted), each with its consequence stated plainly.
> - A confirm screen showing the extracted facts beside the source before anything is generated.
> - A live workspace: one card per format, each with its own state (queued, writing, checking, repairing, ready), so one failure never blanks the page.
> - A review flow: submit, approve, or reject with a reason.
> - Built with React 19 and Material UI, with keyboard-operable claims, a mobile layout, and proper error and reconnect states.
>
> Design lesson: a confident-looking interface can make a wrong answer more convincing. We made doubt visible on purpose.
>
> [Add a screen you redesigned, or a UI problem you fixed.]
>
> Thanks to @Rehan Fazal, @Md Fareed Khan, @Faiqa, @Farhan Quamar and @Asad. Repo: [LINK]
>
> #SIH2026 #React #UIDesign #Frontend #CyberSecurity #TeamStrawHats

---

## Post 6 · Asad · Research and documentation
**Order:** last. **Image:** the first page of the architecture note, or the reference list from slide 6.

> Before we wrote a line of code for Smart India Hackathon, we asked a question: how do you prove that an AI's sentence came from its source?
>
> I handled research and documentation for MetaMorph-AI. The research pointed us at evidence tracing and fine-grained provenance: linking each generated sentence back to a source sentence, and critique-and-refine loops that fix a failure once instead of retrying forever. That became our design: a cited fact index, a code verifier, and exactly one targeted repair.
>
> The documentation matters as much as the code. Reviewers need to trust what they read, so we wrote down:
> - a system documentation covering every module, environment setting and test,
> - a two-page architecture note,
> - and a list of known limits, stated plainly: our audit log is tamper-evident, not tamper-proof; masking for internal data is partial; Hindi-specific verification and an offline fallback are still planned.
>
> Writing "what we have not built" next to "what we built" made the project stronger, because every claim on our slides can be checked against the repo.
>
> [Add the paper or idea that influenced you most, and what you did with it.]
>
> Thanks to @Rehan Fazal, @Md Fareed Khan, @Faiqa, @Farhan Quamar and @Faizan Ahmad Ansari. Documentation and code: [LINK]
>
> #SIH2026 #Research #TechnicalWriting #GenAI #CyberSecurity #TeamStrawHats
