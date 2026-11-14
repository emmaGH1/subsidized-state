# subsidized state

**If chain abstraction killed gas burn, what does the NEAR token actually capture?**

An investment thesis on NEAR, built at NEAR Hackathon (thesis track). Every number in it is re-derived from
NEAR mainnet by one command, with no API keys.

- **Live site:** https://emmagh1.github.io/subsidized-state/
- **The thesis:** [THESIS.md](THESIS.md)
- **The data:** [data/artifact.json](data/artifact.json), described field by field in [data/SCHEMA.md](data/SCHEMA.md)

## The answer in four lines

NEAR's newest sink is state collateral: 10 NEAR locked for every megabyte a contract stores.
We measured it on the largest new source of state, `intents.near`.

1. **It is real and growing.** The locked amount rose at every one of 13 checkpoints across a year.
2. **It is over 300 times too small.** In the committed snapshot the lock grew by about 101 thousand NEAR a year while the supply grew by about 31.8 million.
3. **It is locked, not burned.** Deleting state returns the NEAR. The only true burn is gas, about 1% of issuance.
4. **Users do not pay it.** Every top-up of `intents.near` in the trace window came from one account, `intents_refiller.near`, which a DAO treasury funds.

Other entries in this hackathon (Toll Road, NEAR Toll Audit, Tollkeeper, Stakeout and others) already cover
intents fees against issuance. What this adds is the storage-collateral ledger, the refill trace, and who pays.

## Check it yourself

You need Python 3.9 or newer and an internet connection. Nothing to install.

### 1. Rebuild the data

```
git clone https://github.com/emmaGH1/subsidized-state
cd subsidized-state
python3 scripts/rebuild.py
```

You see a summary and three test lines, in about 15 to 40 seconds:

```
subsidized state: rebuilt data/artifact.json
  head block            224,528,333  (2026-11-14T14:44:54Z)
  intents.near locked   137,060.87 NEAR under 13,706,086,632 bytes
  lock growth           101,491.66 NEAR per year
  net issuance          31,753,343.43 NEAR per year
  lock / issuance       0.3196%  (issuance is 312.9x the lock)
  gas burn              332,163.85 NEAR per year (1.046% of net issuance)
  refills in window     6 over 3.334 days, 100.0% from intents_refiller.near
  network calls 144, cache hits 253, 14.5s
PASS C1  gap.lock_pct_of_issuance < 1.0 (observed 0.3196)
PASS C2  sawtooth.refill_count >= 3 (observed 6), sawtooth.from_refiller_pct == 100 (observed 100.0)
PASS C3  gas_burn.pct_of_net_issuance < 2.0 (observed 1.046)
```

That output is from the committed snapshot. **Your numbers will differ slightly**, because the script reads the
chain at the current head block: the head block, the locked amount and the supply all move every second, and
the refill count changes as the 500,000-block window slides. The three tests should still say `PASS`.
The script rewrites `data/artifact.json` and `data/history_cache.json`; `git checkout data/` restores the snapshot
that `THESIS.md` quotes.

### 2. Run the offline checks

```
python3 -m unittest discover tests
```

You see `Ran 13 tests` and `OK`. These tests recompute every derived number in `data/artifact.json` from its
inputs (locked NEAR from bytes, the gap arithmetic, the claim results) and check the file against the schema.

### 3. Spot-check the history cache against the chain

```
python3 scripts/rebuild.py --verify 5
```

You see five `MATCH` lines and `verify: 5 checked, 0 mismatched`. Each line is a cached historical balance
refetched from an archival node. This can take up to a minute if the archival endpoint is busy.

### 4. Open the site

```
python3 -m http.server 8000
```

Then open http://localhost:8000/site/ . You see six screens: the question, the lock, the sawtooth, who pays,
the gap, and the verdict. Click any number: a strip opens at the bottom with the field name, the block it was
read at and a `curl` you can paste into a terminal. At the bottom of the verdict, `verify live against mainnet`
queries a public RPC node from your browser and prints the artifact's values next to the chain's current ones.

### 5. Check one number by hand

The headline input is one RPC call. This asks an archival node for `intents.near` at the snapshot's head block:

```
curl -s https://archival-rpc.mainnet.fastnear.com -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"query","params":{"request_type":"view_account","block_id":224528333,"account_id":"intents.near"}}'
```

You see `"storage_usage": 13706086632`. Multiply by the protocol's storage price, 10^19 yoctoNEAR per byte
(10 NEAR per MB), and you get the 137,060.87 NEAR in the output above.

## How the rebuild works

`scripts/rebuild.py` is one file, Python standard library only. It reads:

| What | How |
|---|---|
| `intents.near` storage and balance at 13 points across a year | `view_account` at a block height |
| The free balance every 2,500 blocks over the last 500,000 blocks, and every refill located to its exact block | `view_account` at a block height, then bisection |
| The receipt and sender of each refill | the block's executed receipts |
| Treasury stake, refiller balance, DAO proposals | view calls on the staking pool and the Sputnik DAO |
| Net issuance over about 365 and 30 days | `total_supply` in block headers |
| Gas burn | the fall in `total_supply` inside an epoch, where nothing is minted |
| Fee vault balances now, 30 days ago and a year ago | `view_account` |
| `omft.near` roles, `bridge-mng.near` key count, `v1.signer` threshold | view calls and `view_access_key_list` |

**The history cache, and why it exists.** Only two keyless archival endpoints answered when we built this, and
both return HTTP 429 after a burst of roughly 40 requests. A year of checkpoints plus a dense trace is several
hundred historical reads, so an uncached run takes minutes, not seconds. Historical chain state never changes,
so the script stores each historical read in `data/history_cache.json` and a normal run fetches only the head
state and whatever is newer than the cache. Three things keep this honest:

- `--verify N` refetches N random cached entries from the chain and fails on any mismatch.
- `--fresh` ignores the cache and refetches everything. Expect several minutes and some waiting on rate limits.
- Blocks younger than about 140,000 blocks come from ordinary RPC nodes, which do not rate-limit as hard.

If the archival endpoints refuse requests before the trace reaches the head, the script still finishes: it
reports the most recent fully traced window, says so in a `note:` line and in `meta.errors`, and the next run
resumes where it stopped. Optional third-party data (USD prices for the `omft.near` float) becomes `null`
with a note if the API is down. Nothing in the thesis depends on it.

Flags: `--fresh`, `--verify N`, `--budget SECONDS` (time allowed for optional history fetches, default 40),
`--epochs N` (complete epochs to measure gas burn over, default 2).

## The three pre-registered tests

Defined in [tests/claims.json](tests/claims.json) before the data was final, evaluated on every rebuild.

| | Claim | Falsified if |
|---|---|---|
| C1 | State collateral locked by `intents.near` over the trailing year is under 1% of net issuance over the same window | `gap.lock_pct_of_issuance` ≥ 1.0 |
| C2 | Every refill of `intents.near` in the trace window comes from `intents_refiller.near`, and there are at least 3 | fewer than 3 refills, another sender, or an unresolved receipt |
| C3 | Protocol burn measured from intra-epoch supply decline is under 2% of net issuance | `gas_burn.pct_of_net_issuance` ≥ 2.0 |

## What this does not show

- It measures one contract, `intents.near`. It is not a census of all state on NEAR.
- The refill trace covers about 3.3 days, not the year. The link from the DAO's proposals to each refill is by account, not traced transfer by transfer.
- "About a year" means the exact number of days in `issuance.d365.days`; every per-year figure is annualised by it.
- Gas burn is measured over the two most recent complete epochs and the current partial one, then annualised.
- Fee vault figures are net balance changes on chain, not gross inflows.

## Repository map

```
THESIS.md                 the argument: claim, evidence for, evidence against, what would change my mind
scripts/rebuild.py        the one command
data/artifact.json        every number, with the block it was read at
data/SCHEMA.md            every field: meaning, unit, source query
data/history_cache.json   immutable historical reads (see above)
data/artifact.sample.json first hand-assembled snapshot, used to build the site before rebuild.py existed
tests/claims.json         the three pre-registered tests
tests/test_artifact.py    offline consistency checks
site/                     the static site (no build step); site/DESIGN.md is its spec
PLAN.md                   how this was built, and every decision made along the way
```

## How it was made

Built in one day by a team of AI agents directed by a human: an orchestrator that planned, wrote the schema,
the rebuild script and the design spec, a writer for the thesis, a builder for the site, and an auditor that
cloned the repo cold and checked every number. `PLAN.md` has the decisions log, including what went wrong.

Built at NEAR Hackathon.
