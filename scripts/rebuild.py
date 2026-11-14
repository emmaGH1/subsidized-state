#!/usr/bin/env python3
"""Rebuild data/artifact.json from NEAR mainnet. Python standard library only, no API keys.

    python3 scripts/rebuild.py              normal run, under 60 seconds
    python3 scripts/rebuild.py --verify 5   refetch 5 random cached history entries and compare
    python3 scripts/rebuild.py --fresh      ignore the history cache, refetch everything (minutes)

Every "now" value is read at one final block (meta.head_block). Historical values are immutable,
so they are kept in data/history_cache.json and only fetched when missing. See data/SCHEMA.md.
"""
import argparse, base64, datetime, gzip, json, os, random, statistics, sys, threading, time
import urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACT = os.path.join(ROOT, "data", "artifact.json")
CACHE_PATH = os.path.join(ROOT, "data", "history_cache.json")
CLAIMS_PATH = os.path.join(ROOT, "tests", "claims.json")

LIVE = ["https://free.rpc.fastnear.com", "https://near.api.pocket.network", "https://rpc.mainnet.near.org"]
RECENT = ["https://near.api.pocket.network", "https://free.rpc.fastnear.com"]   # keep roughly the last 150,000 blocks
ARCHIVAL = ["https://archival-rpc.mainnet.fastnear.com", "https://near-mainnet.gateway.tatum.io"]
NEARDATA = "https://mainnet.neardata.xyz/v0/block/%d"
ONECLICK = "https://1click.chaindefuser.com/v0/tokens"
RECENT_DEPTH = 140_000

INTENTS = "intents.near"
REFILLER = "intents_refiller.near"
TREASURY = "dll-treasury.sputnik-dao.near"
POOL = "zavodil.poolv1.near"
BUYBACKS = "buybacks.multisignature.near"
FEFUNDS = "fefundsadmin.sputnik-dao.near"
BRIDGE_MNG = "bridge-mng.near"
NO_CONTRACT = "1" * 32

YOCTO = 10 ** 24
DAY_NS = 86_400 * 10 ** 9
YEAR_S = 31_536_000
TRACE_WINDOW = 500_000
TRACE_STEP = 2_500
ANCHOR_GRID = 50_000
REFILL_MIN_NEAR = 100


class BudgetExceeded(Exception):
    pass


class UnknownBlock(Exception):
    pass


class Net:
    def __init__(self, budget_s):
        self.t0 = time.time()
        self.deadline = self.t0 + budget_s
        self.calls = 0
        self.cache_hits = 0
        self.lock = threading.Lock()
        self.next_ok = {}        # host -> earliest time of next request
        self.closed_until = {}   # host -> time a 429 told us to stay away until
        self.used = {"live": None, "archival": None}
        self.history = set()

    def left(self):
        return self.deadline - time.time()

    def _wait(self, url, gap):
        with self.lock:
            now = time.time()
            at = max(now, self.next_ok.get(url, 0))
            self.next_ok[url] = at + gap
            self.calls += 1
        if at > now:
            time.sleep(at - now)

    def http(self, url, body=None, timeout=15):
        headers = {"User-Agent": "subsidized-state-rebuild/1.0", "Accept-Encoding": "gzip"}
        if body is not None:
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=body, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            if r.headers.get("Content-Encoding") == "gzip":
                raw = gzip.decompress(raw)
        return json.loads(raw)

    def rpc(self, urls, method, params, kind, gap=0.0, essential=True):
        """JSON-RPC with rotation, retries and backoff. Raises UnknownBlock for skipped heights."""
        body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
        last = None
        for attempt in range(12):
            if not essential and self.left() <= 0:
                raise BudgetExceeded()
            now = time.time()
            open_urls = [u for u in urls if self.closed_until.get(u, 0) <= now]
            if not open_urls:
                wake = min(self.closed_until[u] for u in urls)
                if not essential and wake > self.deadline:
                    raise BudgetExceeded()
                time.sleep(max(0.05, wake - now))
                continue
            url = open_urls[0]
            self._wait(url, gap)
            try:
                d = self.http(url, body)
            except urllib.error.HTTPError as e:
                last = "HTTP %s from %s" % (e.code, url)
                if e.code == 429:
                    self.closed_until[url] = time.time() + (4 if kind == "live" else 8 + 6 * attempt)
                else:
                    time.sleep(0.3)
                continue
            except Exception as e:  # timeouts, DNS, bad JSON
                last = "%s from %s" % (type(e).__name__, url)
                time.sleep(0.3 * (attempt + 1))
                continue
            if "result" in d:
                if "error" in d["result"] and isinstance(d["result"]["error"], str):
                    raise RuntimeError("%s %s: %s" % (method, json.dumps(params)[:120], d["result"]["error"][:200]))
                if self.used.get(kind) is None:
                    self.used[kind] = url
                return d["result"]
            err = json.dumps(d.get("error"))
            if "UNKNOWN_BLOCK" in err or "DB Not Found" in err:
                raise UnknownBlock(err[:160])
            if "UNKNOWN_ACCOUNT" in err:
                return None
            if "GARBAGE_COLLECTED" in err or "HANDLER_ERROR" in err:
                raise UnknownBlock(err[:160])
            last = err[:200]
            time.sleep(0.3)
        raise RuntimeError("rpc failed: %s %s: %s" % (method, json.dumps(params)[:120], last))


class Chain:
    """Reads anchored at one head block, with an on-disk cache for immutable history."""

    def __init__(self, net, fresh):
        self.net = net
        self.fresh = fresh
        self.cache = {"version": 2, "accounts": {}, "headers": {}, "refills": {}, "anchors": {}}
        if not fresh and os.path.exists(CACHE_PATH):
            try:
                c = json.load(open(CACHE_PATH))
                if c.get("version") == 2:
                    self.cache.update(c)
            except Exception:
                pass
        self.cache_lock = threading.Lock()
        self.head = None

    # ---------- head / live ----------
    def load_head(self):
        h = self.net.rpc(LIVE, "block", {"finality": "final"}, "live")["header"]
        self.head = h
        self.H = h["height"]
        self.ts = int(h["timestamp"])
        self._put_header(self.H, h)

    def live_query(self, params):
        p = dict(params)
        p["block_id"] = self.H
        try:
            return self.net.rpc(LIVE, "query", p, "live")
        except UnknownBlock:
            p.pop("block_id")
            p["finality"] = "final"
            return self.net.rpc(LIVE, "query", p, "live")

    def view(self, account, method, args=None):
        r = self.live_query({"request_type": "call_function", "account_id": account, "method_name": method,
                             "args_base64": base64.b64encode(json.dumps(args or {}).encode()).decode()})
        return json.loads(bytes(r["result"]).decode())

    def keys(self, account):
        return self.live_query({"request_type": "view_access_key_list", "account_id": account})["keys"]

    # ---------- history ----------
    def _put_header(self, requested, h):
        rec = [h["height"], str(h["timestamp"]), h["total_supply"], h["epoch_id"], h.get("prev_height")]
        with self.cache_lock:
            self.cache["headers"][str(requested)] = rec
        return rec

    def _sources(self, height):
        if self.H - height < RECENT_DEPTH:
            return [(RECENT, "recent", 0.0), (ARCHIVAL, "archival", 0.26)]
        return [(ARCHIVAL, "archival", 0.26)]

    def _hist(self, method, make_params, height, essential):
        """Try the height and, for skipped heights, the next few."""
        for k in range(12):
            for urls, kind, gap in self._sources(height):
                try:
                    r = self.net.rpc(urls, method, make_params(height + k), kind, gap, essential)
                    self.net.history.add("archival_rpc" if kind == "archival" else "rpc")
                    return r
                except UnknownBlock:
                    continue
                except RuntimeError:
                    if kind == "archival":
                        raise
                    continue
        raise RuntimeError("no block found at or after height %d" % height)

    def header(self, height, essential=True):
        key = str(height)
        with self.cache_lock:
            rec = self.cache["headers"].get(key)
        if rec:
            self.net.cache_hits += 1
            return rec
        r = self._hist("block", lambda h: {"block_id": h}, height, essential)
        return self._put_header(height, r["header"])

    def account(self, account, height, essential=True):
        """Returns [actual_height, amount_yocto_str, storage_usage, code_hash] at `height`."""
        key = "%s@%d" % (account, height)
        with self.cache_lock:
            rec = self.cache["accounts"].get(key)
        if rec:
            self.net.cache_hits += 1
            return rec
        r = self._hist("query", lambda h: {"request_type": "view_account", "block_id": h, "account_id": account},
                       height, essential)
        rec = [height, "0", 0, None] if r is None else [r["block_height"], r["amount"], r["storage_usage"], r["code_hash"]]
        with self.cache_lock:
            self.cache["accounts"][key] = rec
        return rec

    def save_cache(self):
        if self.fresh and os.environ.get("REBUILD_KEEP_CACHE"):
            return
        with self.cache_lock:
            tmp = CACHE_PATH + ".tmp"
            with open(tmp, "w") as f:
                json.dump(self.cache, f, sort_keys=True, separators=(",", ":"))
            os.replace(tmp, CACHE_PATH)


# ---------- helpers ----------
def near(yocto):
    return round(int(yocto) / YOCTO, 2)


def iso(ns):
    return datetime.datetime.fromtimestamp(int(ns) / 1e9, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def snap(rec, per_byte):
    """Checkpoint dict from an account record. Integer math in yocto, rounded at the end."""
    amount, storage = int(rec[1]), int(rec[2])
    locked = storage * per_byte
    return {"block": rec[0], "storage_usage_bytes": storage, "locked_near": near(locked),
            "amount_near": near(amount), "free_near": near(amount - locked),
            "_amount": amount, "_locked": locked}


def find_anchor(chain, days, tolerance_days, name):
    """A block about `days` before head. Reuses the cached anchor while it is within tolerance,
    so the history hanging off it stays cached. Otherwise picks the nearest block on a coarse grid."""
    target = chain.ts - days * DAY_NS
    cached = None if chain.fresh else chain.cache["anchors"].get(name)
    if cached:
        rec = chain.header(cached)
        if abs(int(rec[1]) - target) <= tolerance_days * DAY_NS:
            return cached
    # estimate block time from the head and one far header, then walk the grid
    guess = chain.H - int(days * 86_400 / 0.6)
    guess = round(guess / ANCHOR_GRID) * ANCHOR_GRID
    for _ in range(8):
        rec = chain.header(guess)
        off_ns = target - int(rec[1])
        rate = (chain.ts - int(rec[1])) / max(1, chain.H - rec[0])   # ns per block since then
        move = round(off_ns / rate / ANCHOR_GRID) * ANCHOR_GRID
        if move == 0:
            break
        guess += move
    chain.cache["anchors"][name] = guess
    return guess


def build(args):
    net = Net(args.budget)
    chain = Chain(net, args.fresh)
    errors = []
    art = {"schema_version": "1.0"}
    chain.load_head()
    H, ts = chain.H, chain.ts
    say = (lambda *a: print(*a, flush=True)) if args.fresh else (lambda *a: None)

    # ---- constants ----
    pc = net.rpc(LIVE, "EXPERIMENTAL_protocol_config", {"block_id": H}, "live")
    per_byte = int(pc["runtime_config"]["storage_amount_per_byte"])
    infl = pc["max_inflation_rate"]
    max_infl_pct = infl[0] / infl[1] * 100
    near_per_mb = per_byte * 10 ** 6 / YOCTO
    art["constants"] = {"storage_amount_per_byte_yocto": str(per_byte), "near_per_mb": near_per_mb,
                        "max_inflation_rate_pct": max_infl_pct, "protocol_version": pc["protocol_version"],
                        "epoch_length_blocks": pc["epoch_length"]}
    epoch_len = pc["epoch_length"]

    # ---- anchors and issuance ----
    a365 = find_anchor(chain, 365, 5, "d365")
    a30 = find_anchor(chain, 30, 2, "d30")

    def window(anchor):
        rec = chain.header(anchor)
        days = (ts - int(rec[1])) / DAY_NS
        s0, s1 = int(rec[2]), int(chain.head["total_supply"])
        net_y = s1 - s0
        return {"from_block": rec[0], "to_block": H, "days": round(days, 3),
                "supply_from_near": near(s0), "supply_to_near": near(s1), "net_near": near(net_y),
                "annualized_near": round(net_y / YOCTO / days * 365, 2),
                "annualized_pct": round(net_y / days * 365 / s0 * 100, 4)}

    supply_now = int(chain.head["total_supply"])
    issuance = {"total_supply_near": near(supply_now), "d365": window(a365), "d30": window(a30),
                "max_gross_near_per_year": round(supply_now / YOCTO * max_infl_pct / 100, 2),
                "sources": ["block_header_at_height", "protocol_config"]}
    art_issuance = issuance

    # ---- lock: 13 checkpoints ----
    step = chain.cache["anchors"].get("checkpoint_step")
    if chain.fresh or not step or a365 + 12 * step > H or a365 + 13 * step < H - 2 * ANCHOR_GRID * 12:
        step = round((H - a365) / 12 / ANCHOR_GRID) * ANCHOR_GRID
        chain.cache["anchors"]["checkpoint_step"] = step
    heights = [a365 + k * step for k in range(12)]
    say("checkpoints at", heights)
    cps = []
    for h in heights:
        s = snap(chain.account(INTENTS, h), per_byte)
        s["timestamp_utc"] = iso(chain.header(s["block"])[1])
        cps.append(s)
    now_rec = chain.live_query({"request_type": "view_account", "account_id": INTENTS})
    head_cp = snap([now_rec["block_height"], now_rec["amount"], now_rec["storage_usage"], now_rec["code_hash"]], per_byte)
    head_cp["timestamp_utc"] = iso(ts)
    with chain.cache_lock:
        chain.cache["accounts"]["%s@%d" % (INTENTS, H)] = [now_rec["block_height"], now_rec["amount"],
                                                          now_rec["storage_usage"], now_rec["code_hash"]]
    cps.append(head_cp)
    first, last = cps[0], cps[-1]
    lock_days = (ts - int(chain.header(first["block"])[1])) / DAY_NS
    g_bytes = last["storage_usage_bytes"] - first["storage_usage_bytes"]
    g_yocto = last["_locked"] - first["_locked"]
    order = ["block", "timestamp_utc", "storage_usage_bytes", "locked_near", "amount_near", "free_near"]
    lock = {"account": INTENTS, "checkpoints": [{k: c[k] for k in order} for c in cps],
            "growth_365d": {"from_block": first["block"], "to_block": last["block"], "days": round(lock_days, 3),
                            "bytes": g_bytes, "near": near(g_yocto),
                            "near_per_year": round(g_yocto / YOCTO / lock_days * 365, 2),
                            "gb_per_year": round(g_bytes / 1e9 / lock_days * 365, 3)},
            "locked_share_of_balance_pct": round(last["_locked"] / last["_amount"] * 100, 2),
            "monotonic": all(a["storage_usage_bytes"] < b["storage_usage_bytes"] for a, b in zip(cps, cps[1:])),
            "sources": ["view_account_at_block", "block_header_at_height"]}
    art["lock"] = lock

    # ---- vaults (history part is essential and small) ----
    def vault(account, with_multisig):
        acc = chain.live_query({"request_type": "view_account", "account_id": account})
        bal = int(acc["amount"])
        out = {"account": account, "balance_near": near(bal)}
        for label, anchor in (("30d", a30), ("365d", a365)):
            try:
                old = int(chain.account(account, anchor)[1])
                out["balance_%s_ago_near" % label] = near(old)
                out["net_change_%s_near" % label] = near(bal - old)
            except Exception as e:
                errors.append("vaults.%s %s history unavailable: %s" % (account, label, str(e)[:80]))
                out["balance_%s_ago_near" % label] = None
                out["net_change_%s_near" % label] = None
        out = {k: out[k] for k in ["account", "balance_near", "balance_30d_ago_near", "balance_365d_ago_near",
                                    "net_change_30d_near", "net_change_365d_near"]}
        out["inflow_method"] = "onchain_net_balance_change"
        out["num_confirmations"] = None
        out["access_key_count"] = None
        try:
            out["access_key_count"] = len(chain.keys(account))
            if with_multisig:
                out["num_confirmations"] = int(chain.view(account, "get_num_confirmations"))
        except Exception as e:
            errors.append("vaults.%s keys/confirmations unavailable: %s" % (account, str(e)[:80]))
        out["burned"] = False
        out["sources"] = ["view_account", "view_account_at_block", "multisig_confirmations", "view_access_key_list"]
        return out

    vaults = {"buybacks": vault(BUYBACKS, True), "fefunds": vault(FEFUNDS, False)}

    # ---- gas burn: current partial epoch + recent complete epochs ----
    epochs = []
    try:
        es = net.rpc(LIVE, "validators", [None], "live")["epoch_start_height"]
        if es > H:   # head moved into a new epoch between calls
            es = net.rpc(LIVE, "validators", [H], "live")["epoch_start_height"]
        first_rec = chain.header(es)
        epochs.append({"first_block": first_rec[0], "last_block": H, "complete": False,
                       "supply_first_yocto": first_rec[2], "supply_last_yocto": chain.head["total_supply"],
                       "burned_near": near(int(first_rec[2]) - supply_now),
                       "seconds": round((ts - int(first_rec[1])) / 1e9, 1)})
        cur_first = first_rec
        for _ in range(args.epochs):
            last_h = cur_first[4]                      # prev_height of the epoch's first block
            last_rec = chain.header(last_h)
            known = chain.cache["anchors"].get("epoch_start_before_%d" % cur_first[0])
            if not known:
                known = net.rpc(LIVE + ARCHIVAL, "validators", [last_h], "live")["epoch_start_height"]
                chain.cache["anchors"]["epoch_start_before_%d" % cur_first[0]] = known
            f_rec = chain.header(known)
            if f_rec[3] != last_rec[3]:
                raise RuntimeError("epoch id mismatch at %d..%d" % (known, last_h))
            epochs.insert(0, {"first_block": f_rec[0], "last_block": last_rec[0], "complete": True,
                              "supply_first_yocto": f_rec[2], "supply_last_yocto": last_rec[2],
                              "burned_near": near(int(f_rec[2]) - int(last_rec[2])),
                              "seconds": round((int(last_rec[1]) - int(f_rec[1])) / 1e9, 1)})
            cur_first = f_rec
    except Exception as e:
        errors.append("gas_burn: stopped after %d epoch(s): %s" % (len(epochs), str(e)[:120]))
    burned_y = sum(int(e["supply_first_yocto"]) - int(e["supply_last_yocto"]) for e in epochs)
    secs = sum(e["seconds"] for e in epochs)
    burn_per_year = round(burned_y / YOCTO / secs * YEAR_S, 2) if secs else None
    gas = {"method": "Inside an epoch no NEAR is minted, so total_supply in block headers only falls. "
                     "Supply at the first block of an epoch minus supply at the last block read in the same epoch "
                     "is what the protocol burned.",
           "epochs": epochs, "burned_near_per_year": burn_per_year,
           "pct_of_net_issuance": round(burn_per_year / issuance["d365"]["annualized_near"] * 100, 3) if burn_per_year is not None else None,
           "sources": ["validators_epoch_start", "block_header_at_height"]}

    # ---- payer ----
    tre = chain.live_query({"request_type": "view_account", "account_id": TREASURY})
    pool = chain.view(POOL, "get_account", {"account_id": TREASURY})
    last_id = chain.view(TREASURY, "get_last_proposal_id")
    props = []
    for start in range(0, last_id + 1, 50):
        for p in chain.view(TREASURY, "get_proposals", {"from_index": start, "limit": 50}):
            k = p.get("kind")
            if isinstance(k, dict) and "Transfer" in k:
                t = k["Transfer"]
                if t.get("receiver_id") == REFILLER and t.get("token_id", "") == "":
                    props.append({"id": p["id"], "amount_near": near(t["amount"]), "status": p["status"],
                                  "submitted_utc": iso(p["submission_time"]),
                                  "description": (p.get("description") or "")[:120]})
    ref = chain.live_query({"request_type": "view_account", "account_id": REFILLER})
    approved = [p for p in props if p["status"] == "Approved"]
    payer = {"treasury": {"account": TREASURY, "liquid_near": near(tre["amount"]), "staking_pool": POOL,
                          "staked_near": near(pool["staked_balance"]), "unstaked_near": near(pool["unstaked_balance"]),
                          "last_proposal_id": last_id},
             "refiller": {"account": REFILLER, "balance_near": near(ref["amount"]),
                          "access_key_count": len(chain.keys(REFILLER)), "has_contract": ref["code_hash"] != NO_CONTRACT},
             "proposals_to_refiller": props,
             "approved_to_refiller_near": round(sum(p["amount_near"] for p in approved), 2),
             "approved_to_refiller_count": len(approved),
             "sources": ["view_account", "pool_get_account", "dao_get_proposals", "view_access_key_list"]}

    # ---- facts ----
    acl = chain.view("omft.near", "acl_get_permissioned_accounts")
    bm = chain.live_query({"request_type": "view_account", "account_id": BRIDGE_MNG})
    bm_keys = chain.keys(BRIDGE_MNG)
    signer = chain.view("v1.signer", "state")
    running = signer.get("Running", signer)
    params = running["parameters"]
    facts = {"omft_acl": {"super_admins": acl.get("super_admins", []), "roles": acl.get("roles", {})},
             "bridge_mng": {"account": BRIDGE_MNG, "access_key_count": len(bm_keys),
                            "full_access_key_count": sum(1 for k in bm_keys if k["access_key"]["permission"] == "FullAccess"),
                            "has_contract": bm["code_hash"] != NO_CONTRACT},
             "v1_signer": {"threshold": params["threshold"], "participants": len(params["participants"]["participants"])},
             "omft_float": {"contracts_queried": None, "total_usd": None, "zec_supply": None, "zec_usd": None,
                            "zec_share_pct": None, "third_party": True}}
    try:   # optional third-party context
        net.calls += 1
        toks = net.http(ONECLICK, timeout=10)
        omft = [t for t in toks if t["assetId"].startswith("nep141:") and t["assetId"].endswith(".omft.near")]

        def supply(t):
            try:
                s = int(chain.view(t["assetId"][7:], "ft_total_supply")) / 10 ** t["decimals"]
                return t["assetId"][7:], s, s * float(t.get("price") or 0)
            except Exception:
                return None
        with ThreadPoolExecutor(5) as ex:
            vals = [v for v in ex.map(supply, omft) if v]
        total = sum(v[2] for v in vals)
        zec = [v for v in vals if v[0] == "zec.omft.near"]
        if not vals or not zec or total <= 0:
            raise RuntimeError("no supplies read")
        facts["omft_float"] = {"contracts_queried": len(vals), "total_usd": round(total, 2),
                               "zec_supply": round(zec[0][1], 2), "zec_usd": round(zec[0][2], 2),
                               "zec_share_pct": round(zec[0][2] / total * 100, 2), "third_party": True}
    except Exception as e:
        errors.append("facts.omft_float unavailable (third-party API): %s" % str(e)[:100])

    # ---- sawtooth (last, so the budget is spent on it only after everything essential) ----
    sawtooth = build_sawtooth(chain, net, per_byte, errors, say)

    # ---- gap ----
    L = lock["growth_365d"]["near_per_year"]
    I = issuance["d365"]["annualized_near"]
    I30 = issuance["d30"]["annualized_near"]
    near_per_gb = near_per_mb * 1000
    gap = {"lock_near_per_year": L, "net_issuance_near_per_year": I,
           "lock_pct_of_issuance": round(L / I * 100, 4), "multiple": round(I / L, 1),
           "state_gb_per_year_now": lock["growth_365d"]["gb_per_year"],
           "state_gb_per_year_to_offset": round(I / near_per_gb, 1), "near_per_gb": near_per_gb,
           "net_issuance_30d_annualized_near": I30, "multiple_30d": round(I30 / L, 1)}

    art["meta"] = {"generated_at_utc": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                   "is_sample": False, "head_block": H, "head_timestamp_utc": iso(ts), "head_hash": chain.head["hash"],
                   "endpoints": {"live": net.used["live"] or LIVE[0], "archival": ARCHIVAL[0],
                                 "history": sorted(net.history) or ["cache"]},
                   "runtime_seconds": None, "network_calls": None, "cache_hits": None, "fresh": bool(args.fresh),
                   "errors": errors}
    art.update({"sawtooth": sawtooth, "payer": payer, "issuance": art_issuance, "gas_burn": gas, "vaults": vaults,
                "gap": gap, "facts": facts})
    art = {k: art[k] for k in ["schema_version", "meta", "constants", "lock", "sawtooth", "payer", "issuance",
                                "gas_burn", "vaults", "gap", "facts"]}
    art["claims"] = evaluate_claims(art)
    art["sources"] = sources()
    chain.save_cache()
    art["meta"]["runtime_seconds"] = round(time.time() - net.t0, 1)
    art["meta"]["network_calls"] = net.calls
    art["meta"]["cache_hits"] = net.cache_hits
    return art


def build_sawtooth(chain, net, per_byte, errors, say):
    H = chain.H
    prev = chain.cache["anchors"].get("trace_complete_to")

    def attempt(to_block, essential):
        start = to_block - TRACE_WINDOW
        grid = list(range(-(-start // TRACE_STEP) * TRACE_STEP, to_block, TRACE_STEP))
        if not grid or grid[-1] != to_block:
            grid.append(to_block)
        missing_recent = [h for h in grid if ("%s@%d" % (INTENTS, h)) not in chain.cache["accounts"] and H - h < RECENT_DEPTH]
        if missing_recent:   # recent blocks come from ordinary RPC nodes, which are not rate-limited hard
            with ThreadPoolExecutor(4) as ex:
                list(ex.map(lambda h: chain.account(INTENTS, h, essential), missing_recent))
        pts = {}
        for i, h in enumerate(grid):   # anything older goes to archival, one at a time
            s = snap(chain.account(INTENTS, h, essential), per_byte)
            pts[s["block"]] = s
            if i % 25 == 0:
                say("trace %d/%d" % (i, len(grid)))
                chain.save_cache()
        blocks = sorted(pts)
        refills = []
        for a, b in zip(blocks, blocks[1:]):
            if pts[b]["free_near"] - pts[a]["free_near"] <= REFILL_MIN_NEAR:
                continue
            known = [int(k) for k in chain.cache["refills"] if a < int(k) <= b]
            if known:
                rb = known[0]
            else:
                lo, hi, base = a, b, pts[a]["_amount"] - pts[a]["_locked"]
                while hi - lo > 1:
                    mid = (lo + hi) // 2
                    s = snap(chain.account(INTENTS, mid, essential), per_byte)
                    if s["block"] >= hi:           # mid was a skipped height that resolved to hi
                        hi = mid
                        continue
                    if (s["_amount"] - s["_locked"] - base) > REFILL_MIN_NEAR * YOCTO:
                        hi = mid
                    else:
                        lo = mid
                rb = hi
            before = snap(chain.account(INTENTS, rb - 1, essential), per_byte)
            after = snap(chain.account(INTENTS, rb, essential), per_byte)
            info = chain.cache["refills"].get(str(rb))
            if not info or not info.get("receipt_id"):
                info = find_receipt(chain, net, rb, essential)
            if not info.get("timestamp"):
                info["timestamp"] = chain.header(rb, essential)[1]
            with chain.cache_lock:
                chain.cache["refills"][str(rb)] = info
            pts[rb - 1] = dict(before, block=rb - 1)
            pts[rb] = dict(after, block=rb)
            refills.append({"block": rb, "timestamp_utc": iso(info["timestamp"]),
                            "free_before_near": before["free_near"], "free_after_near": after["free_near"],
                            "amount_near": near(after["_amount"] - before["_amount"]),
                            "receipt_id": info.get("receipt_id"), "predecessor_id": info.get("predecessor_id")})
            say("refill at", rb, info.get("predecessor_id"))
        t_from = int(chain.header(grid[0], essential)[1])
        t_to = int(chain.header(to_block, essential)[1])
        return grid, pts, refills, (t_to - t_from) / DAY_NS

    try:
        grid, pts, refills, days = attempt(H, essential=chain.fresh)
        to_block = H
        chain.cache["anchors"]["trace_complete_to"] = H
    except BudgetExceeded:
        chain.save_cache()
        if not prev:
            raise RuntimeError("history endpoints are rate-limited and there is no cached trace. "
                               "Wait two minutes and run again; each run resumes where the last stopped.")
        errors.append("sawtooth: archival endpoints rate-limited before the trace could be extended to the head; "
                      "window ends at cached block %d. Run again to extend it (each run resumes)." % prev)
        grid, pts, refills, days = attempt(prev, essential=True)
        to_block = prev

    trace = [{"block": b, "free_near": pts[b]["free_near"]} for b in sorted(pts)]
    amounts = [r["amount_near"] for r in refills]
    gaps_b = [b["block"] - a["block"] for a, b in zip(refills, refills[1:])]
    stamp = lambda s: datetime.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc).timestamp()
    gaps_h = [(stamp(b["timestamp_utc"]) - stamp(a["timestamp_utc"])) / 3600 for a, b in zip(refills, refills[1:])]
    resolved = [r for r in refills if r["predecessor_id"]]
    frees = [t["free_near"] for t in trace]
    return {"account": INTENTS, "window": {"from_block": grid[0], "to_block": to_block, "days": round(days, 3)},
            "trace": trace, "refills": refills, "refill_count": len(refills),
            "refilled_near": round(sum(amounts), 2),
            "refill_amount_median_near": round(statistics.median(amounts), 2) if amounts else None,
            "trigger_free_mean_near": round(statistics.mean(r["free_before_near"] for r in refills), 2) if refills else None,
            "interval_blocks_mean": round(statistics.mean(gaps_b), 1) if gaps_b else None,
            "interval_hours_mean": round(statistics.mean(gaps_h), 2) if gaps_h else None,
            "from_refiller_pct": round(100 * sum(1 for r in refills if r["predecessor_id"] == REFILLER) / len(refills), 2)
            if refills and len(resolved) == len(refills) else None,
            "free_min_near": min(frees), "free_max_near": max(frees),
            "sources": ["view_account_at_block", "block_header_at_height", "neardata_block"]}


def find_receipt(chain, net, block, essential):
    """The executed receipt that moved more than REFILL_MIN_NEAR into intents.near in `block`."""
    def big_transfer(receipt):
        if receipt.get("receiver_id") != INTENTS:
            return False
        actions = receipt.get("receipt", {}).get("Action", {}).get("actions", [])
        return any(isinstance(a, dict) and "Transfer" in a and int(a["Transfer"]["deposit"]) > REFILL_MIN_NEAR * YOCTO
                   for a in actions)
    for attempt in range(3):   # neardata: one GET carries every receipt executed in the block
        try:
            net.calls += 1
            d = net.http(NEARDATA % block)
            for shard in d.get("shards", []):
                for o in shard.get("receipt_execution_outcomes", []):
                    if big_transfer(o["receipt"]):
                        net.history.add("neardata")
                        return {"receipt_id": o["receipt"]["receipt_id"], "predecessor_id": o["receipt"]["predecessor_id"]}
            break
        except Exception:
            time.sleep(1.5 * (attempt + 1))
    try:   # fallback: RPC chunks of the block and the one before it
        for h in (block, block - 1):
            b = chain._hist("block", lambda x: {"block_id": x}, h, essential)
            for ch in b["chunks"]:
                c = chain._hist("chunk", lambda x, cid=ch["chunk_hash"]: {"chunk_id": cid}, h, essential)
                for r in c.get("receipts", []):
                    if big_transfer(r):
                        return {"receipt_id": r["receipt_id"], "predecessor_id": r["predecessor_id"]}
    except BudgetExceeded:
        raise
    except Exception:
        pass
    return {"receipt_id": None, "predecessor_id": None}


OPS = {"<": lambda a, b: a < b, "<=": lambda a, b: a <= b, ">": lambda a, b: a > b,
       ">=": lambda a, b: a >= b, "==": lambda a, b: a == b}


def lookup(art, path):
    o = art
    for k in path.split("."):
        o = o[k]
    return o


def evaluate_claims(art):
    out = []
    for c in json.load(open(CLAIMS_PATH)):
        checks = []
        for k in c["checks"]:
            try:
                obs = lookup(art, k["field"])
            except Exception:
                obs = None
            ok = obs is not None and OPS[k["op"]](obs, k["value"])
            checks.append({"field": k["field"], "op": k["op"], "value": k["value"], "observed": obs, "pass": bool(ok)})
        out.append({"id": c["id"], "statement": c["statement"], "falsified_if": c["falsified_if"],
                    "checks": checks, "pass": all(k["pass"] for k in checks)})
    return out


def sources():
    def cf(account, method, args, note):
        return {"endpoint": "live", "method": "query",
                "params": {"request_type": "call_function", "finality": "final", "account_id": account,
                           "method_name": method,
                           "args_base64": base64.b64encode(json.dumps(args, separators=(",", ":")).encode()).decode()},
                "args": args, "note": note}
    return {
        "block_final": {"endpoint": "live", "method": "block", "params": {"finality": "final"},
                        "note": "head block header: height, timestamp, total_supply"},
        "block_header_at_height": {"endpoint": "archival", "method": "block", "params": {"block_id": "<block>"},
                                   "note": "header.total_supply and header.timestamp at a height; <block> is an integer"},
        "view_account": {"endpoint": "live", "method": "query",
                         "params": {"request_type": "view_account", "finality": "final", "account_id": "<account>"},
                         "note": "amount and storage_usage now"},
        "view_account_at_block": {"endpoint": "archival", "method": "query",
                                  "params": {"request_type": "view_account", "block_id": "<block>", "account_id": "<account>"},
                                  "note": "amount and storage_usage at a height; <block> is an integer"},
        "view_access_key_list": {"endpoint": "live", "method": "query",
                                 "params": {"request_type": "view_access_key_list", "finality": "final", "account_id": "<account>"},
                                 "note": "count keys[]"},
        "chunk_receipts": {"endpoint": "archival", "method": "chunk", "params": {"chunk_id": "<chunk_hash>"},
                           "note": "receipts of one chunk; chunk hashes are in block.chunks[]"},
        "neardata_block": {"endpoint": "https://mainnet.neardata.xyz/v0/block/<block>", "method": "GET", "params": None,
                           "note": "header, account_update state changes and executed receipts of one block"},
        "protocol_config": {"endpoint": "live", "method": "EXPERIMENTAL_protocol_config", "params": {"finality": "final"},
                            "note": "runtime_config.storage_amount_per_byte, max_inflation_rate"},
        "validators_epoch_start": {"endpoint": "live", "method": "validators", "params": [None],
                                   "note": "epoch_start_height of the current epoch"},
        "pool_get_account": cf(POOL, "get_account", {"account_id": TREASURY}, "staked_balance of the treasury DAO"),
        "dao_get_proposals": cf(TREASURY, "get_proposals", {"from_index": 0, "limit": 50},
                                "page through from_index 0, 50, 100; filter kind.Transfer.receiver_id == intents_refiller.near"),
        "multisig_confirmations": cf(BUYBACKS, "get_num_confirmations", {}, "confirmations needed"),
        "omft_acl": cf("omft.near", "acl_get_permissioned_accounts", {}, "roles and grantees"),
        "signer_state": cf("v1.signer", "state", {}, "Running.parameters.threshold and participants"),
        "ft_total_supply": cf("zec.omft.near", "ft_total_supply", {}, "same call on every <token>.omft.near"),
        "oneclick_tokens": {"endpoint": ONECLICK, "method": "GET", "params": None,
                            "note": "third party: token list and USD prices. optional"},
    }


def verify(n):
    """Refetch n random cached account reads from the chain and compare."""
    net = Net(600)
    chain = Chain(net, fresh=False)
    chain.load_head()
    keys = [k for k in chain.cache["accounts"] if chain.H - int(k.split("@")[1]) > 1000]
    if not keys:
        print("history cache is empty; run python3 scripts/rebuild.py first")
        return 1
    bad = 0
    for key in random.sample(keys, min(n, len(keys))):
        account, height = key.split("@")
        cached = chain.cache["accounts"][key]
        r = chain._hist("query", lambda h: {"request_type": "view_account", "block_id": h, "account_id": account},
                        int(height), True)
        live = [int(height), "0", 0] if r is None else [r["block_height"], r["amount"], r["storage_usage"]]
        ok = live == cached[:3]
        bad += not ok
        print("%s  %s @ %s  cached amount=%s storage=%s  chain amount=%s storage=%s"
              % ("MATCH   " if ok else "MISMATCH", account, height, cached[1], cached[2], live[1], live[2]))
    print("verify: %d checked, %d mismatched" % (min(n, len(keys)), bad))
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--fresh", action="store_true", help="ignore the history cache and refetch everything (slow)")
    ap.add_argument("--verify", type=int, metavar="N", help="refetch N random cached entries and compare, then exit")
    ap.add_argument("--budget", type=float, default=40.0, help="seconds allowed for optional history fetches (default 40)")
    ap.add_argument("--epochs", type=int, default=2, help="complete epochs to measure gas burn over (default 2)")
    args = ap.parse_args()
    if args.verify:
        sys.exit(verify(args.verify))
    if args.fresh:
        args.budget = 10 ** 6
    try:
        art = build(args)
    except Exception as e:
        print("rebuild failed: %s" % e, file=sys.stderr)
        sys.exit(2)
    tmp = ARTIFACT + ".tmp"
    with open(tmp, "w") as f:
        json.dump(art, f, indent=1)
        f.write("\n")
    os.replace(tmp, ARTIFACT)

    m, g, s = art["meta"], art["gap"], art["sawtooth"]
    print("subsidized state: rebuilt data/artifact.json")
    print("  head block            %s  (%s)" % (format(m["head_block"], ","), m["head_timestamp_utc"]))
    print("  intents.near locked   %s NEAR under %s bytes" % (format(art["lock"]["checkpoints"][-1]["locked_near"], ",.2f"),
                                                             format(art["lock"]["checkpoints"][-1]["storage_usage_bytes"], ",")))
    print("  lock growth           %s NEAR per year" % format(g["lock_near_per_year"], ",.2f"))
    print("  net issuance          %s NEAR per year" % format(g["net_issuance_near_per_year"], ",.2f"))
    print("  lock / issuance       %s%%  (issuance is %sx the lock)" % (g["lock_pct_of_issuance"], g["multiple"]))
    print("  gas burn              %s NEAR per year (%s%% of net issuance)"
          % (format(art["gas_burn"]["burned_near_per_year"] or 0, ",.2f"), art["gas_burn"]["pct_of_net_issuance"]))
    print("  refills in window     %s over %s days, %s%% from %s"
          % (s["refill_count"], s["window"]["days"], s["from_refiller_pct"], REFILLER))
    print("  network calls %s, cache hits %s, %ss" % (m["network_calls"], m["cache_hits"], m["runtime_seconds"]))
    for e in m["errors"]:
        print("  note: %s" % e)
    for c in art["claims"]:
        obs = ", ".join("%s %s %s (observed %s)" % (k["field"], k["op"], k["value"], k["observed"]) for k in c["checks"])
        print("%s %s  %s" % ("PASS" if c["pass"] else "FAIL", c["id"], obs))


if __name__ == "__main__":
    main()
