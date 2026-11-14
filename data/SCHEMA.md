# data/artifact.json — schema v1.0 (FROZEN, amended 14:40 UTC: see "Amendments")

`scripts/rebuild.py` writes `data/artifact.json`. The site, `THESIS.md` and `README.md` read numbers
only from that file. `data/artifact.sample.json` has the same shape with real mainnet values and
`meta.is_sample = true`; it exists so the site and the thesis can be built before `rebuild.py` lands.

This schema is frozen. Only the orchestrator changes it, and every agent is told when that happens.
Adding a field is a schema change. If a value cannot be fetched, write `null`; never drop the key.

## Conventions

| Suffix / type | Meaning |
|---|---|
| `*_near` | JSON number, in NEAR (yocto / 10^24), rounded to 2 decimals |
| `*_yocto` | string, exact yoctoNEAR as returned by RPC |
| `*_bytes` | integer bytes |
| `*_pct` | JSON number, percent on a 0–100 scale |
| `*_utc` | string, ISO-8601 UTC, `YYYY-MM-DDTHH:MM:SSZ`, taken from the block header timestamp |
| `block`, `*_block` | integer block height the value was read at |
| `null` | value unavailable (endpoint failed or third-party API down). Consumers must render "unavailable" |

- 1 MB = 1,000,000 bytes. 1 GB = 1,000 MB.
- `locked_near = storage_usage_bytes * storage_amount_per_byte_yocto / 10^24` (= bytes × 10^-5).
- `free_near = amount_near - locked_near`. This is the balance the account can spend before the protocol rejects new state.
- "live" endpoint: `https://free.rpc.fastnear.com` (fallback `https://rpc.mainnet.near.org`).
- "archival" endpoints: `https://archival-rpc.mainnet.fastnear.com`, then `https://near-mainnet.gateway.tatum.io`. Both are keyless and both rate-limit hard (HTTP 429 after a burst of roughly 40 requests), so `rebuild.py` throttles and rotates.
- "neardata": `https://mainnet.neardata.xyz/v0/block/<height>` (keyless GET, gzip). One response carries the block header (`total_supply`, `timestamp`), every `account_update` state change in the block, and every executed receipt. The last `account_update` for an account in block `h` equals `view_account` at `block_id = h`. It may be used instead of archival RPC for any historical value; the two agree exactly.
- History is immutable. `rebuild.py` keeps `data/history_cache.json` (raw responses for finalized heights below `head − 1000`) so a normal run stays under 60 seconds and survives rate limits. `--fresh` ignores the cache and refetches everything. `--verify N` refetches N random cached entries and fails loudly on any mismatch.
- A requested height can be a skipped block. Use the next existing height and record the height actually read.
- Annualised = value / window days × 365.

## Top level

```
{
  "schema_version": "1.0",
  "meta":      { ... },
  "constants": { ... },
  "lock":      { ... },   // section 2 of the site
  "sawtooth":  { ... },   // section 3
  "payer":     { ... },   // section 4
  "issuance":  { ... },   // section 5 context
  "gas_burn":  { ... },   // section 5 context
  "vaults":    { ... },   // verdict context
  "gap":       { ... },   // section 5 headline
  "facts":     { ... },   // verdict, plain facts
  "claims":    [ ... ],   // verdict, the 3 tests
  "sources":   { ... }    // every query, by id
}
```

## meta

| Field | Type | Meaning | Source |
|---|---|---|---|
| `generated_at_utc` | string | wall clock when the script finished | local clock |
| `is_sample` | bool | `true` only in `artifact.sample.json` | — |
| `head_block` | int | final block all "now" values are anchored to | `block {finality: final}` |
| `head_timestamp_utc` | string | header timestamp of `head_block` | same |
| `head_hash` | string | hash of `head_block` | same |
| `endpoints.live` | string | live endpoint that answered | — |
| `endpoints.archival` | string | archival endpoint that answered | — |
| `endpoints.history` | string[] | historical sources that answered, e.g. `["archival_rpc", "neardata"]` | — |
| `runtime_seconds` | number | script wall time | — |
| `network_calls` | int | HTTP requests made in this run | — |
| `cache_hits` | int | historical reads served from `data/history_cache.json` | — |
| `fresh` | bool | `true` if run with `--fresh` (no cache) | — |
| `errors` | string[] | one line per value that fell back to `null` | — |

## constants

| Field | Type | Meaning | Source |
|---|---|---|---|
| `storage_amount_per_byte_yocto` | string | protocol storage price, expected `"10000000000000000000"` | `EXPERIMENTAL_protocol_config.runtime_config.storage_amount_per_byte` |
| `near_per_mb` | number | derived, expected `10.0` | derived |
| `max_inflation_rate_pct` | number | protocol ceiling on yearly issuance | `EXPERIMENTAL_protocol_config.max_inflation_rate` (num/den × 100) |
| `protocol_version` | int | | same |
| `epoch_length_blocks` | int | | same |

## lock — intents.near state collateral over a year

| Field | Type | Meaning |
|---|---|---|
| `account` | string | `"intents.near"` |
| `checkpoints` | array, ≥ 13, oldest first | 12 evenly spaced heights starting at the `d365` anchor, then `head_block` |
| `checkpoints[].block` | int | height read |
| `checkpoints[].timestamp_utc` | string | header timestamp of that block |
| `checkpoints[].storage_usage_bytes` | int | `view_account.storage_usage` |
| `checkpoints[].locked_near` | number | derived |
| `checkpoints[].amount_near` | number | `view_account.amount` |
| `checkpoints[].free_near` | number | derived |
| `growth_365d.from_block`, `.to_block` | int | first and last checkpoint |
| `growth_365d.days` | number | exact days between the two header timestamps |
| `growth_365d.bytes` | int | storage growth |
| `growth_365d.near` | number | locked growth |
| `growth_365d.near_per_year` | number | annualised |
| `growth_365d.gb_per_year` | number | annualised, bytes / 10^9 |
| `locked_share_of_balance_pct` | number | `locked_near / amount_near × 100` at head |
| `monotonic` | bool | `storage_usage_bytes` strictly increases across all checkpoints |
| `sources` | string[] | `["view_account_at_block", "block_header_at_height"]` |

## sawtooth — free balance of intents.near and every refill

| Field | Type | Meaning |
|---|---|---|
| `account` | string | `"intents.near"` |
| `window.from_block`, `.to_block` | int | `to_block = head_block` (or the last fully traced block if rate limits stop the run, with a line in `meta.errors`), `from_block ≈ to_block − 500000` |
| `window.days` | number | from header timestamps |
| `trace` | array, ≥ 150, ascending by block | one sample every 2,500 blocks (heights that are multiples of 2,500), the window end, plus the block before and the block of every refill |
| `trace[].block` | int | |
| `trace[].free_near` | number | derived from `view_account` at that block |
| `refills` | array, ascending | every step up in free balance of more than 100 NEAR inside the window, located to the exact block by bisection |
| `refills[].block` | int | first block where the higher balance is visible |
| `refills[].timestamp_utc` | string | |
| `refills[].free_before_near` | number | free balance at `block − 1` |
| `refills[].free_after_near` | number | free balance at `block` |
| `refills[].amount_near` | number | `amount` at `block` minus `amount` at `block − 1` |
| `refills[].receipt_id` | string \| null | receipt that carried the transfer, found in the executed receipts of `block` (neardata `receipt_execution_outcomes`, or the RPC `chunk` method): `receiver_id = intents.near` with a `Transfer` action |
| `refills[].predecessor_id` | string \| null | `predecessor_id` of that receipt |
| `refill_count` | int | `len(refills)` |
| `refilled_near` | number | sum of `amount_near` |
| `refill_amount_median_near` | number | |
| `trigger_free_mean_near` | number | mean of `free_before_near` |
| `interval_blocks_mean` | number \| null | mean gap between consecutive refills |
| `interval_hours_mean` | number \| null | same, from timestamps |
| `from_refiller_pct` | number \| null | share of refills whose `predecessor_id` is `intents_refiller.near`; `null` if no receipt could be resolved |
| `free_min_near`, `free_max_near` | number | over `trace` |
| `sources` | string[] | `["view_account_at_block", "block_header_at_height", "neardata_block"]` |

## payer — who funds the refills

| Field | Type | Meaning | Source id |
|---|---|---|---|
| `treasury.account` | string | `"dll-treasury.sputnik-dao.near"` | |
| `treasury.liquid_near` | number | `view_account.amount` at head | `view_account` |
| `treasury.staking_pool` | string | `"zavodil.poolv1.near"` | |
| `treasury.staked_near` | number | `get_account.staked_balance` | `pool_get_account` |
| `treasury.unstaked_near` | number | `get_account.unstaked_balance` | `pool_get_account` |
| `treasury.last_proposal_id` | int | `get_last_proposal_id`: the DAO's proposal count (ids run from 0 to this minus 1) | `dao_get_proposals` |
| `refiller.account` | string | `"intents_refiller.near"` | |
| `refiller.balance_near` | number | | `view_account` |
| `refiller.access_key_count` | int | | `view_access_key_list` |
| `refiller.has_contract` | bool | `code_hash != "1111…1111"` | `view_account` |
| `proposals_to_refiller` | array | every `Transfer` proposal on the treasury DAO with `receiver_id = intents_refiller.near` and native NEAR (`token_id = ""`) | `dao_get_proposals` |
| `proposals_to_refiller[].id` | int | | |
| `proposals_to_refiller[].amount_near` | number | | |
| `proposals_to_refiller[].status` | string | e.g. `"Approved"` | |
| `proposals_to_refiller[].submitted_utc` | string | from `submission_time` (ns) | |
| `proposals_to_refiller[].description` | string | first 120 chars | |
| `approved_to_refiller_near` | number | sum over `status == "Approved"` | derived |
| `approved_to_refiller_count` | int | | derived |
| `sources` | string[] | `["view_account", "pool_get_account", "dao_get_proposals", "view_access_key_list"]` | |

## issuance — total_supply from block headers

`d365` and `d30` have the same shape.

| Field | Type | Meaning |
|---|---|---|
| `total_supply_near` | number | header `total_supply` at `head_block` |
| `d365.from_block`, `.to_block` | int | the window anchor (see Amendments: a grid block within 5 days of head − 365 d, 2 days for `d30`), and `head_block` |
| `d365.days` | number | exact, from timestamps |
| `d365.supply_from_near`, `.supply_to_near` | number | |
| `d365.net_near` | number | supply change. Net of everything the protocol burned in the window |
| `d365.annualized_near` | number | |
| `d365.annualized_pct` | number | `annualized_near / supply_from_near × 100` |
| `max_gross_near_per_year` | number | `total_supply_near × max_inflation_rate_pct / 100` |
| `sources` | string[] | `["block_header_at_height", "protocol_config"]` |

## gas_burn — measured, not modelled

Inside an epoch no NEAR is minted, so `total_supply` in block headers only falls. The fall is what the protocol burned.

| Field | Type | Meaning |
|---|---|---|
| `method` | string | one sentence describing the measurement |
| `epochs` | array, ≥ 1 | most recent epochs measured (the current partial epoch is allowed and flagged) |
| `epochs[].first_block`, `.last_block` | int | first block of the epoch and last block read inside the same epoch |
| `epochs[].complete` | bool | `false` for the current partial epoch |
| `epochs[].supply_first_yocto`, `.supply_last_yocto` | string | header `total_supply` |
| `epochs[].burned_near` | number | first − last |
| `epochs[].seconds` | number | between the two header timestamps |
| `burned_near_per_year` | number | Σ burned / Σ seconds × 31,536,000 |
| `pct_of_net_issuance` | number | `burned_near_per_year / issuance.d365.annualized_near × 100` |
| `sources` | string[] | `["validators_epoch_start", "block_header_at_height"]` |

## vaults — where captured fees sit

`buybacks` (`buybacks.multisignature.near`) and `fefunds` (`fefundsadmin.sputnik-dao.near`) have the same shape.

| Field | Type | Meaning |
|---|---|---|
| `account` | string | |
| `balance_near` | number | `view_account.amount` at head |
| `balance_30d_ago_near` | number \| null | same at `issuance.d30.from_block` |
| `balance_365d_ago_near` | number \| null | same at `issuance.d365.from_block` (`0` if the account did not exist) |
| `net_change_30d_near`, `net_change_365d_near` | number \| null | derived |
| `inflow_method` | string | `"onchain_net_balance_change"`. Gross inflows are not reconstructed |
| `num_confirmations` | int \| null | `buybacks` only: `get_num_confirmations` |
| `access_key_count` | int \| null | `view_access_key_list` |
| `burned` | bool | always `false`: both are spendable balances, counted in `total_supply` |
| `sources` | string[] | `["view_account", "view_account_at_block", "multisig_confirmations", "view_access_key_list"]` |

## gap — the headline arithmetic

| Field | Type | Meaning |
|---|---|---|
| `lock_near_per_year` | number | `lock.growth_365d.near_per_year` |
| `net_issuance_near_per_year` | number | `issuance.d365.annualized_near` |
| `lock_pct_of_issuance` | number | first / second × 100 |
| `multiple` | number | second / first, 1 decimal |
| `state_gb_per_year_now` | number | `lock.growth_365d.gb_per_year` |
| `state_gb_per_year_to_offset` | number | `net_issuance_near_per_year / (near_per_mb × 1000)` |
| `near_per_gb` | number | `near_per_mb × 1000`, expected `10000` |
| `net_issuance_30d_annualized_near` | number | `issuance.d30.annualized_near`, context |
| `multiple_30d` | number | `net_issuance_30d_annualized_near / lock_near_per_year` |

The slider on the site computes `slider_gb × near_per_gb / net_issuance_near_per_year`.

## facts — stated plainly, no interpretation

| Field | Type | Meaning | Source id |
|---|---|---|---|
| `omft_acl.super_admins` | string[] | | `omft_acl` |
| `omft_acl.roles` | object | role name → `{admins: string[], grantees: string[]}` | `omft_acl` |
| `bridge_mng.account` | string | `"bridge-mng.near"` | |
| `bridge_mng.access_key_count` | int | expected `1` | `view_access_key_list` |
| `bridge_mng.full_access_key_count` | int | | `view_access_key_list` |
| `bridge_mng.has_contract` | bool | | `view_account` |
| `v1_signer.threshold` | int | `state().Running.parameters.threshold` | `signer_state` |
| `v1_signer.participants` | int | number of participants | `signer_state` |
| `omft_float.contracts_queried` | int \| null | `*.omft.near` tokens with a supply read | `ft_total_supply` |
| `omft_float.total_usd` | number \| null | Σ supply × third-party price | `oneclick_tokens` (third party) |
| `omft_float.zec_supply` | number \| null | `zec.omft.near` supply in ZEC | `ft_total_supply` |
| `omft_float.zec_usd` | number \| null | | third party price |
| `omft_float.zec_share_pct` | number \| null | | derived |
| `omft_float.third_party` | bool | `true`: prices come from an API, not from chain | |

## claims — three pre-registered tests

`tests/claims.json` holds `id`, `statement`, `falsified_if`, `checks` and `registered_utc`.
`rebuild.py` copies them here and fills `observed` and `pass`.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | `"C1"`, `"C2"`, `"C3"` |
| `statement` | string | one sentence |
| `falsified_if` | string | one sentence |
| `checks` | array | each `{field, op, value, observed, pass}`; `field` is a dot path into this artifact, `op` is one of `<`, `<=`, `>`, `>=`, `==` |
| `pass` | bool | all checks pass. A `null` observed value is a fail |

The three claims:

- **C1, the sink is small.** State collateral locked by `intents.near` over the trailing 365 days is under 1% of net issuance over the same window. Check: `gap.lock_pct_of_issuance < 1.0`.
- **C2, the sink is subsidised.** Every refill of `intents.near` in the trace window comes from `intents_refiller.near`, and there are at least 3. Checks: `sawtooth.refill_count >= 3`, `sawtooth.from_refiller_pct == 100`.
- **C3, gas burn does not carry the token.** Protocol burn measured from intra-epoch supply decline is under 2% of net issuance. Check: `gas_burn.pct_of_net_issuance < 2.0`.

## sources — every query, by id

`sources` is an object: id → `{endpoint, method, params, note}`. `endpoint` is `"live"`, `"archival"` or a URL.
`params` is the JSON-RPC `params` value with `<placeholders>` for what varies. The site turns an entry into a copyable curl:

```
curl -s <endpoint url> -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"<method>","params":<params>}'
```

Required ids:

| id | endpoint | method | params |
|---|---|---|---|
| `block_final` | live | `block` | `{"finality":"final"}` |
| `block_header_at_height` | archival | `block` | `{"block_id":"<block>"}` (integer) |
| `view_account` | live | `query` | `{"request_type":"view_account","finality":"final","account_id":"<account>"}` |
| `view_account_at_block` | archival | `query` | `{"request_type":"view_account","block_id":"<block>","account_id":"<account>"}` |
| `view_access_key_list` | live | `query` | `{"request_type":"view_access_key_list","finality":"final","account_id":"<account>"}` |
| `chunk_receipts` | archival | `chunk` | `{"chunk_id":"<chunk_hash from block.chunks[]>"}` |
| `neardata_block` | `https://mainnet.neardata.xyz/v0/block/<block>` | GET | — (header, account updates and executed receipts of one block) |
| `protocol_config` | live | `EXPERIMENTAL_protocol_config` | `{"finality":"final"}` |
| `validators_epoch_start` | live | `validators` | `[null]` |
| `pool_get_account` | live | `query` | `call_function` on `zavodil.poolv1.near`, `get_account`, args `{"account_id":"dll-treasury.sputnik-dao.near"}` |
| `dao_get_proposals` | live | `query` | `call_function` on `dll-treasury.sputnik-dao.near`, `get_proposals`, args `{"from_index":<n>,"limit":50}` |
| `multisig_confirmations` | live | `query` | `call_function` on `buybacks.multisignature.near`, `get_num_confirmations`, args `{}` |
| `omft_acl` | live | `query` | `call_function` on `omft.near`, `acl_get_permissioned_accounts`, args `{}` |
| `signer_state` | live | `query` | `call_function` on `v1.signer`, `state`, args `{}` |
| `ft_total_supply` | live | `query` | `call_function` on `<token>.omft.near`, `ft_total_supply`, args `{}` |
| `oneclick_tokens` | `https://1click.chaindefuser.com/v0/tokens` | GET | — (third party, optional) |

For `call_function`, `params` carries `args_base64` (base64 of the JSON args) and the entry also carries `args` (the decoded JSON) so a reader can see what was asked.

## Amendments

**14:40 UTC, orchestrator.** No field was added, removed or renamed. Three definitions were loosened so that history can be cached and a rebuild survives rate limits:

1. **Window anchors are sticky.** `issuance.d365.from_block` is the block on a 50,000-block grid nearest to head − 365 days. Once chosen it is reused on later runs while it stays within 5 days of that target (2 days for `d30`). `days` is always the exact span from header timestamps and every "per year" figure is annualised by it, so a 366.4-day window is reported as 366.4 days, not as 365.
2. **Checkpoints** are the anchor plus 11 more heights at a fixed step, then the head. The last gap can differ from the others by up to a few percent.
3. **The trace window can end before the head.** If archival endpoints refuse requests before the trace reaches the head, `sawtooth.window.to_block` is the last block of the most recent fully traced window and `meta.errors` says so. Running again resumes.

Also: blocks younger than about 140,000 blocks are read from ordinary RPC nodes (`https://near.api.pocket.network`, `https://free.rpc.fastnear.com`), which keep recent state and do not rate-limit as hard. The query is identical to the archival one.

## Companion file: data/refills_30d.json

Written by `scripts/trace_refills.py`, not by `rebuild.py`, and not part of `artifact.json`. It ends at `meta.head_block` of the artifact it was run against.

| Field | Type | Meaning |
|---|---|---|
| `window.from_block`, `.to_block`, `.from_utc`, `.to_utc`, `.days` | int, int, string, string, number | the traced window; `days` is measured from the two block timestamps |
| `complete` | bool | false if the run ran out of time; the window then still ends at the head and starts where the trace stopped |
| `grid_step_blocks`, `min_jump_near` | int, number | the sampling step (10,000 blocks) and the smallest rise in spare balance between two samples that counts as a top-up (100 NEAR) |
| `refills[]` | list | one entry per top-up: `block`, `timestamp_utc`, `amount_near` (change in the whole account balance in that block), `free_before_near`, `free_after_near`, `receipt_id`, `predecessor_id` |
| `refill_count`, `refilled_near` | int, number | length of `refills` and the sum of `amount_near` |
| `from_refiller_count`, `other_sender_count`, `unresolved_count`, `from_refiller_pct` | int, int, int, number | senders by receipt: `intents_refiller.near`, anyone else, and receipts that could not be found |
| `samples[]` | list | spare balance (`free_near`) at each grid block |
