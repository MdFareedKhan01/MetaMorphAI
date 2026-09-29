# Mermaid source for the deck figures

Paste each block into <https://mermaid.live>, or a Markdown preview that renders mermaid.

**Every block starts with an `init` line that forces a light theme in our palette.** Your
earlier renders came out dark, which cannot go on a white slide. Keep that line and the
figure renders the same wherever you paste it.

**Exporting for PowerPoint**

1. mermaid.live → paste → **Actions → PNG**, and set the scale to **3x** before exporting.
   At 1x the text is soft once PowerPoint scales it up.
2. SVG exports sharper still and scales without limit, but PowerPoint sometimes drops the
   fonts. If the SVG looks wrong on the slide, fall back to the 3x PNG.
3. For a transparent background, change `'background':'#FFFFFF'` to `'background':'transparent'`.
4. Everything is 24px-equivalent or larger at 3x. If a judge will read it from across a room,
   raise `'fontSize'` to `18px` and re-export rather than scaling the image up in PowerPoint.

---

## F2 · Whole system architecture

**Goes on slide 3** (left, about two-thirds width) and opens the architecture note. This is
the merge of your tier map, the engine internals, the provider fallback and the write-backs.

```mermaid
%%{init: {'theme':'base','themeVariables':{
  'background':'#FFFFFF',
  'primaryColor':'#FFFFFF',
  'primaryTextColor':'#1B2A3A',
  'primaryBorderColor':'#C7D3E0',
  'lineColor':'#5A6B7B',
  'fontFamily':'IBM Plex Sans, Segoe UI, Arial, sans-serif',
  'fontSize':'16px'
}}}%%
flowchart TB
  WEB["<b>CLIENT · React + Vite</b><br/>Login · Ingest · Confirm · Workspace · Review"]

  PG[("<b>POSTGRESQL</b><br/>sources · artefacts<br/>claims · audit")]
  API["<b>EXPRESS GATEWAY</b><br/>auth · Zod · config merge · sockets"]
  RD[("<b>REDIS</b><br/>BullMQ queue<br/>streams · locks")]

  WK["<b>WORKER ×3 · EGRESS GATE</b><br/>the only path out of the host"]

  subgraph ENG["ENGINE · packages/ai"]
    direction LR
    E1["<b>EXTRACT</b><br/>canonical,<br/>once per source"]
    E2["<b>ROUTE</b><br/>classification<br/>gate"]
    E3["<b>GENERATE</b><br/>one spec<br/>per format"]
    E4["<b>VERIFY</b><br/>regex + lexicon,<br/>in code"]
    E5["<b>REPAIR ×1</b><br/>ready · flagged<br/>· failed"]
    E1 --> E2 --> E3 --> E4 --> E5
  end

  CLOUD[("<b>CLOUD · GROQ</b><br/>public and internal")]
  LOCAL[("<b>ON-DEVICE · OLLAMA</b><br/>restricted, always")]
  CACHE[("<b>CACHED PACK</b><br/>no network, degraded")]

  WEB <== "REST /api/v1, then WebSocket frames" ==> API
  API <--> PG
  API <== "enqueue · XREAD" ==> RD
  API == "one job per format, three at a time" ==> WK
  WK == "extractCanonical · runFormat" ==> E1
  WK -. "artefact, claims, audit row" .-> PG
  WK -. "XADD events" .-> RD
  E2 == "public, internal" ==> CLOUD
  E2 == "restricted" ==> LOCAL
  E2 -. "nothing reachable" .-> CACHE

  style WK fill:#FDEDE6,stroke:#C2410C,stroke-width:4px,color:#C2410C
  style API fill:#FFFFFF,stroke:#0E7490,stroke-width:3px
  style ENG fill:#E6F2F5,stroke:#0E7490,stroke-width:2px
  style LOCAL fill:#E6F2F5,stroke:#0E7490,stroke-width:3px
  style CLOUD fill:#FFFFFF,stroke:#5A6B7B,stroke-width:2px
  style CACHE fill:#FFFFFF,stroke:#5A6B7B,stroke-width:2px
```

**Presenting it:** read top to bottom, then stop on the orange band. One tier can reach a
provider, and the classification check lives inside it. That is the whole security argument,
and it is why the merge was worth doing — in the separate diagrams that fact was split across
two pictures.

---

## F7 · The AI engine

**Goes in the architecture note**, and on slide 3 only if there is room after the screenshot.
The subgraphs carry the point that matters: steps 1–2 run once per source, everything after
runs per format.

```mermaid
%%{init: {'theme':'base','themeVariables':{
  'background':'#FFFFFF',
  'primaryColor':'#FFFFFF',
  'primaryTextColor':'#1B2A3A',
  'primaryBorderColor':'#C7D3E0',
  'lineColor':'#5A6B7B',
  'fontFamily':'IBM Plex Sans, Segoe UI, Arial, sans-serif',
  'fontSize':'15px'
}}}%%
flowchart TB
  subgraph ONCE["ONCE PER SOURCE"]
    direction LR
    A["<b>1 · INGEST + SPANS</b><br/>unpdf, mammoth, UTF-8, CRLF to LF<br/>Intl.Segmenter(sentence), no NLP dep<br/>span_id, start_offset, end_offset, page<br/>SHA-256 source_hash keys the cache"]
    B["<b>2 · CANONICAL EXTRACT</b><br/>z.toJSONSchema(Canonical) in the prompt<br/>Canonical.safeParse, one retry on issues<br/>keepKnownRefs() drops invented span ids<br/>7 field groups, each with source_refs"]
    A --> B
  end

  subgraph PER["PER FORMAT, PER ARTEFACT"]
    C["<b>3 · BUILD PROMPT</b><br/>FormatSpec: role, plan, rules, constraints<br/>buildPrompt: system + canonical block<br/>Draft 2020-12 schema inside the system<br/>source text never enters the system role"]
    D{"<b>4 · ROUTER</b><br/><b>EGRESS GATE</b>"}
    CL["<b>CLOUD ADAPTER</b><br/>groq-sdk generateContent<br/>temperature 0.2<br/>responseMimeType json<br/>throws EgressBlocked if restricted"]
    LO["<b>ON-DEVICE ADAPTER</b><br/>Ollama POST /api/chat, stream false<br/>format: JSON Schema<br/>qwen2.5:7b, num_ctx 8192<br/>AbortSignal.timeout"]
    V["<b>6 · VERIFY — no model</b><br/>parseModelJson takes outermost braces<br/>regex CVE, IPv4, SHA-256, domain, semver<br/>hedge lexicon, English + Devanagari<br/>postHocRefs lexical overlap 0.5 or more"]
    REP["<b>REPAIR</b><br/>revisionNote(prev, findings)<br/>one call, hard cap of two"]
  end

  READY["<b>READY</b><br/>passed or repaired<br/>grounding_score on the card"]
  FLAG["<b>FLAGGED</b><br/>open_issues[] remain<br/>the reviewer decides"]
  FAIL["<b>FAILED</b><br/>QualityError<br/>code SCHEMA_INVALID"]

  B ==> C ==> D
  D == "public / internal<br/>internal masked first" ==> CL
  D == "restricted, rate limit,<br/>or network failure" ==> LO
  CL ==> V
  LO ==> V
  V == "no findings" ==> READY
  V == "findings, first pass" ==> REP
  REP == "second and final call" ==> D
  V -. "findings remain after the repair" .-> FLAG
  V -. "schema still invalid" .-> FAIL

  style D fill:#FDEDE6,stroke:#C2410C,stroke-width:4px,color:#C2410C
  style REP fill:#FDEDE6,stroke:#C2410C,stroke-width:3px
  style V fill:#E6F2F5,stroke:#0E7490,stroke-width:3px
  style LO fill:#E6F2F5,stroke:#0E7490,stroke-width:2px
  style READY fill:#FFFFFF,stroke:#0E7490,stroke-width:3px
  style FLAG fill:#FFFFFF,stroke:#C2410C,stroke-width:3px
  style ONCE fill:#F4F6F9,stroke:#C7D3E0,stroke-width:2px
  style PER fill:#F4F6F9,stroke:#C7D3E0,stroke-width:2px
```

**Three lines in here earn their place in a Q&A**

- **`postHocRefs` lexical overlap** answers *why no RAG?* — one source fits in the context
  window, so citation matching is term overlap. No embeddings, no vector store, nothing to
  search at scale.
- **`6 · VERIFY — no model`** — regex and a lexicon, not a second model grading the first.
  A model grading a model can be wrong in the same direction twice.
- **`keepKnownRefs()`** — the model can invent a span id, and we drop any it invents.
  Saying that is stronger than claiming it never happens.

If it renders too wide, delete the `subgraph ONCE` / `end` lines and put steps 1–2 in a
caption instead.

---

## F1 · The four-word pipeline

Optional. Slide 2 already carries this as a text strip, which reads better than a diagram at
that size. Use this version only in the architecture note, or if the strip will not fit.

```mermaid
%%{init: {'theme':'base','themeVariables':{
  'background':'#FFFFFF',
  'primaryColor':'#FFFFFF',
  'primaryTextColor':'#1B2A3A',
  'primaryBorderColor':'#C7D3E0',
  'lineColor':'#5A6B7B',
  'fontFamily':'IBM Plex Sans, Segoe UI, Arial, sans-serif',
  'fontSize':'17px'
}}}%%
flowchart LR
  S["<b>SOURCE</b><br/>report, advisory,<br/>policy, incident"]
  U["<b>UNDERSTAND</b><br/>sentence spans +<br/>one cited fact index"]
  T["<b>TRANSFORM</b><br/>every format from<br/>that one index"]
  V["<b>VERIFY</b><br/>numbers, hedges, limits<br/>checked in code"]
  P["<b>PROVE</b><br/>click to source,<br/>hash-chained log"]
  H["<b>APPROVED</b><br/>a human signs it off"]

  S ==> U ==> T ==> V ==> P ==> H

  style U fill:#E6F2F5,stroke:#0E7490,stroke-width:3px
  style T fill:#E6F2F5,stroke:#0E7490,stroke-width:3px
  style V fill:#E6F2F5,stroke:#0E7490,stroke-width:3px
  style P fill:#E6F2F5,stroke:#0E7490,stroke-width:3px
  style H fill:#FDEDE6,stroke:#C2410C,stroke-width:3px
```

---

## The ones you already have

These render straight from the guides — no new source needed. Their mermaid is in the
fenced blocks of the files named below.

| Figure | Source | Use it for |
| --- | --- | --- |
| Sequence: one request end to end | Guide B, Step 5 | Architecture note, page 2 |
| Ingestion flow: file type, size gate, spans, canonical | Guide B, Step 4 | Architecture note, page 2 |
| Engine boundary: B's server against D's packages/ai | Guide D, Step 1 | Q&A backup slide |
| Pipeline state machine: ready, flagged, failed | Guide D, Step 7 | Q&A backup slide |
| Provenance interaction: ClaimSpan to SourcePane | Guide C, Step 7 | Q&A backup slide |
| Worker task states · review states · screen flow | Guide B Steps 6 and 9, Guide C Step 1 | Leave in the guides. Correct, and they answer nothing a judge asks |

**Apply the same `init` block to any of them** before exporting for a slide, or they will
render in whatever theme your previewer uses — which is how the dark ones happened.
