# site/DESIGN.md — subsidized state

A static, six-screen illustrated essay. Not a dashboard. The reader scrolls through six full-screen
drawings; each drawing is a chart whose marks are values from `data/artifact.json`.

Owner of this file: orchestrator. Owner of everything else in `site/`: builder.

## 0. Non-negotiables

1. **The illustration is the chart.** Every drawn mark (bar, line, square, tick, riser) is positioned or sized by a field of `artifact.json`. The only marks that are not data are the figure (the reader) and hairline rules. Nothing decorative.
2. **Every number is legible and links to its query.** No number is typed into the HTML. Every number is rendered from a field and is a link that opens the query strip (section 0.6).
3. **Three colours.** Ivory `#F3EEE6` (paper), ink `#0A0A0A`, red `#E3271B`. Red is used **only** for the subsidy: the refill risers in section 3, the flow from treasury to refiller to intents in section 4, and the words "treasury" / "refill" where section copy marks them `[red]`. Nothing else is red: not links, not errors, not hover states, not a failing test. Tints are made with ink at reduced opacity only for hairlines (ink at 25%); no greys otherwise.
4. **No** cards, shadows, gradients, rounded corners, icon sets, emoji, chart libraries, generated or stock images, canvas. Charts are hand-built inline SVG paths.
5. **Two typefaces.** Headlines: `Instrument Serif` (regular 400 only), always lowercase. Labels and body: `Inter` (400 and 500), `font-variant-numeric: tabular-nums`. Self-host both as woff2 in `site/fonts/` (SIL OFL) with `font-display: swap`; fallbacks `Georgia, serif` and `Helvetica, Arial, sans-serif`. No third-party requests at load except the artifact JSON.
6. **One screen, one idea.** Each section is `min-height: 100svh`, one headline, one drawing, at most 60 words of copy, and a lot of empty paper.
7. **Mobile first.** Design at 380px wide, then widen. No horizontal page scroll at any width from 320px.
8. **No build step.** Plain `index.html`, `style.css`, `app.js` (ES modules allowed, no dependencies, no bundler). Works from `python3 -m http.server` at the repo root (`http://localhost:8000/site/`) and from GitHub Pages at `/subsidized-state/site/`. All paths relative.
9. **Honest scales.** Bars and areas start at zero. Areas encode quantity by area (side ∝ √value). No truncated axes, no log scales except the slider control (which is a control, not a mark).
10. **Works without motion and without JS data.** `prefers-reduced-motion`: every drawing renders in its final state, no scroll-linked movement. If the artifact fails to load, each section shows its headline and the line "data unavailable: run `python3 scripts/rebuild.py`".

### 0.1 Data loading

```
fetch('../data/artifact.json')  → on 404 or parse error → fetch('../data/artifact.sample.json')
```

If the loaded file has `meta.is_sample === true`, show a one-line strip fixed at the very top, ink text on ivory, hairline under it:
`sample data · block {meta.head_block} · run python3 scripts/rebuild.py for the real artifact`. Build against the sample; the real file drops in with no code change.

`null` values render as the word `unavailable` (still a link to the query). A drawing whose driving array is missing renders the section's fallback line.

### 0.2 Binding syntax used in this document

A few bindings are computed (`lock.checkpoints.length`, `vaults.buybacks.balance_near + vaults.fefunds.balance_near`, the slider readout). Compute them in `app.js` from artifact fields; their query strip shows the formula and the underlying fields.

Copy below uses `{field.path|format}`. Implement one `fmt(value, format)` function and one binder that walks `[data-f]` elements.

| Format | Example | Rule |
|---|---|---|
| `int` | `224,520,502` | integer, thousands separators |
| `near0` | `101,457` | rounded to whole NEAR, thousands separators |
| `near2` | `503.86` | 2 decimals |
| `m1` | `31.7m` | value / 10^6, 1 decimal, suffix `m` |
| `k0` | `137k` | value / 10^3, 0 decimals, suffix `k` |
| `x0` | `313x` | rounded to integer, suffix `x` |
| `pct2` | `0.32%` | 2 decimals, suffix `%` |
| `pct1` | `99.5%` | 1 decimal |
| `gb1` | `13.7` | bytes / 10^9, 1 decimal (unit written in the copy) |
| `num1` | `10.1` | 1 decimal |
| `date` | `14 nov 2026` | from `*_utc`, lowercase month |
| `datetime` | `14 nov 2026, 13:30 utc` | |
| `usd0m` | `$239m` | value / 10^6, 0 decimals |

Array access uses `[0]`, `[-1]` (last).

### 0.3 Type scale

| Role | 380px | 1280px |
|---|---|---|
| Headline (serif, lowercase, `line-height: 0.92`, `letter-spacing: -0.02em`) | `clamp(56px, 17vw, 72px)` | `clamp(120px, 13vw, 200px)` |
| Cover question (serif) | 44px | 104px |
| Lede / section copy (serif, `line-height: 1.25`) | 20px | 26px |
| Label (Inter 500, uppercase off, `letter-spacing: 0.01em`) | 11px | 12px |
| Number in a drawing (Inter 500, tabular) | 11px | 13px |
| Big number (serif) | 64px | 140px |

Headlines are allowed to run off the grid and to be partly covered by ink shapes. Body copy never is.
Page gutter: 16px at 380, 48px at 1280. Copy column max 34ch on mobile, 30ch on desktop, set bottom-left or top-left, never centred.

### 0.4 Ink

One `<svg width="0" height="0">` at the top of `<body>` defines:

- `#ink-edge`: `feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"` → `feDisplacementMap scale="5"`. Applied to large filled shapes (monolith, ground mass, squares). Makes edges look brushed.
- `#ink-line`: same with `baseFrequency="0.9"`, `scale="1.6"`. Applied to strokes (ground line, flow lines) so they wobble like a pen line.
- `#paper`: optional, a single full-page `feTurbulence` grain rect at 4% opacity, `pointer-events: none`. Drop it if it costs frames on mobile.

Filters are applied to static groups only. Never animate a filtered element's geometry every frame on mobile; move it with `transform` or animate a `clip-path` on a parent.
Text is never filtered. Number labels sit outside filtered groups so they stay crisp.

### 0.5 The figure

One `<symbol id="figure" viewBox="0 0 24 48">`: a solid ink silhouette of a person mid-stride, seen from the side, built from simple closed paths (round head, tapered coat-like torso, two legs in a walking V, no face, no hands, no detail). No outline, no filter. Two more symbols: `#figure-stand` (legs together) and `#figure-look-up` (head tilted back). It is reused by `<use>` in every section and is always **tiny**: 20px tall at 380px, 28px tall at 1280px. It never scales with the data. Its smallness against the shapes is the drama.

### 0.6 The query strip (how numbers link to their queries)

Every bound number is `<a class="n" href="#q" data-f="gap.multiple" data-src="view_account_at_block">`, styled as ink text with a 1px ink underline offset 3px (no colour change).
Activating one opens the **query strip**: a full-width band docked to the bottom of the viewport, ivory, with a single 1px ink rule on top (no box, no shadow, no radius), max-height 50svh, containing in Inter 12px:

```
gap.multiple = 312.8
net_issuance_near_per_year / lock_near_per_year                 ← one-line meaning, from the table in data/SCHEMA.md
read at block 224,520,502 · 14 nov 2026, 13:30 utc
curl -s https://archival-rpc.mainnet.fastnear.com -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0",...}'
[copy]  [run in browser]  [close]
```

- The curl is built from `sources[data-src]` (see data/SCHEMA.md, "sources"): resolve `endpoint` `"live"`/`"archival"` to `meta.endpoints.*`, substitute `<block>` and `<account>` from `data-block` / `data-account` attributes on the link (default block: `meta.head_block`; default account: the section's account). `<block>` must be substituted as a bare integer.
- For derived numbers (`gap.*`, `growth_365d.*`, means), show the formula line and the curl of the underlying source.
- `[run in browser]` POSTs the same JSON-RPC from the page and prints the raw result fields that matter (`amount`, `storage_usage`, `total_supply`, …) under the curl. Archival endpoints can answer 429; on any failure print `endpoint refused the request ({status}). the curl above is the same query.`
- Buttons are plain underlined words. `Esc` and `[close]` dismiss. The strip is `role="dialog"`, focus moves into it and returns to the link.

### 0.7 Scroll and motion

- Normal document scroll. No scroll-jacking, no snap on mobile; `scroll-snap-type: y proximity` on ≥ 1024px only.
- Each drawing draws itself once when 35% visible (IntersectionObserver adds `.in`): shapes rise or wipe in via `clip-path`, lines draw via `stroke-dashoffset`. Durations 900–1600ms, `cubic-bezier(.2,.7,.1,1)`. Numbers appear after their mark, by opacity only.
- Section 3 alone is scroll-linked (described there).
- A thin vertical progress mark on the right edge at ≥ 1024px: six 1px ticks, the current one 16px long. No nav bar, no menu, no logo.

### 0.8 Page furniture

- `<title>`: `subsidized state`. Meta description: the cover lede without numbers. Favicon: a 16px ink square on ivory (inline SVG data URI).
- Footer (inside section 6): repo link, `python3 scripts/rebuild.py`, `built at NEAR Hackathon`, link to `THESIS.md` on GitHub, `block {meta.head_block|int} · {meta.head_timestamp_utc|datetime}`.
- Repo URL: `https://github.com/emmaGH1/subsidized-state`.

### 0.9 Build order (builder)

1. Data loader, `fmt`, binder, ink filters, the figure. Then **section 3 (the sawtooth) first**, complete, at 380px and 1280px.
2. Stop and save screenshots of section 3 at 380×800 and 1280×800 to `site/shots/sawtooth-380.png` and `site/shots/sawtooth-1280.png` (headless Chromium via Playwright is installed on this machine; set `INSTABOX_HEADLESS=1`), commit, and report them. Continue building the rest while they are reviewed.
3. Sections 2, 5, 6, 1, 4. Then the query strip on every number, then `verify live`, then motion.

Cut order if time runs short: section 4 animation, then the section 5 slider, then section 2 motion. Never cut section 6.

---

## 1. cover

**Idea:** one question on a lot of paper, one tiny person under it.

**Fields read:** `gap.lock_near_per_year`, `gap.net_issuance_near_per_year`, `gap.multiple`, `constants.near_per_mb`, `meta.head_block`, `meta.head_timestamp_utc`.

**Copy (exact):**

- Kicker (label, top-left): `subsidized state · an investment thesis on near, checked against the chain`
- Question (serif, lowercase): `if chain abstraction killed gas burn, what does the near token actually capture?`
- Thesis (lede, one paragraph):
  `near's newest sink is state collateral: {constants.near_per_mb|int} near locked for every megabyte a contract stores. it is real, growing and measurable. in the last year its largest new source, intents.near, locked {gap.lock_near_per_year|near0} more near while the supply grew by {gap.net_issuance_near_per_year|m1}. that is {gap.multiple|x0} too small to offset issuance. it is locked, not burned. and it is paid by a [red]treasury bot[/red], not by users. this page shows the receipts and what would have to change.`
- Link (label, underlined): `skip to verdict ↓` → `#verdict`
- Bottom-right (label): `block {meta.head_block|int} · {meta.head_timestamp_utc|datetime} · every number is a link to its query`

**Drawing:** a single 1px ink hairline across the full width at 82% of the screen height (the ground, `#ink-line`). `#figure-stand` on it. Nothing else. The headline is the image.

**380px:** kicker at top; question fills the top 55% of the screen, left-aligned, ragged, running to the right gutter; lede under it; ground line near the bottom with the figure at 70% across; `skip to verdict` just above the ground line at left; block line under the ground.

**1280px:** question spans columns 1–10 of 12 at 104px, top-left; lede in columns 1–5 below it; figure on the ground line at column 10; block line bottom-right.

**Scroll:** static. On load the question fades up 12px over 700ms; the figure is already there.

---

## 2. the lock

**Idea:** a black monolith that grew every month for a year, towering over the figure.

**Fields read:** `lock.checkpoints[]` (`block`, `timestamp_utc`, `storage_usage_bytes`, `locked_near`), `lock.growth_365d.near`, `lock.growth_365d.days`, `lock.locked_share_of_balance_pct`, `lock.monotonic`, `constants.near_per_mb`.

**Copy (exact):**

- Headline: `the lock`
- Copy: `every megabyte a contract stores locks {constants.near_per_mb|int} near. intents.near held {lock.checkpoints[0].storage_usage_bytes|gb1} gb of state a year ago and holds {lock.checkpoints[-1].storage_usage_bytes|gb1} gb now. it has {lock.checkpoints[-1].locked_near|near0} near locked under it. that is {lock.locked_share_of_balance_pct|pct1} of everything the contract owns.`
- Under the drawing (label): `locked, not burned. delete the state and the near comes back.`
- Big number (serif), anchored to the top of the last column: `+{lock.growth_365d.near|near0}` with label `near locked in {lock.growth_365d.days|int} days`

**Drawing (SVG):** one `<path>` filled ink with `#ink-edge`: a stepped monolith made of N abutting columns, one per checkpoint, oldest left. Column `i` has height `locked_near[i] / max(locked_near) × H` measured from the ground line; **zero is the ground**. No gaps between columns, so it reads as one mass with a stepped top edge. Build it as a single path (move along the ground, step up and across each column, close) so the ink filter treats it as one shape.
On top of each step, outside the filter: a label `{locked_near|k0}` and under the ground line `{timestamp_utc|date}` (month and year only where space is tight). Each label is a query link with `data-block` = that checkpoint's block, `data-account="intents.near"`, `data-src="view_account_at_block"`.
The figure (`#figure-look-up`) stands on the ground line at the foot of the first column, looking up.

**380px:** headline top-left overlapping the top of the tallest column (ink on ink where they overlap is fine; the headline must sit left of the tall columns so it stays readable: the tall columns are on the right, the headline's two words on the left). Monolith is full-bleed, edge to edge, occupying the bottom 58% of the screen; `H` = 50svh. Labels: only first, middle and last column show the `k0` label; tapping a column shows its label and opens its query. Copy sits in the upper-left empty paper above the short columns. Big number top-right above the last column.

**1280px:** headline top-left at 200px. Monolith spans columns 5–12, `H` = 68svh, bleeding off the right edge. All 13 step labels visible. Copy in columns 1–3, bottom-aligned to the ground line. Figure at column 5.

**Scroll:** on `.in`, the monolith wipes up from the ground (`clip-path: inset(100% 0 0 0)` → `inset(0)`, 1600ms) while the figure stays still; then labels fade in left to right, 40ms apart. Reduced motion: final state.

---

## 3. the sawtooth  (build this first)

**Idea:** the contract's spare balance is a slope the figure walks down. Every time it nears the bottom, the ground is jacked back up in red.

**Fields read:** `sawtooth.trace[]` (`block`, `free_near`), `sawtooth.refills[]` (`block`, `timestamp_utc`, `free_before_near`, `free_after_near`, `amount_near`, `receipt_id`, `predecessor_id`), `sawtooth.refill_count`, `sawtooth.refilled_near`, `sawtooth.refill_amount_median_near`, `sawtooth.trigger_free_mean_near`, `sawtooth.interval_hours_mean`, `sawtooth.window.days`, `sawtooth.free_min_near`, `sawtooth.free_max_near`, `lock.checkpoints[-1].locked_near`.

**Copy (exact):**

- Headline: `the ground it walks on`
- Copy: `intents.near keeps almost nothing spare: between {sawtooth.free_min_near|near0} and {sawtooth.free_max_near|near0} near on top of {lock.checkpoints[-1].locked_near|near0} locked. new state eats the spare. when it falls to about {sawtooth.trigger_free_mean_near|near0}, [red]{sawtooth.refill_amount_median_near|near0} near arrives[/red]. {sawtooth.refill_count|int} times in {sawtooth.window.days|num1} days, about every {sawtooth.interval_hours_mean|int} hours.`
- Floor label (label, on the zero line): `0 near spare: the protocol refuses new state`
- Per-refill label (red, label size, at the top of each riser): `+{amount_near|near0}` and under it in ink `block {block|int}`; desktop adds `{timestamp_utc|datetime}`.
- Caption under the drawing (label): `every riser is one transfer from` [red]`intents_refiller.near`[/red]`. tap one for its receipt.`

**Drawing (SVG):**

- x = block height, linear, from `sawtooth.window.from_block` to `.to_block`. y = `free_near`, linear, **0 at the floor** to `1.25 × free_max_near` at the top of the plot.
- **Ground mass:** one ink-filled path with `#ink-edge`: the area under the trace down to the floor. Its top edge is the trace. Draw the trace between samples as straight segments, **except** at a refill: from the sample before the refill, run straight to `(refill.block − 1, free_before_near)`, then a vertical jump to `(refill.block, free_after_near)`. The schema guarantees both points are in `trace`.
- **Risers:** for each refill a red vertical stroke from `free_before_near` to `free_after_near` at `x(block)`, 3px at 380 and 4px at 1280, `#ink-line`, drawn over the ground mass, plus a 6px red square cap at the top. These are the only red marks.
- **Floor:** 1px ink hairline at y = 0 with the floor label.
- **Trigger line:** a 1px ink hairline at 25% opacity at `trigger_free_mean_near`, label `{sawtooth.trigger_free_mean_near|near0} near` at its left end.
- **Figure:** `#figure` standing on the trace (feet on the top edge of the ground mass), rotated to the local slope by at most 6°.
- Each riser is a link: opens the query strip with `data-src="view_account_at_block"`, `data-block` = the refill block, and additionally prints `receipt {receipt_id}` and `from {predecessor_id}` and the before/after pair (`block − 1`: `free_before_near`, `block`: `free_after_near`).

**380px:** the section is `280svh` tall with a `position: sticky; top: 0; height: 100svh` stage. Headline top-left (3 lines). Plot area: bottom 50% of the stage, full-bleed. The trace is drawn `320vw` wide and pans left as the reader scrolls (translateX from 0 to −220vw mapped to scroll progress through the section); the figure stays at 30% across the screen and walks in place (toggle `#figure`/`#figure-stand` every 24px of pan), riding up and down with the trace height under it. When a riser passes under the figure, the figure is lifted with the ground. Copy sits between headline and plot; it does not pan. Per-refill labels pan with their risers.

**1280px:** section `180svh` tall, sticky stage. Headline top-left at 160px over two lines. The whole trace fits the width (no pan), plot area = bottom 55% of the stage, bleeding off both edges. The figure walks from the left end to the right end with scroll progress. Copy in columns 9–12, top-right. All refill labels visible.

**Reduced motion / no JS scroll:** section is `100svh`, whole trace fitted to the width at both sizes, figure standing on the last sample.

**Scroll:** as above. The ground mass is static geometry moved by `transform` only.

---

## 4. who pays

**Idea:** follow the red line backwards. It ends at a treasury, and the user is not on it.

**Fields read:** `payer.treasury.account`, `.staked_near`, `.liquid_near`, `.staking_pool`, `payer.refiller.account`, `.balance_near`, `.access_key_count`, `payer.proposals_to_refiller[]` (`id`, `amount_near`, `status`, `submitted_utc`), `payer.approved_to_refiller_near`, `payer.approved_to_refiller_count`, `sawtooth.refill_amount_median_near`, `sawtooth.refilled_near`, `sawtooth.window.days`, `sawtooth.from_refiller_pct`, `lock.checkpoints[-1].free_near`.

**Copy (exact):**

- Headline: `who pays`
- Copy: `the refills come from one account, intents_refiller.near. it is funded by a dao treasury that has approved [red]{payer.approved_to_refiller_near|near0} near[/red] to it in {payer.approved_to_refiller_count|int} proposals. in the last {sawtooth.window.days|num1} days, {sawtooth.from_refiller_pct|int}% of top-ups came this way. users pay transaction fees. they do not post the collateral.`
- Node labels (label): 
  - `dll-treasury.sputnik-dao.near` / `{payer.treasury.staked_near|near0} near staked · {payer.treasury.liquid_near|near0} liquid`
  - `intents_refiller.near` / `{payer.refiller.balance_near|near0} near · {payer.refiller.access_key_count|int} keys · no contract`
  - `intents.near` / `{lock.checkpoints[-1].free_near|near0} near spare`
  - `users` / `0 near of collateral in this window`
- Flow labels (red, label): on the first link `{payer.approved_to_refiller_near|near0} near approved`; on the second `{sawtooth.refill_amount_median_near|near0} near per refill · {sawtooth.refilled_near|near0} in {sawtooth.window.days|num1} days`.

**Drawing (SVG):** three ink squares whose **areas** are proportional to NEAR held: treasury (`staked_near + liquid_near`), refiller (`balance_near`), intents spare (`free_near` at head). One shared scale: `side = k × √near`, with `k` chosen so the treasury square is 46vw at 380px and 300px at 1280px. (Expect roughly 100 : 17 : 4 in side length.) `#ink-edge` on the squares.
A red path (`#ink-line`, 2px) leaves the treasury square, enters the refiller square, leaves it and ends at the intents square with a small red square cap. Along the first link, one red tick per **approved** proposal, spaced by `submitted_utc`, tick length ∝ `amount_near` (5,000 → 8px, 10,000 → 16px); each tick is a link (query `dao_get_proposals`, shows `proposal #{id} · {amount_near|near0} near · {submitted_utc|date} · {status}`). Non-approved proposals are not drawn; they are listed in the query strip.
`users`: the figure, standing apart from the three squares on its own short ground hairline, with **no line** connecting it. Its label sits next to it.

**380px:** vertical. Headline top. Treasury square top-left under the headline; red line runs down; refiller square mid-right; red line runs down; intents square bottom-left. The figure stands bottom-right, alone. Copy between headline and treasury or beside the treasury square where there is paper.

**1280px:** horizontal. Treasury square at columns 1–3, refiller at column 6, intents at column 9, all sitting on one ground hairline; red line runs along above the ground between them with the proposal ticks hanging from the first span. The figure at column 12, on a separate short hairline lower than the main ground. Headline top-right, copy under it.

**Scroll:** on `.in`, squares appear (opacity, 400ms), then the red line draws from treasury to intents (`stroke-dashoffset`, 1600ms), then ticks, then labels. Optional loop afterwards: one 4px red square travels the path every 4s (this is the first thing to cut). Reduced motion: final state, no loop.

---

## 5. the gap

**Idea:** the lock and the issuance, drawn to the same scale. One is a speck.

**Fields read:** `gap.lock_near_per_year`, `gap.net_issuance_near_per_year`, `gap.lock_pct_of_issuance`, `gap.multiple`, `gap.state_gb_per_year_now`, `gap.state_gb_per_year_to_offset`, `gap.near_per_gb`, `gas_burn.burned_near_per_year`, `gas_burn.pct_of_net_issuance`, `issuance.d365.from_block`, `issuance.d365.to_block`, `issuance.d365.annualized_pct`.

**Copy (exact):**

- Headline: `the gap`
- Big number (serif): `{gap.multiple|x0}`
- Copy: `in a year the supply grew by {gap.net_issuance_near_per_year|m1} near ({issuance.d365.annualized_pct|pct2}). state collateral at intents.near locked {gap.lock_near_per_year|near0}. gas burned {gas_burn.burned_near_per_year|near0}. the lock is {gap.lock_pct_of_issuance|pct2} of issuance; the burn is {gas_burn.pct_of_net_issuance|pct2}.`
- Square labels (label): `issued · {gap.net_issuance_near_per_year|near0} near a year`, `locked · {gap.lock_near_per_year|near0}`, `burned · {gas_burn.burned_near_per_year|near0}`
- Slider label: `state added per year`
- Slider readout (one line, updates live): `{S} gb a year locks {S × near_per_gb|near0} near: {S × near_per_gb / net_issuance × 100|pct2} of issuance, {S / state_gb_per_year_now|x0} today's pace`
- Slider ticks (label): `today · {gap.state_gb_per_year_now|num1} gb` and `break-even · {gap.state_gb_per_year_to_offset|int} gb`
- Under the slider (label): `break-even means the lock equals issuance. it would still be locked, not burned.`

**Drawing (SVG):** three squares on one area scale, bottom-left corners sharing the ground line:

- **Issued:** a square **outline** (1.5px ink stroke, `#ink-line`, no fill) with area ∝ `net_issuance_near_per_year`. Side = 100% of the content width at 380px (348px), 56svh at 1280px.
- **Locked:** a **filled** ink square (`#ink-edge`), area ∝ the slider value × `near_per_gb` (initially `lock_near_per_year`), sitting inside the outline at its bottom-left corner. At today's value its side is about 1/18 of the outline's side. It must be drawn at true scale, however small. Minimum rendered side 3px.
- **Burned:** a filled ink square, area ∝ `burned_near_per_year`, standing on the ground just outside the outline's bottom-right (or inside bottom-right at 380px), labelled.
- The figure stands on the ground next to the locked square, looking up at the outline (`#figure-look-up`).

**Slider:** a native `<input type="range">` styled as a 1px ink hairline with a 12px ink square thumb (no radius). Log-mapped from `state_gb_per_year_now` (left) to `1.2 × state_gb_per_year_to_offset` (right); initial position = today. Two tick marks under the track for `today` and `break-even`. Dragging grows the locked square inside the outline; at break-even it exactly fills the outline. Keyboard accessible (arrow keys), `aria-valuetext` = the readout. A `reset` word-link returns to today.

**380px:** headline top-left; big number top-right, same baseline; outline square full content width in the middle; copy under the headline, above the square; slider and readout below the square, inside the gutter. If height is short (`< 700px`), copy drops to 16px.

**1280px:** headline and copy in columns 1–4; big number at 200px in column 1–4 under the headline; squares in columns 6–11, ground at 80% height; slider under the copy in columns 1–4.

**Scroll:** on `.in`, the outline draws (`stroke-dashoffset`, 1400ms), then the locked speck appears, then the figure. Nothing moves on scroll. Reduced motion: final state. If the slider is cut: render the today state and the break-even figure as a sentence: `it would take {gap.state_gb_per_year_to_offset|int} gb of new state a year to lock as much as is issued. today it is {gap.state_gb_per_year_now|num1}.`

---

## 6. verdict   (`id="verdict"`)

**Idea:** the answer, the case both ways, the tests, and a button that checks the chain right now.

**Fields read:** `gap.*`, `gas_burn.burned_near_per_year`, `lock.monotonic`, `lock.checkpoints[0]`, `lock.checkpoints[-1]`, `vaults.buybacks.*`, `vaults.fefunds.*`, `claims[]`, `facts.*`, `sawtooth.window.days`, `sawtooth.refill_count`, `payer.approved_to_refiller_near`, `meta.*`.

**Copy (exact):**

- Headline: `verdict`
- The answer (serif, cover-question size, one sentence):
  `today the near token captures a deposit, not a toll: {gap.lock_near_per_year|near0} near a year locked under state and {gas_burn.burned_near_per_year|near0} burned as gas, against {gap.net_issuance_near_per_year|m1} issued.`
- Three text columns (stacked at 380px), each a label-size heading and a short list in Inter 15px; lists use an en dash, no bullets-as-icons:

  **the case for**
  - `the lock is real and protocol-enforced: {lock.checkpoints[-1].locked_near|near0} near under one contract, readable with one rpc call.`
  - `it grew at every one of {lock.checkpoints.length|int} checkpoints across the year, from {lock.checkpoints[0].locked_near|near0} to {lock.checkpoints[-1].locked_near|near0}.`
  - `it scales with stored state, which is what agents and accounts produce, not with gas price.`
  - `fee vaults already hold {vaults.buybacks.balance_near + vaults.fefunds.balance_near|m1} near that governance could burn.`

  **the case against**
  - `it is {gap.multiple|x0} too small: {gap.lock_pct_of_issuance|pct2} of net issuance.`
  - `it is locked, not burned. deleting state returns it.`
  - `it is paid by a [red]treasury[/red]: {sawtooth.refill_count|int} of {sawtooth.refill_count|int} top-ups in {sawtooth.window.days|num1} days came from one funded account.`
  - `the fee vaults are balances, not burns. the buyback vault moves on {vaults.buybacks.num_confirmations|int} of {vaults.buybacks.access_key_count|int} keys.`
  - `this measures one contract. it is not a census of chain state.`

  **what would change my mind**
  - `state growth near {gap.state_gb_per_year_to_offset|int} gb a year instead of {gap.state_gb_per_year_now|num1}; a tenth of that would already matter.`
  - `the refills stop and the lock keeps growing: someone other than the treasury is posting collateral.`
  - `vault balances are burned and total supply falls by the same amount.`
  - `any of the three tests below fails on a rebuild.`

- **the three tests** (label heading: `pre-registered tests · tests/claims.json`). One row per `claims[]` entry, plain text rows separated by hairlines:
  `{id}` · `{statement}` · for each check `{field} {op} {value} — observed {observed}` · result word `pass` or `fail` in ink (serif, 26px). A fail is set in ink like a pass; it is **not** red. The observed value is a query link.
- **plain facts** (label heading: `also true at block {meta.head_block|int}`), one line each, every value a query link, no commentary:
  - `bridge-mng.near holds the TokenDeployer and TokenDepositer roles on omft.near. it has {facts.bridge_mng.access_key_count|int} access key, {facts.bridge_mng.full_access_key_count|int} of them full access, and no contract.`
  - `v1.signer signs with a {facts.v1_signer.threshold|int}-of-{facts.v1_signer.participants|int} threshold.`
  - `omft.near tokens: {facts.omft_float.total_usd|usd0m} across {facts.omft_float.contracts_queried|int} contracts, {facts.omft_float.zec_share_pct|pct1} of it zec (prices from a third-party api).`
  - `buybacks.multisignature.near holds {vaults.buybacks.balance_near|near0} near, {vaults.buybacks.net_change_30d_near|near0} more than 30 days ago. fefundsadmin.sputnik-dao.near holds {vaults.fefunds.balance_near|near0}. neither is burned.`
  Render the roles sentence from `facts.omft_acl.roles` (list the roles whose `grantees` include `bridge-mng.near`); pluralise "key/keys" from the count.
- **verify live** (a plain underlined word-button, serif 26px: `verify live against mainnet`). On click, from the browser, POST to `meta.endpoints.live` (fallback `https://rpc.mainnet.near.org`):
  1. `block {finality: final}` → live height, `total_supply`
  2. `view_account intents.near` → `storage_usage`, `amount` → locked, spare
  3. `view_account buybacks.multisignature.near` → balance
  4. `view_access_key_list bridge-mng.near` → key count
  5. `view_account intents_refiller.near` → balance
  Then print a five-row plain table: `value · artifact (block {meta.head_block}) · live (block {live height}) · difference`. Rows: state locked (near), spare balance (near), total supply (near), buyback vault (near), bridge-mng keys. Under it one generated sentence: `since the artifact was built, intents.near locked {Δlocked|near0} more near in {Δblocks|int} blocks.` While running show `asking mainnet…`. On failure: `mainnet did not answer ({reason}). run python3 scripts/rebuild.py to check from your own machine.` No spinner graphic.
- Prior work (label): `prior work: other entries in this hackathon, including toll road, near toll audit, tollkeeper and stakeout, already cover intents fees against issuance. this adds the storage-collateral ledger, the refill trace and who pays for it.`
- Footer (label): see 0.8.

**Drawing:** this section is typographic. One mark only: the figure (`#figure-stand`) on a ground hairline under the answer sentence, with the section-5 locked square beside it at the same true scale as in section 5 (reuse the scale so the reader recognises the speck). No other drawing.

**380px:** headline; the answer sentence at 34px serif; figure line; three lists stacked with 48px between; tests; facts; verify; prior work; footer. This section may be taller than one screen; its first screen must contain the headline and the full answer sentence.

**1280px:** headline top-left; answer sentence spanning columns 1–9 at 64px; three lists as three text columns (4 columns each) with hairlines between, no boxes; tests full width; facts and verify side by side (facts 1–7, verify 8–12).

**Scroll:** static. Text fades up once on `.in`.

---

## 7. Acceptance checklist (builder runs this before reporting done)

- [ ] At 380×800 and 1280×800, every section shows headline + drawing without overlap of body copy and marks; no horizontal scroll at 320, 380, 768, 1280, 1920.
- [ ] Search of `site/` for digits in HTML copy finds no hardcoded data values (only CSS sizes, the figure paths and font files).
- [ ] Every number on the page is an `a.n` with `data-f`; clicking any of them opens the query strip with a curl that runs as pasted in a terminal.
- [ ] Only three colour values appear in CSS and SVG: `#F3EEE6`, `#0A0A0A`, `#E3271B` (plus ink with opacity). Red appears only on the subsidy marks and `[red]` words.
- [ ] No `border-radius`, `box-shadow`, `gradient`, `<canvas>`, `<img>` (other than none), emoji, or external script/style/font request.
- [ ] Swapping `artifact.sample.json` for a different valid artifact changes every number and every mark with no code change; with both files absent the fallback lines show.
- [ ] `prefers-reduced-motion` renders final states. Keyboard: all number links, the slider, verify and the strip are reachable and operable.
- [ ] `verify live` returns a table against mainnet from a browser.
- [ ] Lighthouse-style sanity: page weight under 400 KB excluding fonts; no layout shift when fonts load (set `size-adjust` or reserve line boxes).
