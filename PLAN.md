# PLAN — subsidized state

NEAR Hackathon, investment thesis track. Submission due 2026-11-14 23:59 UTC. Internal hard stop 23:00 UTC.

## The question

If chain abstraction killed gas burn, what does the NEAR token actually capture?

## The thesis

NEAR's newest sink, state collateral (10 NEAR per MB), is real, growing and measurable.
It is also roughly 330x too small to offset issuance, it is locked rather than burned,
and it is paid by a treasury bot rather than by users. We show exactly what would have to change.

## Ground rules for content

- Only findings from this session's research, re-derived from mainnet RPC by `scripts/rebuild.py`.
- `bridge-mng.near` has **1** access key. Any other number is wrong.
- No claim that treasury staking yield matches state growth. That line was wrong and is deleted.
- No "zero overlap" claim. Toll Road and similar entries are cited as prior work on issuance.
- Every number shown anywhere (site, THESIS.md, README.md) is a field of `data/artifact.json`.
- Evidence over conviction. An honest small number over hype.

## Agents and file ownership

No agent edits another agent's files. Changes go through the orchestrator.

| Agent | Model | Owns |
|---|---|---|
| orchestrator | Claude Fable | `PLAN.md`, `data/SCHEMA.md`, `site/DESIGN.md`, `README.md`, integration |
| researcher | Gemini Carbon | `scripts/`, `tests/`, `data/` (except `SCHEMA.md`) |
| writer | Gemini Carbon (second agent) | `THESIS.md` |
| builder | Claude Opus | `site/` (except `DESIGN.md`) |
| auditor | Claude Fable, fresh context | reports only, fixes nothing |

All agents work in the same checkout on `main`. Each agent commits only its own paths
(`git add <own paths>`, never `git add -A`) and runs `git pull --rebase` before `git push`.

## Phases (UTC)

| Phase | Owner | Deliverable | Due |
|---|---|---|---|
| 0 | orchestrator | `PLAN.md`, `data/SCHEMA.md`, `data/artifact.sample.json`, public repo | 13:45 |
| 1 | researcher | `scripts/rebuild.py`, `tests/claims.json`, `data/artifact.json` | 16:00 |
| 1b | writer | `THESIS.md` | 16:00 |
| 2 | orchestrator | `site/DESIGN.md` | 16:00 |
| 3 | builder | static site in `site/`, deployed | 20:30 |
| 4 | orchestrator, auditor | `README.md`, X post draft, demo script, audit, fixes | 22:00 |
| submit | user | public repo link and X post | 23:00 |

## Cut order if anything stalls for more than 30 minutes

1. Section 4 animation
2. The slider in section 5
3. Section 2 motion

Never cut: `rebuild.py`, `THESIS.md`, the verdict section, README accuracy.

## Decisions log

Decisions made without asking, per the brief.

- **13:25 Repo.** Public GitHub repo `subsidized-state` under the logged-in account. Site deploys to GitHub Pages from the repo root so `site/` can fetch `../data/artifact.json` with no build step.
- **13:25 RPC endpoints.** FastNEAR free endpoints are primary (`free.rpc.fastnear.com`, `archival-rpc.mainnet.fastnear.com`); `rpc.mainnet.near.org` is fallback because it returned HTTP 429 during research. Archival also rate-limits at 6 parallel requests, so `rebuild.py` must cap concurrency and back off on 429.
- **13:25 Units.** 1 MB = 1,000,000 bytes. The protocol constant is 10^19 yoctoNEAR per byte, which is exactly 10 NEAR per MB in decimal megabytes.
- **13:25 Net issuance denominator.** The headline ratio uses the trailing 365-day `total_supply` change for both sides (storage lock growth over 365 days against supply growth over the same 365 days). The 30-day annualised figure is shown as context.
- **13:25 Third-party data.** The OMFT float in USD needs prices from `1click.chaindefuser.com`. It is optional context: on failure the fields are null and nothing in the thesis depends on them.
- **13:25 Reference frames.** The "study in value" concept frames are not attached to this thread, so `site/DESIGN.md` is written from the style brief in the task (ivory, ink, one red, oversized lowercase serif, tiny lone figure).
- **13:32 Rate limits and the history cache.** Measured during phase 0: the only keyless archival sources that answer are FastNEAR archival RPC, FastNEAR neardata and Tatum's public gateway, and FastNEAR returns HTTP 429 after a burst of about 40 requests and stays closed for a minute or more. A year of checkpoints plus a dense trace plus refill bisection is several hundred historical reads, which cannot fit in 60 seconds under that limit. Decision: historical reads are immutable, so `rebuild.py` commits them to `data/history_cache.json` and a normal run only fetches the head and whatever is new. `--fresh` refetches everything (slow, minutes), `--verify N` spot-checks the cache against the chain. This is disclosed in the README; it is the difference between a rebuild that works for a judge and one that dies on a 429.
- **13:56 The multiple is what the artifact says.** The brief said "about 330x". Measured at head block 224,520,502 over an exact 365-day window it is 312.8x (317.2x against the 30-day annualised issuance). All copy binds to `gap.multiple` and says "over 300x" in prose; nobody hardcodes 330.
- **13:56 Sample artifact.** `data/artifact.sample.json` holds real mainnet values for every field. Its trace has 63 points instead of the 150 the schema requires of the real artifact; everything else is full shape. All three claims pass on it.
- **14:00 Phase 0 closed late (due 13:45).** The 15 minutes went to discovering the archival rate limits before any agent could trip over them. Researcher, writer and builder were launched at 13:56–14:00; `site/DESIGN.md` (phase 2) was committed at 13:59, two hours early, so the net schedule is intact.
- **14:00 Hosting.** GitHub Pages from `main` at the repo root, with `.nojekyll` and a root `index.html` that redirects to `site/`. Live URL: https://emmagh1.github.io/subsidized-state/
- **14:25 Researcher failed; orchestrator took over `scripts/` and `tests/`.** The Gemini Carbon researcher died on a provider 504 after writing only `tests/claims.json`. `rebuild.py` is on the never-cut list and a relaunch risked the same failure with 95 minutes left, so the orchestrator wrote `scripts/rebuild.py` and `tests/test_artifact.py` directly from the phase-0 probe. This breaks the ownership table on purpose.
- **14:40 Schema amended (definitions only, no field changes).** Sticky window anchors, fixed-step checkpoints, and a trace window that may end before the head when rate-limited. Details in `data/SCHEMA.md`, "Amendments". Site and thesis are unaffected: they read the same fields.
- **14:40 Recent history comes from ordinary RPC.** Measured: `near.api.pocket.network` serves state for roughly the last 150,000 blocks with no 429 at 6 parallel requests. `rebuild.py` uses it for anything younger than 140,000 blocks and keeps the rate-limited archival endpoints for older history only.
- **14:46 Artifact frozen at block 224,528,333.** `rebuild.py` rewrites `data/artifact.json` at the current head on every run, so the committed file is the snapshot that `THESIS.md` and `README.md` quote. Nobody reruns the rebuild in this checkout until the final pass; a reader who reruns it gets newer numbers and can restore the snapshot with `git checkout data/`.
