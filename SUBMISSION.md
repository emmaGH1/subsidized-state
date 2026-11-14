# Submission kit

**Submitted:** 2026-11-14 at 21:41:56 UTC; the submission API returned HTTP 201.
Demo post: https://x.com/_HEISEMMA/status/2121717527407439904
YouTube mirror: https://youtu.be/ErJSoDyeb7o
See `HACKATHON.md` for the final verification record. Do not submit this repository again.

Numbers below are from the committed snapshot (`data/artifact.json`, head block 224,528,333).

- Repo: https://github.com/emmaGH1/subsidized-state
- Live site: https://emmagh1.github.io/subsidized-state/

## X post (final, one long post)

Attach the demo video. This is the version the author chose; the short thread below is the earlier draft.

```
for near hackathon @nearprotocol #nearhackathon i built subsidized state, an investment thesis on near checked against the chain.

on near intents you can swap bitcoin for zcash without ever holding near. no gas to buy, nothing to top up. so i wanted to know what the near token actually captures once users stop paying for gas.

every swap still writes data, and near locks 10 near for every megabyte a contract stores. the contract behind intents now holds 13.7 gb of state, which means 137,061 near is locked underneath it, and that number went up at every checkpoint i took across the past year.

then i noticed something odd. whenever its spare balance runs down to about 504 near, another 300 arrives, and it always comes from the same account. i traced every top-up over the last 30 days on mainnet: 39 of them, all 39 from intents_refiller.near, an account to which a dao treasury has approved 55,000 near.

put it to scale and the picture is clear. for every 100 near of new supply last year, about 1 was burned as gas, about 13 sat in two fee vaults, and 0.32 was locked as state collateral. the lock is real and growing, but issuance is 313x bigger, and it is locked, not burned. so today the token captures a deposit rather than a toll, and i lay out exactly what would have to change for me to be wrong.

every number on the site links to the rpc query behind it, and one command rebuilds all of it from mainnet with no api keys.

site: https://emmagh1.github.io/subsidized-state/
repo: https://github.com/emmagh1/subsidized-state

built at near hackathon. @nearbuilders @nearlegion

curious what would change your mind on near's value capture.
```

## X post (earlier short thread)

Post from your own account and attach the demo video to the main post. Character counts are X's (links count as 23).
Demo video: https://github.com/emmaGH1/subsidized-state/releases/download/v1.0/subsidized-state-demo.mp4

Main post (278 characters):

```
You can swap on NEAR Intents without holding NEAR. What does the token capture?

Its contract locks 137k NEAR as state collateral, and all 39 top-ups in 30 days came from one treasury-funded account.

https://emmagh1.github.io/subsidized-state/

Built at NEAR HACKATHON @NEARProtocol #NEARHackathon
```

Reply 1 (261 characters):

```
Per 100 NEAR of new supply last year:
1.05 burned as gas
12.9 held in two fee vaults
0.32 locked under intents.near's state

The lock is real and growing, but issuance is 313x larger, and it is locked, not burned. Today the token captures a deposit, not a toll.
```

Reply 2 (257 characters):

```
Every number on the site links to the RPC query behind it, and one command rebuilds all of it from mainnet with no API keys:

python3 scripts/rebuild.py

https://github.com/emmaGH1/subsidized-state

What would change your mind on NEAR's value capture? @NearBuilders @NearLegion
```

If there is no video, attach these screenshots from `site/shots/` instead: `s1-1440.png` (the answer), `sawtooth-1280.png`, `s4-1280.png` (who pays), `s6-1280.png` (verdict).

## Submission form

At https://nearhackathon.com/#apply, or through the API described in https://nearhackathon.com/HACKATHON.md. One submission per repository; mistakes are fixed at https://nearhackathon.com/request-changes.

- **Project name:** Subsidized State
- **Track:** Investment Thesis (`thesis`)
- **Repository:** https://github.com/emmaGH1/subsidized-state
- **Demo post:** the link to the main X post above, once it is up
- **What did you build** (1787 characters):

```
Subsidized State is an investment thesis on NEAR that asks: if chain abstraction killed gas burn, what does the NEAR token actually capture?

On NEAR Intents users can swap across chains without holding NEAR, so the usual "usage burns the token" story no longer applies. We measured what is left on NEAR mainnet. Every number is read from public RPC by one Python command (standard library, no API keys) and can be re-checked from the public repo and from a live site where every number links to its query.

Findings, at block 224,528,333: for every 100 NEAR of new supply in the last year, 1.05 was burned as gas, 12.9 was held in two fee vaults, and 0.32 was locked as storage collateral under intents.near, the contract behind NEAR Intents (10 NEAR per MB of state; 137,061 NEAR locked under 13.7 GB, higher at each of 13 checkpoints across the year). Issuance is 313x the lock's growth, and the lock is refundable, not burned. A block-level trace shows who pays for it: all 39 top-ups of intents.near in 30 days (about 300 NEAR each, arriving when its spare balance falls to about 504) came from intents_refiller.near, an account to which a DAO treasury has approved 55,000 NEAR in 10 proposals.

Verdict: today the token captures a deposit, not a toll. The thesis sets out the case for and against, three tests with fixed thresholds that run on every rebuild, and the on-chain changes that would reverse the conclusion: the vaults burning what they hold, a different payer identified by receipt, the lock passing 1% of issuance, or gas burn passing 2%.

How NEAR fits: the thesis is built entirely from NEAR's own mechanisms, measured on mainnet: storage staking, total_supply in block headers, the NEAR Intents contract, Sputnik DAO proposals, a staking pool and executed receipts.
```

## Demo script (the first plan; the final film is narrated and runs 1:55)

Record the live site at 1280 wide, then cut to a terminal. One take, no music needed.

| Time | On screen | Say |
|---|---|---|
| 0:00–0:10 | Cover. Hold on the question. | "If chain abstraction killed gas burn, what does the NEAR token actually capture? This is an investment thesis where every number is a query you can run." |
| 0:10–0:22 | Scroll to **the lock**. Let the monolith rise. | "NEAR locks ten NEAR for every megabyte a contract stores. intents.near went from 3.6 to 13.7 gigabytes in a year. 137 thousand NEAR sit under it. Locked, not burned." |
| 0:22–0:40 | Scroll slowly through **the sawtooth** so the figure walks and passes two red risers. Click one riser to open the query strip. | "This is the contract's spare balance. New state eats it. Each time it falls to about 504 NEAR, 300 NEAR arrives. Six times in three days, each from the same account. Here is the receipt." |
| 0:40–0:50 | **who pays**. | "That account is funded by a DAO treasury: 55 thousand NEAR approved in ten proposals. Users pay fees. They don't post the collateral." |
| 0:50–1:05 | **the gap**. Drag the slider to break-even and back. | "To scale: the outline is a year of issuance, 31.8 million NEAR. The speck is the lock. 313 times too small. It would take about 3,175 gigabytes of new state a year to match issuance. Today it's ten." |
| 1:05–1:18 | **verdict**. Click `verify live against mainnet`, wait for the table. | "The verdict: today the token captures a deposit, not a toll. The fees are bigger, 4.1 million NEAR in two vaults, but held, not burned. Here's the case for, the case against, what would change my mind, and three tests with thresholds fixed in advance. This button checks the chain from your browser, right now." |
| 1:18–1:30 | Terminal: run `python3 scripts/rebuild.py`, show the three PASS lines. | "And one command rebuilds every number from mainnet, no API keys. Built at NEAR Hackathon." |
