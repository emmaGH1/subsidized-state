# Submission kit

Numbers below are from the committed snapshot (`data/artifact.json`, head block 224,528,333).

- Repo: https://github.com/emmaGH1/subsidized-state
- Live site: https://emmagh1.github.io/subsidized-state/

## X post

Main post (attach the demo video, or the four screenshots listed below):

```
If chain abstraction killed gas burn, what does the NEAR token actually capture?

I measured NEAR's newest sink, state collateral (10 NEAR locked per MB), on intents.near.

It's real. It's growing. It's 313x too small to offset issuance, it's locked not burned, and a treasury bot pays for it.

Built at NEAR HACKATHON. @NEARProtocol #NEARHackathon
```

Reply 1:

```
The receipts, all from mainnet RPC:

• intents.near locks 137,061 NEAR under 13.7 GB of state, up 101k in a year
• supply grew 31.8M in the same year
• it keeps ~500–800 NEAR spare; each time it nears ~504, 300 NEAR arrives from intents_refiller.near. 6 of 6 top-ups in 3.3 days
```

Reply 2:

```
Every number on the site links to the query behind it. One command rebuilds all of it, no API keys:

python3 scripts/rebuild.py

Site: https://emmagh1.github.io/subsidized-state/
Repo: https://github.com/emmaGH1/subsidized-state
```

Screenshots to attach if there is no video (in `site/shots/`): `s1-1280.png` (the question), `sawtooth-1280.png`, `s5-1280.png` (the gap), `s6-1280.png` (verdict).

## 90-second demo script

Record the live site at 1280 wide, then cut to a terminal. One take, no music needed.

| Time | On screen | Say |
|---|---|---|
| 0:00–0:10 | Cover. Hold on the question. | "If chain abstraction killed gas burn, what does the NEAR token actually capture? This is an investment thesis where every number is a query you can run." |
| 0:10–0:22 | Scroll to **the lock**. Let the monolith rise. | "NEAR locks ten NEAR for every megabyte a contract stores. intents.near went from 3.6 to 13.7 gigabytes in a year. 137 thousand NEAR sit under it. Locked, not burned." |
| 0:22–0:40 | Scroll slowly through **the sawtooth** so the figure walks and passes two red risers. Click one riser to open the query strip. | "This is the contract's spare balance. New state eats it. Each time it falls to about 504 NEAR, 300 NEAR arrives. Six times in three days, each from the same account. Here is the receipt." |
| 0:40–0:50 | **who pays**. | "That account is funded by a DAO treasury: 55 thousand NEAR approved in ten proposals. Users pay fees. They don't post the collateral." |
| 0:50–1:05 | **the gap**. Drag the slider to break-even and back. | "To scale: the outline is a year of issuance, 31.8 million NEAR. The speck is the lock. 313 times too small. It would take about 3,175 gigabytes of new state a year to match issuance. Today it's ten." |
| 1:05–1:18 | **verdict**. Click `verify live against mainnet`, wait for the table. | "The verdict: today the token captures a deposit, not a toll. Here's the case for, the case against, what would change my mind, and three tests registered in advance. This button checks the chain from your browser, right now." |
| 1:18–1:30 | Terminal: run `python3 scripts/rebuild.py`, show the three PASS lines. | "And one command rebuilds every number from mainnet, no API keys. Built at NEAR Hackathon." |
