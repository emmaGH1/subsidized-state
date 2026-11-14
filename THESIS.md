# Subsidized State: What the NEAR Token Captures Under Chain Abstraction

*Data provenance: every figure below comes from `data/artifact.sample.json` (`meta.is_sample` = `true`), anchored at NEAR mainnet head block 224,520,502 (`meta.head_block`) at `2026-11-14T13:30:37Z` (`meta.head_timestamp_utc`), protocol version 88 (`constants.protocol_version`).*

Chain abstraction shifted execution onto `intents.near`, leaving annualised protocol gas burn at 315,543.66 NEAR (`gas_burn.burned_near_per_year`), or 0.994% of net issuance (`gas_burn.pct_of_net_issuance`). NEAR's primary new sink is state collateral: 10 NEAR locked per megabyte of contract storage (`constants.near_per_mb`), which now locks 137,032.65 NEAR on `intents.near` (`lock.checkpoints[12].locked_near`). Over the trailing 365 days (`lock.growth_365d.days`), that lock added 101,456.60 NEAR (`lock.growth_365d.near`), making it 312.8 times smaller (`gap.multiple`) than the 31,735,796.94 NEAR of annualised net issuance (`gap.net_issuance_near_per_year`). Furthermore, state collateral is refundable upon state deletion rather than burned, and in our trace window 100% (`sawtooth.from_refiller_pct`) of `intents.near` balance top-ups came from a treasury-funded refiller account rather than end users.

## 1. Claim

*State collateral* is the protocol rule requiring an account to hold native NEAR proportional to its contract storage bytes at `10,000,000,000,000,000,000` yoctoNEAR per byte (`constants.storage_amount_per_byte_yocto`), equal to 10 NEAR per decimal megabyte (`constants.near_per_mb`, where 1 MB = 1,000,000 bytes) or 10,000 NEAR per gigabyte (`gap.near_per_gb`, where 1 GB = 1,000 MB = 10 MB × 1,000). An account's *free balance* is its total balance (`amount_near`) minus locked collateral (`locked_near`); when new state would push free balance below zero, the protocol rejects the write.

State collateral on `intents.near` (`lock.account`) is real, monotonic (`lock.monotonic` = `true`), and verifiable from public RPC, yet it fails to replace gas burn for token holders on three grounds:

1. **Scale.** Annualised collateral growth on `intents.near` is 101,456.60 NEAR (`gap.lock_near_per_year`), or 0.3197% of 365-day annualised net issuance (`gap.lock_pct_of_issuance`). Net issuance is 312.8 times larger (`gap.multiple`), or 317.2 times larger (`gap.multiple_30d`) against 30-day annualised issuance of 32,178,640.75 NEAR (`gap.net_issuance_30d_annualized_near`).
2. **Permanence.** State collateral is locked, not burned. Locked tokens remain inside `amount_near` and `total_supply` (`issuance.total_supply_near`), and are refunded if contract storage is deleted. Only gas burn (`gas_burn.burned_near_per_year`) permanently removes NEAR from supply.
3. **Payer.** Across our 3.516-day trace (`sawtooth.window.days`) from block 224,020,502 (`sawtooth.window.from_block`) to block 224,520,565 (`sawtooth.window.to_block`), every *refill*—defined as a free-balance step increase above 100 NEAR (`sawtooth.refills`)—came from `intents_refiller.near` (`sawtooth.from_refiller_pct` = 100%, 6 of 6 in `sawtooth.refill_count`), an account approved to receive 55,000 NEAR (`payer.approved_to_refiller_near`) across 10 proposals (`payer.approved_to_refiller_count`) from `dll-treasury.sputnik-dao.near` (`payer.treasury.account`).

## 2. Evidence for

### Storage collateral lock (`lock`)

Across 13 checkpoints from block 172,605,418 (`lock.growth_365d.from_block`) to block 224,520,565 (`lock.growth_365d.to_block`) spanning 365.0 days (`lock.growth_365d.days`), `intents.near` added 10,145,660,129 bytes (`lock.growth_365d.bytes`), or 10.146 GB per year (`lock.growth_365d.gb_per_year`). Locked NEAR grew by 101,456.60 NEAR (`lock.growth_365d.near`), from 35,576.05 NEAR (`lock.checkpoints[0].locked_near`) to 137,032.65 NEAR (`lock.checkpoints[12].locked_near`), where locked collateral equals 99.52% (`lock.locked_share_of_balance_pct`) of the 137,690.25 NEAR balance (`lock.checkpoints[12].amount_near`).

| # | Block (`lock.checkpoints[].block`) | Timestamp UTC (`.timestamp_utc`) | Storage Bytes (`.storage_usage_bytes`) | Locked NEAR (`.locked_near`) | Balance NEAR (`.amount_near`) | Free NEAR (`.free_near`) |
|---:|---:|---|---:|---:|---:|---:|
| 0 | 172,605,418 | `2025-11-14T13:30:40Z` | 3,557,604,850 | 35,576.05 | 36,269.53 | 693.49 |
| 1 | 176,931,675 | `2025-12-15T11:47:51Z` | 4,941,475,695 | 49,414.76 | 50,003.13 | 588.37 |
| 2 | 181,257,932 | `2026-01-15T12:42:23Z` | 5,641,199,211 | 56,411.99 | 57,091.12 | 679.13 |
| 3 | 185,584,189 | `2026-02-14T23:59:57Z` | 6,395,013,580 | 63,950.14 | 64,622.02 | 671.88 |
| 4 | 189,910,446 | `2026-03-17T08:36:32Z` | 7,009,286,258 | 70,092.86 | 70,876.64 | 783.77 |
| 5 | 194,236,703 | `2026-04-16T10:03:32Z` | 7,762,521,109 | 77,625.21 | 78,180.58 | 555.37 |
| 6 | 198,562,960 | `2026-05-16T11:14:15Z` | 8,425,244,991 | 84,252.45 | 84,787.55 | 535.10 |
| 7 | 202,889,217 | `2026-06-16T02:13:44Z` | 9,158,683,652 | 91,586.84 | 92,217.94 | 631.10 |
| 8 | 207,215,474 | `2026-07-16T13:22:38Z` | 9,902,575,157 | 99,025.75 | 99,790.01 | 764.26 |
| 9 | 211,541,731 | `2026-08-16T05:52:49Z` | 10,741,861,418 | 107,418.61 | 108,018.69 | 600.08 |
| 10 | 215,867,988 | `2026-09-16T03:37:00Z` | 11,854,382,782 | 118,543.83 | 119,062.91 | 519.08 |
| 11 | 220,194,245 | `2026-10-16T07:42:36Z` | 12,761,434,521 | 127,614.35 | 128,158.98 | 544.63 |
| 12 | 224,520,565 | `2026-11-14T13:30:37Z` | 13,703,264,979 | 137,032.65 | 137,690.25 | 657.60 |

### Refill bot and treasury pipeline (`sawtooth`, `payer`)

As user registrations and intent nonces consume storage on `intents.near`, `free_near` drains. Over the 3.516-day trace (`sawtooth.window.days`), `free_near` stayed between 502.86 NEAR (`sawtooth.free_min_near`) and 804.86 NEAR (`sawtooth.free_max_near`). Near a mean floor of 503.70 NEAR (`sawtooth.trigger_free_mean_near`), transfers restored a median 300.13 NEAR (`sawtooth.refill_amount_median_near`), totaling 1,798.15 NEAR (`sawtooth.refilled_near`) across 6 refills (`sawtooth.refill_count`) spaced every 85,045 blocks (`sawtooth.interval_blocks_mean`), or 13.66 hours (`sawtooth.interval_hours_mean`).

| # | Block (`sawtooth.refills[].block`) | Timestamp UTC (`.timestamp_utc`) | Free Before (`.free_before_near`) | Free After (`.free_after_near`) | Amount NEAR (`.amount_near`) | Predecessor (`.predecessor_id`) | Receipt ID (`.receipt_id`) |
|---:|---:|---|---:|---:|---:|---|---|
| 1 | 224,050,442 | `2026-11-11T10:05:19Z` | 503.86 | 801.43 | 297.59 | `intents_refiller.near` | `61KTes18PPG3MGpQGYNA9R7kkhHUWHhiHsRs5UPNAcM8` |
| 2 | 224,133,038 | `2026-11-11T23:35:19Z` | 504.91 | 804.86 | 299.99 | `intents_refiller.near` | `13kHdM2vAvP4siDK3RvPG2V77e47xokKViDZUuuZQFpC` |
| 3 | 224,230,224 | `2026-11-12T15:11:19Z` | 503.36 | 802.77 | 299.41 | `intents_refiller.near` | `DJL72JgQGYwYsRy3RUCunpWPw87b5K9dBTvPadM1PKwy` |
| 4 | 224,313,480 | `2026-11-13T04:29:19Z` | 502.86 | 803.43 | 300.58 | `intents_refiller.near` | `BA5P85EkXsPVDwYc3u485cVcwArh6fnLTTxgePmbhysK` |
| 5 | 224,382,919 | `2026-11-13T15:35:19Z` | 502.92 | 803.19 | 300.28 | `intents_refiller.near` | `4JrTGsZ7mMStswPeqUHCADBfZiPSuZysio644CvPPcP1` |
| 6 | 224,475,667 | `2026-11-14T06:23:19Z` | 504.29 | 804.59 | 300.30 | `intents_refiller.near` | `J4rni9K2ebvKJeEVBocvrrJ1fsw7H5JYhS63YzM77VhW` |

All 6 receipts originated from `intents_refiller.near` (`sawtooth.refills[].predecessor_id`), which holds 10,401.61 NEAR (`payer.refiller.balance_near`), has no contract (`payer.refiller.has_contract` = `false`), and holds 12 access keys (`payer.refiller.access_key_count`). Upstream, `dll-treasury.sputnik-dao.near` (`payer.treasury.account`, queried through proposal ID 133 in `payer.treasury.last_proposal_id`) holds 23,011.11 liquid NEAR (`payer.treasury.liquid_near`), 328,397.86 staked NEAR (`payer.treasury.staked_near`), and 0.00 unstaked NEAR (`payer.treasury.unstaked_near`) in `zavodil.poolv1.near` (`payer.treasury.staking_pool`). The DAO approved 10 native-NEAR transfers to `intents_refiller.near` (`payer.approved_to_refiller_count`)—nine of 5,000 NEAR (proposals 74, 93, 99, 102, 103, 109, 111, 122, 124) and one of 10,000 NEAR (proposal 129)—totaling 55,000 NEAR (`payer.approved_to_refiller_near`) between `2026-07-17T08:04:47Z` and `2026-11-09T17:13:57Z` (`payer.proposals_to_refiller`).

What this data does not show: the refill trace spans 3.516 days (`sawtooth.window.days`) rather than the full year; the link from DAO proposals to individual refills is by account (`intents_refiller.near`) rather than traced coin-by-coin; and users still pay transaction fees—they simply do not post the storage collateral.

### Issuance, gas burn, vaults, and system facts (`issuance`, `gas_burn`, `gap`, `vaults`, `facts`)

An *epoch* lasts 43,200 blocks (`constants.epoch_length_blocks`); because validator rewards mint only at epoch boundaries, intra-epoch `total_supply` decline equals exact protocol gas burn (`gas_burn.method`). Over 22,449.7 seconds (`gas_burn.epochs[0].seconds`) of the current partial epoch (`gas_burn.epochs[0].complete` = `false`, blocks 224,481,137 to 224,520,502 in `gas_burn.epochs[0]`), `total_supply` fell by 224.63 NEAR (`gas_burn.epochs[0].burned_near`), annualising to 315,543.66 NEAR (`gas_burn.burned_near_per_year`), or 0.994% of net issuance (`gas_burn.pct_of_net_issuance`). Offsetting 31,735,796.94 NEAR of net issuance (`gap.net_issuance_near_per_year`) via storage alone at 10,000 NEAR/GB (`gap.near_per_gb`) requires 3,173.6 GB/year (`gap.state_gb_per_year_to_offset`) versus `intents.near`'s 10.146 GB/year (`gap.state_gb_per_year_now`).

| Metric | Window / Block | Observed NEAR | Annualised NEAR / Year | Share of 365d Net Issuance |
|---|---|---:|---:|---:|
| Head `total_supply` (`issuance.total_supply_near`) | Block 224,520,502 | 1,311,676,335.03 | — | — |
| Max gross issuance at 2.5% (`constants.max_inflation_rate_pct`, `issuance.max_gross_near_per_year`) | Head supply | — | 32,791,908.38 | — |
| Supply 365d ago (`issuance.d365.supply_from_near`) | Block 172,605,418 | 1,279,940,541.85 | — | — |
| Net issuance 365d, 2.4795% (`issuance.d365.net_near`, `.annualized_near`, `.annualized_pct`) | 365.0 days (`issuance.d365.days`) | 31,735,793.18 | 31,735,796.94 | 100% |
| Net issuance 30d, 2.4582% (`issuance.d30.net_near`, `.annualized_near`, `.annualized_pct`) | 30.0 days (`issuance.d30.days`) from block 220,083,813 (`issuance.d30.from_block`) | 2,644,815.69 | 32,178,640.75 | — |
| Protocol gas burn (`gas_burn.epochs[0].burned_near`, `gas_burn.burned_near_per_year`) | 22,449.7 seconds (`gas_burn.epochs[0].seconds`) | 224.63 | 315,543.66 | 0.994% (`gas_burn.pct_of_net_issuance`) |
| `intents.near` storage lock (`lock.growth_365d.near`, `gap.lock_near_per_year`) | 365.0 days (`lock.growth_365d.days`) | 101,456.60 | 101,456.60 | 0.3197% (`gap.lock_pct_of_issuance`) |

Fee vaults hold NEAR without burning it (`vaults.buybacks.burned` = `false`, `vaults.fefunds.burned` = `false`). Measured as net on-chain balance change (`inflow_method` = `onchain_net_balance_change`), `buybacks.multisignature.near` (`vaults.buybacks.account`, 2 confirmations in `vaults.buybacks.num_confirmations`, 4 keys in `vaults.buybacks.access_key_count`) holds 2,281,071.57 NEAR (`vaults.buybacks.balance_near`), up 2,281,071.57 NEAR over 365 days (`vaults.buybacks.net_change_365d_near`, from 0.00 in `vaults.buybacks.balance_365d_ago_near`) and 286,734.72 NEAR over 30 days (`vaults.buybacks.net_change_30d_near`, from 1,994,336.85 in `vaults.buybacks.balance_30d_ago_near`). `fefundsadmin.sputnik-dao.near` (`vaults.fefunds.account`) holds 2,016,267.23 NEAR (`vaults.fefunds.balance_near`), a net on-chain balance change of 1,801,128.75 NEAR over 365 days (`vaults.fefunds.net_change_365d_near`, from 215,138.48 in `vaults.fefunds.balance_365d_ago_near`) and 112,632.91 NEAR over 30 days (`vaults.fefunds.net_change_30d_near`, from 1,903,634.32 in `vaults.fefunds.balance_30d_ago_near`).

Supporting system facts (`facts`): `acl_get_permissioned_accounts` on `omft.near` (`sources.omft_acl`) returns `super_admins` `omft.near` and `intents.sputnik-dao.near` (`facts.omft_acl.super_admins`), grants `DAO` to `intents.sputnik-dao.near`, grants `TokenDeployer` to `bridge-mng.near` and `int-dpl-dao.sputnik-dao.near`, and grants `TokenDepositer` to `bridge-mng.near` and `int-mnt-dao.sputnik-dao.near` (`facts.omft_acl.roles`). Querying `view_account` and `view_access_key_list` on `bridge-mng.near` (`facts.bridge_mng.account`) shows no contract deployed (`facts.bridge_mng.has_contract` = `false`) and 1 access key (`facts.bridge_mng.access_key_count`), which is 1 full-access key (`facts.bridge_mng.full_access_key_count`). On `v1.signer`, `state()` (`sources.signer_state`) reports threshold 11 (`facts.v1_signer.threshold`) of 16 participants (`facts.v1_signer.participants`). Across 112 `*.omft.near` contracts (`facts.omft_float.contracts_queried`), third-party prices (`facts.omft_float.third_party` = `true`, from `1click.chaindefuser.com`) value bridged supply at $239,344,270.55 (`facts.omft_float.total_usd`), with 149,767.91 ZEC (`facts.omft_float.zec_supply`) representing $133,161,641.91 (`facts.omft_float.zec_usd`), or 55.64% (`facts.omft_float.zec_share_pct`).

## 3. Evidence against

A serious bull case against this thesis rests on five arguments:

1. **Uninterrupted compounding.** `intents.near` storage rose across all 13 checkpoints (`lock.monotonic` = `true`), adding 101,456.60 NEAR (`lock.growth_365d.near`) on a starting base of 35,576.05 NEAR (`lock.checkpoints[0].locked_near`) while supporting $239,344,270.55 of third-party-valued bridged float (`facts.omft_float.total_usd`). Early network sinks look small against base-layer issuance before compounding.
2. **Accumulated fee vaults.** Over 365 days, `buybacks.multisignature.near` gained 2,281,071.57 NEAR (`vaults.buybacks.net_change_365d_near`) and `fefundsadmin.sputnik-dao.near` gained 1,801,128.75 NEAR (`vaults.fefunds.net_change_365d_near`)—a combined net balance change of `2,281,071.57 + 1,801,128.75 = 4,082,200.32` NEAR, or `4,082,200.32 / 31,735,793.18 = 12.86%` of 365-day net issuance (`issuance.d365.net_near`). Governance could burn those holdings by decision.
3. **Deliberate growth subsidy.** Funding storage from `dll-treasury.sputnik-dao.near` lets users transact without holding native NEAR upfront; an onboarding subsidy can be switched off once liquidity matures.
4. **Mutable protocol rates.** Both `max_inflation_rate_pct` (2.5% in `constants.max_inflation_rate_pct`) and `storage_amount_per_byte_yocto` (`constants.storage_amount_per_byte_yocto`) are protocol parameters; governance cuts to inflation reduce `gap.multiple` directly.
5. **Scope and sample boundaries.** We measure `intents.near` only (`lock.account`), omitting total chain state across `*.omft.near` (112 contracts in `facts.omft_float.contracts_queried`), DeFi, and user accounts. Moreover, `gas_burn` extrapolates from one 22,449.7-second partial epoch (`gas_burn.epochs[0].seconds`), `sawtooth` spans 3.516 days (`sawtooth.window.days`), and `vaults` track net balance changes rather than gross inflows.

## 4. What would change my mind

Four concrete on-chain thresholds in `data/artifact.json` would change our conclusion:

1. **Storage scale (`C1` flips and approaches offset).** `gap.lock_pct_of_issuance` reaches at least `1.0` (falsifying `C1`, `claims[0].checks[0].value`), and `gap.state_gb_per_year_now` rises from 10.146 GB/year (`gap.state_gb_per_year_now`) to at least one-tenth of `gap.state_gb_per_year_to_offset` (`3,173.6 / 10 = 317.36` GB/year, i.e., `gap.lock_pct_of_issuance >= 10` and `gap.multiple <= 10.0`).
2. **User-paid collateral (`C2` flips).** `lock.growth_365d.near` continues growing while `sawtooth.refill_count` drops to `0` (below `3`, `claims[1].checks[0].value`) or `sawtooth.from_refiller_pct` falls well below `100` (`claims[1].checks[1].value`), showing users or solvers posting storage collateral directly rather than relying on `intents_refiller.near`.
3. **Executed vault burns.** Balances in `vaults.buybacks.balance_near` (`2,281,071.57` NEAR) and `vaults.fefunds.balance_near` (`2,016,267.23` NEAR), totaling `2,281,071.57 + 2,016,267.23 = 4,297,338.80` NEAR, are burned so `issuance.d30.annualized_near` falls correspondingly in block headers (`issuance.total_supply_near`).
4. **Execution burn recovery (`C3` flips).** `gas_burn.pct_of_net_issuance` reaches `2.0` or more (falsifying `C3`, `claims[2].checks[0].value`) and sustains above `2.0` across complete 43,200-block epochs (`constants.epoch_length_blocks`, `gas_burn.epochs[].complete` = `true`).

## Tests

Pre-registered claims in `claims` evaluated at block 224,520,502 (`meta.head_block`):

| ID (`claims[].id`) | Statement (`.statement`) | Check (`checks[]`) | Observed (`.observed`) | Falsified If (`.falsified_if`) | Pass (`.pass`) |
|---|---|---|---:|---|---|
| `C1` | State collateral locked by `intents.near` over the trailing 365 days is under 1% of net NEAR issuance over the same window. | `gap.lock_pct_of_issuance < 1` | `0.3197` | `gap.lock_pct_of_issuance` is 1.0 or more. | `true` (PASS) |
| `C2` | Every refill of `intents.near` in the trace window comes from `intents_refiller.near`, and there are at least 3. | `sawtooth.refill_count >= 3`; `sawtooth.from_refiller_pct == 100` | `6`; `100` | Fewer than 3 refills are found, or any refill has a different predecessor, or a receipt cannot be resolved. | `true` (PASS) |
| `C3` | Protocol burn measured from intra-epoch `total_supply` decline is under 2% of net issuance. | `gas_burn.pct_of_net_issuance < 2` | `0.994` | `gas_burn.pct_of_net_issuance` is 2.0 or more. | `true` (PASS) |

## Prior work

Other entries in this hackathon (for example Toll Road, NEAR Toll Audit, Tollkeeper, and Stakeout) already examine intents fees relative to NEAR issuance and staking. What this work adds is the longitudinal storage-collateral ledger on `intents.near`, the block-level refill trace, and on-chain attribution of who pays for that collateral.

## How to check this

Re-derive `data/artifact.json` from public NEAR mainnet RPC with no API keys:

```bash
python3 scripts/rebuild.py
```
