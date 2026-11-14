# Subsidized State: What the NEAR Token Captures Under Chain Abstraction

*Data provenance: every figure below comes from `data/artifact.json` (`meta.is_sample` = `false`), anchored at NEAR mainnet head block 224,528,333 (`meta.head_block`) at `2026-11-14T14:44:54Z` (`meta.head_timestamp_utc`), protocol version 88 (`constants.protocol_version`).*

**Answer.** Today the NEAR token captures a deposit, not a toll. State collateral under `intents.near` locks an annualised 101,491.66 NEAR (`gap.lock_near_per_year`) and gas burns 332,163.85 NEAR a year (`gas_burn.burned_near_per_year`), against 31,753,343.43 NEAR of annualised net issuance (`gap.net_issuance_near_per_year`). The larger flow is fees: two fee vaults gained `2,282,273.11 + 1,801,434.08 = 4,083,707.19` NEAR over the same window (`vaults.buybacks.net_change_365d_near`, `vaults.fefunds.net_change_365d_near`), and none of it has been burned. For a holder this means that nothing measured here offsets dilution yet. The case for the token rests on a governance decision about those vaults and on state growing by two orders of magnitude, not on the collateral mechanism as it stands.

The question takes as given that gas burn no longer carries the token. Measured directly, protocol burn runs at an annualised 332,163.85 NEAR (`gas_burn.burned_near_per_year`), or 1.046% of net issuance (`gas_burn.pct_of_net_issuance`). This document measures that level; it has no before-and-after series and does not test whether chain abstraction caused it. The sink examined here is state collateral: 10 NEAR locked per megabyte of contract storage (`constants.near_per_mb`), which now locks 137,060.87 NEAR on `intents.near` (`lock.checkpoints[12].locked_near`). Over the trailing 365.09 days (`lock.growth_365d.days`), that lock grew at an annualised 101,491.66 NEAR (`gap.lock_near_per_year`), making it 312.9 times smaller (`gap.multiple`) than the 31,753,343.43 NEAR of annualised net issuance (`gap.net_issuance_near_per_year`). Furthermore, state collateral is refundable upon state deletion rather than burned, and in our trace window 100% (`sawtooth.from_refiller_pct`) of `intents.near` balance top-ups came from a treasury-funded refiller account rather than end users.

## 1. Claim

*State collateral* is the protocol rule requiring an account to hold native NEAR proportional to its contract storage at `10,000,000,000,000,000,000` yoctoNEAR per byte (`constants.storage_amount_per_byte_yocto`), equal to 10 NEAR per decimal megabyte (`constants.near_per_mb`, 1 MB = 1,000,000 bytes) or 10,000 NEAR per gigabyte (`gap.near_per_gb`, 1 GB = 1,000 MB). *Free balance* is total balance (`amount_near`) minus locked collateral (`locked_near`); writes that push free balance below zero revert.

State collateral on `intents.near` (`lock.account`) is real, monotonic (`lock.monotonic` = `true`), and verifiable from public RPC, yet fails to replace gas burn on three grounds:

1. **Scale.** Annualised collateral growth on `intents.near` is 101,491.66 NEAR (`gap.lock_near_per_year`), or 0.3196% of 365-day annualised net issuance (`gap.lock_pct_of_issuance`). Net issuance is 312.9 times larger (`gap.multiple`), or 320.8 times larger (`gap.multiple_30d`) against 30-day annualised issuance of 32,554,404.72 NEAR (`gap.net_issuance_30d_annualized_near`).
2. **Permanence.** State collateral is locked, not burned: tokens remain in `amount_near` and `total_supply` (`issuance.total_supply_near`) and are refunded upon storage deletion. Only gas burn (`gas_burn.burned_near_per_year`) permanently removes NEAR from supply.
3. **Payer.** Across our 3.334-day trace (`sawtooth.window.days`, blocks 224,030,000 to 224,528,333 in `sawtooth.window`), every *refill*—a free-balance step increase above 100 NEAR (`sawtooth.refills`)—came from `intents_refiller.near` (`sawtooth.from_refiller_pct` = 100%, 6 of 6 in `sawtooth.refill_count`), an account approved for 55,000 NEAR (`payer.approved_to_refiller_near`) across 10 proposals (`payer.approved_to_refiller_count`) from `dll-treasury.sputnik-dao.near` (`payer.treasury.account`).

## 2. Evidence for

### Storage collateral lock (`lock`)

Across 13 checkpoints from block 172,600,000 (`lock.growth_365d.from_block`) to block 224,528,333 (`lock.growth_365d.to_block`) spanning 365.09 days (`lock.growth_365d.days`), `intents.near` added 10,151,666,659 bytes (`lock.growth_365d.bytes`), or 10.149 GB per year (`lock.growth_365d.gb_per_year`). Locked NEAR grew by 101,516.67 NEAR (`lock.growth_365d.near`, annualising to 101,491.66 NEAR/year in `lock.growth_365d.near_per_year`), from 35,544.20 NEAR (`lock.checkpoints[0].locked_near`) to 137,060.87 NEAR (`lock.checkpoints[12].locked_near`), where locked collateral equals 99.55% (`lock.locked_share_of_balance_pct`) of the 137,683.29 NEAR balance (`lock.checkpoints[12].amount_near`).

| # | Block (`lock.checkpoints[].block`) | Timestamp UTC (`.timestamp_utc`) | Storage Bytes (`.storage_usage_bytes`) | Locked NEAR (`.locked_near`) | Balance NEAR (`.amount_near`) | Free NEAR (`.free_near`) |
|---:|---:|---|---:|---:|---:|---:|
| 0 | 172,600,000 | `2025-11-14T12:35:25Z` | 3,554,419,973 | 35,544.20 | 36,278.39 | 734.19 |
| 1 | 176,950,000 | `2025-12-15T15:09:45Z` | 4,945,380,599 | 49,453.81 | 49,995.40 | 541.59 |
| 2 | 181,300,000 | `2026-01-15T19:47:25Z` | 5,642,906,184 | 56,429.06 | 57,088.31 | 659.25 |
| 3 | 185,650,000 | `2026-02-15T10:54:14Z` | 6,401,824,359 | 64,018.24 | 64,609.26 | 591.02 |
| 4 | 190,000,000 | `2026-03-17T23:43:57Z` | 7,021,375,635 | 70,213.76 | 70,848.69 | 634.93 |
| 5 | 194,350,000 | `2026-04-17T05:24:28Z` | 7,762,836,903 | 77,628.37 | 78,180.19 | 551.82 |
| 6 | 198,700,000 | `2026-05-17T10:25:44Z` | 8,443,474,965 | 84,434.75 | 85,056.19 | 621.44 |
| 7 | 203,050,000 | `2026-06-17T05:14:44Z` | 9,185,010,027 | 91,850.10 | 92,472.99 | 622.89 |
| 8 | 207,400,000 | `2026-07-17T20:52:00Z` | 9,942,077,151 | 99,420.77 | 100,026.78 | 606.00 |
| 9 | 211,750,000 | `2026-08-17T17:02:02Z` | 10,789,557,258 | 107,895.57 | 108,522.47 | 626.90 |
| 10 | 216,100,000 | `2026-09-17T19:22:35Z` | 11,900,680,010 | 119,006.80 | 119,573.05 | 566.25 |
| 11 | 220,450,000 | `2026-10-18T02:11:47Z` | 12,801,621,439 | 128,016.21 | 128,689.93 | 673.72 |
| 12 | 224,528,333 | `2026-11-14T14:44:54Z` | 13,706,086,632 | 137,060.87 | 137,683.29 | 622.43 |

### Refill bot and treasury pipeline (`sawtooth`, `payer`)

As user registrations and intent nonces consume storage on `intents.near`, `free_near` drains. Over the 3.334-day trace (`sawtooth.window.days`), `free_near` stayed between 502.86 NEAR (`sawtooth.free_min_near`) and 804.86 NEAR (`sawtooth.free_max_near`). Near a mean floor of 503.70 NEAR (`sawtooth.trigger_free_mean_near`), transfers restored a median 300.14 NEAR (`sawtooth.refill_amount_median_near`), totaling 1,798.16 NEAR (`sawtooth.refilled_near`) across 6 refills (`sawtooth.refill_count`) spaced every 85,045 blocks (`sawtooth.interval_blocks_mean`), or 13.66 hours (`sawtooth.interval_hours_mean`).

| # | Block (`sawtooth.refills[].block`) | Timestamp UTC (`.timestamp_utc`) | Free Before (`.free_before_near`) | Free After (`.free_after_near`) | Net balance change in block (`.amount_near`) | Predecessor (`.predecessor_id`) | Receipt ID (`.receipt_id`) |
|---:|---:|---|---:|---:|---:|---|---|
| 1 | 224,050,442 | `2026-11-11T10:05:19Z` | 503.86 | 801.43 | 297.59 | `intents_refiller.near` | `61KTes18PPG3MGpQGYNA9R7kkhHUWHhiHsRs5UPNAcM8` |
| 2 | 224,133,038 | `2026-11-11T23:35:19Z` | 504.91 | 804.86 | 300.00 | `intents_refiller.near` | `13kHdM2vAvP4siDK3RvPG2V77e47xokKViDZUuuZQFpC` |
| 3 | 224,230,224 | `2026-11-12T15:11:19Z` | 503.36 | 802.77 | 299.41 | `intents_refiller.near` | `DJL72JgQGYwYsRy3RUCunpWPw87b5K9dBTvPadM1PKwy` |
| 4 | 224,313,480 | `2026-11-13T04:29:19Z` | 502.86 | 803.43 | 300.58 | `intents_refiller.near` | `BA5P85EkXsPVDwYc3u485cVcwArh6fnLTTxgePmbhysK` |
| 5 | 224,382,919 | `2026-11-13T15:35:19Z` | 502.92 | 803.19 | 300.28 | `intents_refiller.near` | `4JrTGsZ7mMStswPeqUHCADBfZiPSuZysio644CvPPcP1` |
| 6 | 224,475,667 | `2026-11-14T06:23:19Z` | 504.29 | 804.59 | 300.30 | `intents_refiller.near` | `J4rni9K2ebvKJeEVBocvrrJ1fsw7H5JYhS63YzM77VhW` |

The last numeric column is the change in the account's whole balance in the refill block, so it includes any other movement in that block and can differ from the transfer itself by a few NEAR. Free balance also moves for reasons other than new storage, and the trace does not separate them; it shows only that every step up of more than 100 NEAR was one of these transfers.

All 6 receipts originated from `intents_refiller.near` (`sawtooth.refills[].predecessor_id`), which holds 10,401.61 NEAR (`payer.refiller.balance_near`), has no contract (`payer.refiller.has_contract` = `false`), and holds 12 access keys (`payer.refiller.access_key_count`). Upstream, `dll-treasury.sputnik-dao.near` (`payer.treasury.account`, whose DAO contract reports 133 proposals in `payer.treasury.last_proposal_id`) holds 23,011.11 liquid NEAR (`payer.treasury.liquid_near`), 328,410.57 staked NEAR (`payer.treasury.staked_near`), and 0.00 unstaked NEAR (`payer.treasury.unstaked_near`) in `zavodil.poolv1.near` (`payer.treasury.staking_pool`). The DAO approved 10 native-NEAR transfers to `intents_refiller.near` (`payer.approved_to_refiller_count`)—nine of 5,000 NEAR (proposals 74, 93, 99, 102, 103, 109, 111, 122, 124) and one of 10,000 NEAR (proposal 129)—totaling 55,000 NEAR (`payer.approved_to_refiller_near`) between `2026-07-17T08:04:47Z` and `2026-11-09T17:13:57Z` (`payer.proposals_to_refiller`).

What this data does not show: the refill trace spans 3.334 days (`sawtooth.window.days`) rather than the full year; the link from DAO proposals to individual refills is by account (`intents_refiller.near`) rather than traced coin-by-coin; and users still pay transaction fees—they simply do not post the storage collateral. The earliest approved proposal to the refiller is dated `2026-07-17T08:04:47Z` (`payer.proposals_to_refiller[0].submitted_utc`); who posted the collateral that was locked before that date is not shown, and neither is where the treasury's own NEAR came from.

### Issuance, gas burn, vaults, and system facts (`issuance`, `gas_burn`, `gap`, `vaults`, `facts`)

An *epoch* lasts 43,200 blocks (`constants.epoch_length_blocks`); because validator rewards mint only at epoch boundaries, intra-epoch `total_supply` decline equals exact protocol gas burn (`gas_burn.method`). Across two complete epochs—220.45 NEAR over 24,992.9 seconds (`gas_burn.epochs[0]`, blocks 224,437,937 to 224,481,136) and 255.40 NEAR over 24,630.2 seconds (`gas_burn.epochs[1]`, blocks 224,481,137 to 224,524,336)—plus 70.81 NEAR over 2,276.8 seconds of the partial head epoch (`gas_burn.epochs[2]`, blocks 224,524,337 to 224,528,333), `total_supply` fell by `220.45 + 255.40 + 70.81 = 546.66` NEAR in `24,992.9 + 24,630.2 + 2,276.8 = 51,899.9` seconds, annualising to 332,163.85 NEAR (`gas_burn.burned_near_per_year`; the artifact computes this from unrounded yoctoNEAR values, so the rounded figures shown here reproduce it only to within about 4 NEAR), or 1.046% of net issuance (`gas_burn.pct_of_net_issuance`). Offsetting 31,753,343.43 NEAR of net issuance (`gap.net_issuance_near_per_year`) via storage at 10,000 NEAR/GB (`gap.near_per_gb`) requires 3,175.3 GB/year (`gap.state_gb_per_year_to_offset`) versus 10.149 GB/year today (`gap.state_gb_per_year_now`).

| Metric | Window / Block | Observed NEAR | Annualised NEAR / Year | Share of 365d Net Issuance |
|---|---|---:|---:|---:|
| Head `total_supply` (`issuance.total_supply_near`) | Block 224,528,333 | 1,311,701,823.94 | — | — |
| Max gross issuance at 2.5% (`constants.max_inflation_rate_pct`, `issuance.max_gross_near_per_year`) | Head supply | — | 32,792,545.60 | — |
| Supply 365d ago (`issuance.d365.supply_from_near`) | Block 172,600,000 | 1,279,940,657.69 | — | — |
| Net issuance 365d, 2.4808% (`issuance.d365.net_near`, `.annualized_near`, `.annualized_pct`) | 365.09 days (`issuance.d365.days`) | 31,761,166.25 | 31,753,343.43 | 100% |
| Net issuance 30d, 2.4869% (`issuance.d30.net_near`, `.annualized_near`, `.annualized_pct`) | 29.941 days (`issuance.d30.days`) from block 220,100,000 (`issuance.d30.from_block`) | 2,670,432.77 | 32,554,404.72 | — |
| Protocol gas burn (`gas_burn.epochs[].burned_near`, `gas_burn.burned_near_per_year`) | 51,899.9 seconds across 3 epochs (`gas_burn.epochs[]`) | 546.66 | 332,163.85 | 1.046% (`gas_burn.pct_of_net_issuance`) |
| `intents.near` storage lock (`lock.growth_365d.near`, `gap.lock_near_per_year`) | 365.09 days (`lock.growth_365d.days`) | 101,516.67 | 101,491.66 | 0.3196% (`gap.lock_pct_of_issuance`) |

Fee vaults hold NEAR without burning it (`vaults.buybacks.burned` = `false`, `vaults.fefunds.burned` = `false`). Measured by net balance change (`inflow_method` = `onchain_net_balance_change`), `buybacks.multisignature.near` (`vaults.buybacks.account`, 2 confirmations in `vaults.buybacks.num_confirmations`, 4 keys in `vaults.buybacks.access_key_count`) holds 2,282,273.11 NEAR (`vaults.buybacks.balance_near`), up 2,282,273.11 NEAR over 365.09 days (`vaults.buybacks.net_change_365d_near`, from 0.00 in `vaults.buybacks.balance_365d_ago_near`) and 286,873.37 NEAR over 29.941 days (`vaults.buybacks.net_change_30d_near`, from 1,995,399.74 in `vaults.buybacks.balance_30d_ago_near`). `fefundsadmin.sputnik-dao.near` (`vaults.fefunds.account`, `vaults.fefunds.num_confirmations` unavailable on a Sputnik DAO, 0 keys in `vaults.fefunds.access_key_count`) holds 2,016,572.56 NEAR (`vaults.fefunds.balance_near`), a net change of 1,801,434.08 NEAR over 365.09 days (`vaults.fefunds.net_change_365d_near`, from 215,138.48 in `vaults.fefunds.balance_365d_ago_near`) and 112,166.21 NEAR over 29.941 days (`vaults.fefunds.net_change_30d_near`, from 1,904,406.35 in `vaults.fefunds.balance_30d_ago_near`).

System facts (`facts`): `omft.near` ACL (`sources.omft_acl`) names `omft.near` and `intents.sputnik-dao.near` as `super_admins` (`facts.omft_acl.super_admins`), granting `DAO` to `intents.sputnik-dao.near`, `TokenDeployer` to `bridge-mng.near` and `int-dpl-dao.sputnik-dao.near`, and `TokenDepositer` to `bridge-mng.near` and `int-mnt-dao.sputnik-dao.near` (`facts.omft_acl.roles`). Account `bridge-mng.near` (`facts.bridge_mng.account`) has no contract (`facts.bridge_mng.has_contract` = `false`) and 1 access key (`facts.bridge_mng.access_key_count`), which is 1 full-access key (`facts.bridge_mng.full_access_key_count`). On `v1.signer`, `state()` (`sources.signer_state`) reports threshold 11 (`facts.v1_signer.threshold`) of 16 participants (`facts.v1_signer.participants`). Across 112 `*.omft.near` contracts (`facts.omft_float.contracts_queried`), third-party prices (`facts.omft_float.third_party` = `true`, `1click.chaindefuser.com`) value bridged supply at $238,433,067.15 (`facts.omft_float.total_usd`), including 149,604.22 ZEC (`facts.omft_float.zec_supply`) at $132,027,218.74 (`facts.omft_float.zec_usd`), or 55.37% (`facts.omft_float.zec_share_pct`).

## 3. Evidence against

A serious bull case against this thesis rests on five arguments:

1. **Uninterrupted compounding.** `intents.near` storage rose across all 13 checkpoints (`lock.monotonic` = `true`), adding 101,516.67 NEAR (`lock.growth_365d.near`) on a starting base of 35,544.20 NEAR (`lock.checkpoints[0].locked_near`) while supporting $238,433,067.15 of third-party-valued bridged float (`facts.omft_float.total_usd`). Early network sinks look small against base-layer issuance before compounding. The trailing-year multiple also understates the recent pace: across the last three checkpoint intervals, from `2026-08-17T17:02:02Z` (`lock.checkpoints[9].timestamp_utc`) to the head, the lock grew by `137,060.87 − 107,895.57 = 29,165.30` NEAR in 88.905 days, an annualised 119,738.62 NEAR, which puts net issuance at about 265 times the lock rather than 312.9.
2. **Accumulated fee vaults.** Over 365.09 days (`issuance.d365.days`), `buybacks.multisignature.near` gained 2,282,273.11 NEAR (`vaults.buybacks.net_change_365d_near`) and `fefundsadmin.sputnik-dao.near` gained 1,801,434.08 NEAR (`vaults.fefunds.net_change_365d_near`)—a combined net balance change of `2,282,273.11 + 1,801,434.08 = 4,083,707.19` NEAR, or `4,083,707.19 / 31,761,166.25 = 12.86%` of 365-day net issuance (`issuance.d365.net_near`). Governance could burn those holdings by decision. This is the largest flow in the artifact, about 40 times the lock and 12 times the gas burn, and it is the strongest argument against reading the token through storage alone. What the artifact shows is the balance change; it does not trace where the inflows came from.
3. **Deliberate growth subsidy.** Funding storage from `dll-treasury.sputnik-dao.near` lets users transact without holding native NEAR upfront; an onboarding subsidy can be switched off once liquidity matures.
4. **Mutable protocol rates.** Both `max_inflation_rate_pct` (2.5% in `constants.max_inflation_rate_pct`) and `storage_amount_per_byte_yocto` (`constants.storage_amount_per_byte_yocto`) are protocol parameters; governance cuts to inflation reduce `gap.multiple` directly.
5. **Scope and sample boundaries.** We measure `intents.near` only (`lock.account`), omitting total chain state across `*.omft.near` (112 contracts in `facts.omft_float.contracts_queried`), DeFi, and user accounts. Moreover, `gas_burn` extrapolates from 51,899.9 seconds across two complete epochs and one partial epoch (`gas_burn.epochs[]`), `sawtooth` spans 3.334 days (`sawtooth.window.days`), and `vaults` track net balance changes rather than gross inflows.

## 4. What would change my mind

Four concrete on-chain thresholds in `data/artifact.json` would change our conclusion:

1. **Storage scale (`C1` flips and approaches offset).** `gap.lock_pct_of_issuance` reaches at least `1.0` (falsifying `C1`, `claims[0].checks[0].value`), and `gap.state_gb_per_year_now` rises from 10.149 GB/year (`gap.state_gb_per_year_now`) to at least one-tenth of `gap.state_gb_per_year_to_offset` (`3,175.3 / 10 = 317.53` GB/year, i.e., `gap.lock_pct_of_issuance >= 10` and `gap.multiple <= 10.0`).
2. **User-paid collateral (`C2` flips).** `lock.growth_365d.near` continues growing while `sawtooth.refill_count` drops to `0` (below `3`, `claims[1].checks[0].value`) or `sawtooth.from_refiller_pct` falls well below `100` (`claims[1].checks[1].value`), showing users or solvers posting storage collateral directly rather than relying on `intents_refiller.near`.
3. **Executed vault burns.** Balances in `vaults.buybacks.balance_near` (`2,282,273.11` NEAR) and `vaults.fefunds.balance_near` (`2,016,572.56` NEAR), totaling `2,282,273.11 + 2,016,572.56 = 4,298,845.67` NEAR, are burned so `issuance.d30.annualized_near` falls correspondingly in block headers (`issuance.total_supply_near`).
4. **Execution burn recovery (`C3` flips).** `gas_burn.pct_of_net_issuance` reaches `2.0` or more (falsifying `C3`, `claims[2].checks[0].value`) and sustains above `2.0` across complete 43,200-block epochs (`constants.epoch_length_blocks`, `gas_burn.epochs[].complete` = `true`).

## Tests

Three claims with fixed thresholds, defined in `data/SCHEMA.md` before `scripts/rebuild.py` existed and stored in `tests/claims.json`, evaluated at block 224,528,333 (`meta.head_block`). They were written after exploratory queries had already shown the rough sizes, so they are tripwires for future rebuilds, not blind predictions:

| ID (`claims[].id`) | Statement (`.statement`) | Check (`checks[]`) | Observed (`.observed`) | Falsified If (`.falsified_if`) | Pass (`.pass`) |
|---|---|---|---:|---|---|
| `C1` | State collateral locked by `intents.near` over the trailing 365 days is under 1% of net NEAR issuance over the same window. | `gap.lock_pct_of_issuance < 1` | `0.3196` | `gap.lock_pct_of_issuance` is 1.0 or more. | `true` (PASS) |
| `C2` | Every refill of `intents.near` in the trace window comes from `intents_refiller.near`, and there are at least 3. | `sawtooth.refill_count >= 3`; `sawtooth.from_refiller_pct == 100` | `6`; `100` | Fewer than 3 refills are found, or any refill has a different predecessor, or a receipt cannot be resolved. | `true` (PASS) |
| `C3` | Protocol burn measured from intra-epoch `total_supply` decline is under 2% of net issuance. | `gas_burn.pct_of_net_issuance < 2` | `1.046` | `gas_burn.pct_of_net_issuance` is 2.0 or more. | `true` (PASS) |

## Prior work

Other entries in this hackathon (for example Toll Road, NEAR Toll Audit, Tollkeeper, and Stakeout) already examine intents fees relative to NEAR issuance and staking. What this work adds is the longitudinal storage-collateral ledger on `intents.near`, the block-level refill trace, and on-chain attribution of who pays for that collateral.

## How to check this

Re-derive `data/artifact.json` from public NEAR mainnet RPC with no API keys:

```bash
python3 scripts/rebuild.py
```
