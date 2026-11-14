# Subsidized State: critical review, 14 November 2026

Status: research and design discussion. The published thesis, artifact and site have not been changed. This review proposes a stronger next version; it does not claim the new experiment has been run.

## Judgment

The repository contains a useful, inspectable forensic finding: storage collateral grew at 13 checkpoints, and six detected balance refills in a 3.334-day window have the same immediate predecessor. It is not yet a complete long-term investment case. The key upgrade is to measure the durability and financing of required NEAR balances, then connect those measurements to a conditional investment argument.

The original visual identity is worth retaining. The current information order and layout need substantial changes. A large question, a dense introductory paragraph and a nearly empty first screen make original work look thinner than it is. The desktop opening prototype puts the actual trace and an inspectable receipt above the fold; it is a direction for discussion, not a claim of a finished 9/10 site.

## Evidence reviewed

- Read THESIS.md, README.md, PLAN.md, site/DESIGN.md, artifact fields, relevant rebuilding and evidence-panel code, and the supplied competitive report.
- Refreshed the official directory: 126 entries selecting Investment Thesis, compared with 89 in the supplied morning report. These are directory rows, not a verified count of eligible independent competitors.
- Read six current competitor READMEs: Toll Road, thesis-ci, Stakeout, Hold NEAR, Subsidy Filter and Capture without churn. Inspected the live desktop openings of Toll Road and Stakeout. Their pipelines and results were not independently reproduced.
- Inspected our live page at a 1440×900 CSS viewport. Two isolated assessments covered design and detector/browser evidence; the latter inspected 390×844 and 844×390 plus keyboard behavior. Physical-device touch was not tested.
- Ran the existing 13 offline tests: all pass. These check internal consistency; they do not establish completeness of historical tracing or the validity of economic interpretations. No fresh rebuild was run and the frozen artifact was preserved.

## Substantive weaknesses to fix

1. **The answer is broader than the evidence.** One contract's storage growth cannot establish the token's total value capture. Comparing annual lock growth to annual net issuance establishes relative scale, not an investment valuation or a necessary break-even condition. The opening's “deposit, not a toll” is also too categorical given its own gas and fee discussion.
2. **Payer and funding source are different facts.** A treasury account can be financed by product revenue, grants, old inventory, or other transfers. The trace identifies the immediate payer of detected large refills. It does not establish whether funding is economically external, recurring, subsidy-dependent, or purchased in the market. Sponsored UX can be an intended product feature.
3. **No-burn is not measured.** scripts/rebuild.py line 383 assigns `out["burned"] = False`. Account balances demonstrate NEAR held at those snapshots; net balance changes do not establish the absence of historical burns. Scope the claim to current holdings or trace relevant outflows and outcomes. Net vault increases also are not, by themselves, verified revenue or market purchases.
4. **The user-payment falsifier is invalid.** THESIS.md line 93 interprets zero refills, or a different predecessor, as users/solvers posting collateral. Existing reserves, another sponsor, smaller undetected transfers, or reduced storage growth can generate these observations. Require positive attribution of a replacement funding path; unavailable receipts should be an inconclusive status, not evidence of economic reversal.
5. **Persistence is the missing mechanism.** The artifact has total storage usage, not its composition, retained bytes per operation, cleanup behavior, or the share economically necessary for ongoing service. Thirteen increasing samples do not prove every intervening block grew. Collateral release depends on actual deletion/migration capabilities, not only the generic protocol refund rule.
6. **Window and accounting discipline need improvement.** Gas burn is annualized from about 14.4 hours, including a short partial epoch. Recomputing from the two complete epochs gives approximately 302,408 NEAR/year, versus 332,164 with the partial epoch. This does not overturn the small-burn result but shows why precision should not imply forecast certainty. Net issuance already includes burns; do not subtract the same burns again in a future model. Storage locks, held treasury balances and permanent supply reduction require separate accounting.
7. **Framing needs correction.** “Chain abstraction killed gas burn” is an untested causal premise; the thesis acknowledges it lacks a before/after series. Storage staking itself is not a new protocol mechanism. Use a current, scoped question rather than claiming novelty or causation not demonstrated.

## Competition and our response

| Entry | What the inspected materials contain or claim | Implication for this project |
|---|---|---|
| [Toll Road](https://github.com/NoniWryts/near-toll-road) | Receipt-level buyback data, issuance coverage, scenario models, claims ledger and predictions. | A fee-versus-issuance dashboard would enter occupied territory. Its reported receipt tracing is more direct than our vault balance deltas. |
| [Stakeout](https://github.com/Eloneshj/stakeout) | Full staking-position census, historical epochs and an account-specific stake checker. | A reusable research instrument supplies a reason to return. Our equivalent should be an evidence replay and state-retention experiment. |
| [Capture without churn](https://github.com/AloysJehwin/near-capture-without-churn) | Peer comparisons, uncertainty intervals and hundreds of alternative specifications around the fee switch. | Serious competitors test competing explanations. A single deterministic threshold is not enough to establish economic causation. |
| [thesis-ci](https://github.com/mahadiul-hasan/thesis-ci) | Fourteen claims, source fingerprints, reproduction instructions and an interactive model. | Inspectable numbers and claim tests are competitive baseline features, not uniqueness claims. |
| [Hold NEAR](https://github.com/gourab337/near-holders-claim-thesis) | Explicit rating horizon and triggers, holder-rights analysis, measured resilience and caveats. | We need a clearer bridge from our findings to conditions under which the investment view strengthens or weakens. |
| [Subsidy Filter](https://github.com/adindamochamad/subsidy-filter) | Activity decomposition and a threshold-sensitive burst detector with unresolved attribution. | The word subsidy does not itself distinguish us. Our contribution is specific state financing and retention evidence. |

These are comparisons of inspected materials, not independent endorsements or rankings. The full 126-entry field has not been audited and global uniqueness has not been established. The previous report did not match the directory's Tollkeeper to an economics repo; our current prior-work sentence should not describe it as established fee research without resolving that identity.

## Recommended research direction

Keep the project name **Subsidized State**. Frame the larger contribution as **NEAR's invisible balance sheet**: who needs to hold NEAR after users no longer have to think about it?

Proposed central proposition: chain abstraction can move required NEAR balances to infrastructure operators. Whether this becomes durable token demand depends on state retention, the source of operator funding, and enforceable treatment of revenue. The existing data proves the collateral and immediate refill pattern; it does not yet prove the rest.

### Highest-value experiment: same activity, different memory

The current upstream [nonce implementation](https://github.com/near/intents/blob/dbad9c8a4659e8bd7f42c152ec79448a8e9d281c/contracts/defuse/src/contract/accounts/account/nonces.rs) includes cleanup-by-prefix, legacy-state distinctions and a test that legacy nonces cannot be cleared through that route. The [expirable nonce type](https://github.com/near/intents/blob/dbad9c8a4659e8bd7f42c152ec79448a8e9d281c/contracts/defuse/core/src/nonce/expirable.rs) represents deadlines. This is source-code evidence only; deployed-version parity, publicly reachable cleanup and real usage are unverified.

Next implementation should:

1. Establish the mainnet contract code/version relationship, or explicitly use a pinned upstream version as a separate sandbox scenario.
2. Execute equivalent successful workloads with existing accounts versus new accounts, and supported nonce patterns/retention policies. Hold other inputs fixed. Confirm semantic equivalence and replay protection; do not treat simply deleting protective state as a valid optimization.
3. Measure bytes before/after, collateral required, execution fees, and bytes genuinely reclaimable through supported operations. Separate onboarding state from per-operation state.
4. Publish exact inputs and outputs plus a reproducible harness. Display sandbox results separately from mainnet observations.
5. Use the measured coefficients to explore activity and retention together. When insufficient data exists, show a named assumption instead of a forecast.

Either outcome is informative. If retained state scales robustly with activity, the collateral argument gains substance. If state can be efficiently reused or removed, strong product growth need not create proportionate collateral demand. We should not decide which outcome we want before running the test.

### Financing extension

Trace transfers and successful outcomes along the funding accounts over a broader bounded window. Distinguish approved DAO proposals from executed transfers. Record source classifications with unknown categories and avoid claiming individual coins have provenance beyond observable account flows. Add the vault side only where it can be traced without making this another generic fee dashboard.

Keep four separate measures: required collateral, externally funded purchases where proven, discretionary balances held, and executed permanent supply reduction where proven. Do not sum overlapping quantities into one value-capture score.

### Decision usefulness

Build a scenario explorer around observed required balances and retention, not an ungrounded token price target. Publish clear conditions: which measured changes strengthen the collateral-demand case, which weaken it, which cannot be resolved from the data. A versioned comparison between snapshots, downloadable data and an account/receipt inspector would make this useful after judging. Do not promise automatic ongoing monitoring unless it is actually installed.

## Design decision

Preserve ivory, ink, the subsidy red, lowercase display serif, data-led illustration and a tiny figure where scale needs a human reference. Replace the six compulsory full-screen layouts with an editorial sequence whose height follows its content.

Proposed opening: **someone pays for invisible money.** A short scope statement and the 0.32% scale context sit beside it. The real sawtooth fills the lower part of the first desktop screen. A visible receipt selector exposes the immediate payer without scattering full block IDs over every peak.

Proposed reading sequence: opening finding → funding trace → retained-state experiment → economic significance → fair countercase and decision conditions → evidence/method. Readers should be able to take a short conclusion path, an explanatory path, or inspect exact evidence from the same page. The visual climax should be an actual experiment or data transformation.

The independent design assessment scored applicable usability heuristics 23/40, not an aesthetic or prize score. It found a distinct identity, but delayed significance, oversized headings throughout, excessive provenance annotations and weak wayfinding. Both design and detector/browser passes were independent. No detector overlay was displayed because T3 requires results through its HTML renderer.

### Confirmed UI defects

- At 844×390, sawtooth prose y170–277 intersects a plot beginning y195. The black fill covers the text.
- Keyboard navigation can focus a sawtooth anchor at x−501 without revealing it.
- Red #E3271B on ivory #F3EEE6 has approximately 3.98:1 contrast, insufficient for normal-sized text. Keep the exact red for non-text subsidy marks; use ink for small text or agree a darker text token.
- At 390×844, proposal ticks have 10×22px targets, and some adjacent centers are only 8.7px apart. Provide a spaced selection list.
- The 9 detector warnings include aesthetic false positives: pinned ivory, serif and headline scale are intentional. The detector is not a design verdict.

## Scope and implementation order

The official deadline remains 14 November 2026 at 23:59 UTC; the existing plan reserves the last hour for submission. Highest value: fix unsupported claims; run one bounded retention experiment; rebuild the opening and evidence interaction; then update the thesis, demo and screenshots around the actual result. Additional vault tracing is useful only if it does not crowd out the distinctive experiment and final verification. Avoid a new framework, generic chatbot, decorative 3D scene, or a huge census without time to validate it.

## Sources and artifacts

- [Official event, directory, dates and judging](https://nearhackathon.com/). Code agents screen functionality first; humans decide. Past criteria are guidance, not published current weights. The $55K grand prize is overall, across tracks.
- [Official thesis prompt](https://github.com/nearai/near-hackathon-prompt-examples/blob/main/tracks/02-thesis.md).
- [Pinned upstream nonce source](https://github.com/near/intents/blob/dbad9c8a4659e8bd7f42c152ec79448a8e9d281c/contracts/defuse/src/contract/accounts/account/nonces.rs).
- Local frozen artifact: data/artifact.json at block 224,528,333.
- Discussion prototype: review/opening-direction.html. Desktop and mobile modes, current-desktop comparison, real artifact curve and six selectable receipt records. No simulated research result is presented as measured.

The next discussion is about adopting this research direction and visual hierarchy. It is not a claim that a particular change guarantees a prize or that the proposed experiment is already complete.
