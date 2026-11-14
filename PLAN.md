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
