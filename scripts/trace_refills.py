#!/usr/bin/env python3
"""Trace every top-up of intents.near over a longer window than rebuild.py does.

rebuild.py traces about 3.3 days at a 2,500-block step. This script walks back from the
snapshot's head block (data/artifact.json) at a 10,000-block step, finds every block in
which the contract's spare balance jumped by more than 100 NEAR, and resolves the receipt
and sender of each. It writes data/refills_30d.json.

Standard library only, no API keys. Historical reads are immutable, so they are kept in
data/refills_30d_cache.json and a second run is instant. Use --fresh to refetch everything
(slow: about a thousand rate-limited archival reads).

What it can miss: a top-up smaller than 100 NEAR, or one that is cancelled out by more
than 100 NEAR of new state inside the same 10,000-block step.
"""
import argparse
import datetime
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rebuild as rb  # noqa: E402  (reuses the throttled RPC client and the receipt finder)

OUT = os.path.join(rb.ROOT, "data", "refills_30d.json")
CACHE = os.path.join(rb.ROOT, "data", "refills_30d_cache.json")
STEP = 10_000
MIN_YOCTO = rb.REFILL_MIN_NEAR * rb.YOCTO


def say(*a):
    print(*a, file=sys.stderr, flush=True)


class Reader:
    def __init__(self, fresh, budget_s):
        self.net = rb.Net(10 ** 9)
        self.chain = rb.Chain(self.net, fresh=fresh)     # seeds from data/history_cache.json, never writes it
        self.deadline = time.time() + budget_s
        self.own = {"version": 1, "accounts": {}, "headers": {}, "refills": {}}
        if not fresh and os.path.exists(CACHE):
            self.own.update(json.load(open(CACHE)))
            for k in ("accounts", "headers", "refills"):
                self.chain.cache[k].update(self.own[k])
        self.chain.load_head()
        self.reads = 0

    def out_of_time(self):
        return time.time() > self.deadline

    def _retry(self, fn):
        for attempt in range(40):
            try:
                return fn()
            except rb.UnknownBlock:
                raise
            except Exception as e:      # both archival endpoints closed or flaky: wait and go again
                if self.out_of_time():
                    raise TimeoutError(str(e))
                say("  waiting on endpoints (%s)" % str(e)[:80])
                time.sleep(15)
        raise RuntimeError("endpoints kept failing")

    def account(self, height):
        key = "%s@%d" % (rb.INTENTS, height)
        hit = key in self.chain.cache["accounts"]
        rec = self._retry(lambda: self.chain.account(rb.INTENTS, height, True))
        if not hit:
            self.reads += 1
        self.own["accounts"][key] = rec
        return rec

    def header(self, height):
        rec = self._retry(lambda: self.chain.header(height, True))
        self.own["headers"][str(height)] = rec
        return rec

    def receipt(self, block):
        info = self.chain.cache["refills"].get(str(block))
        if not info or not info.get("receipt_id"):
            info = self._retry(lambda: rb.find_receipt(self.chain, self.net, block, True))
        if not info.get("timestamp"):
            info["timestamp"] = self.header(block)[1]
        self.chain.cache["refills"][str(block)] = info
        self.own["refills"][str(block)] = info
        return info

    def save(self):
        tmp = CACHE + ".tmp"
        with open(tmp, "w") as f:
            json.dump(self.own, f, sort_keys=True, separators=(",", ":"))
        os.replace(tmp, CACHE)


def free_yocto(rec, per_byte):
    return int(rec[1]) - int(rec[2]) * per_byte


def refills_between(rd, per_byte, a, b):
    """Every block in (a, b] where the spare balance jumped by more than 100 NEAR."""
    found = []
    lo_block = a
    while True:
        base = free_yocto(rd.account(lo_block), per_byte)
        if free_yocto(rd.account(b), per_byte) - base <= MIN_YOCTO:
            return found
        lo, hi = lo_block, b
        while hi - lo > 1:
            mid = (lo + hi) // 2
            rec = rd.account(mid)
            if rec[0] >= hi:                 # mid was a skipped height that resolved to hi
                hi = mid
                continue
            if free_yocto(rec, per_byte) - base > MIN_YOCTO:
                hi = mid
            else:
                lo = mid
        found.append(hi)
        if hi >= b:
            return found
        lo_block = hi                        # look for another one later in the same step


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--days", type=float, default=30.0, help="how far back to go (default 30)")
    ap.add_argument("--fresh", action="store_true", help="ignore the cache and refetch every read")
    ap.add_argument("--budget", type=float, default=3000.0, help="seconds allowed before writing a partial window")
    args = ap.parse_args()

    art = json.load(open(rb.ARTIFACT))
    per_byte = int(art["constants"]["storage_amount_per_byte_yocto"])
    to_block = art["meta"]["head_block"]
    rd = Reader(args.fresh, args.budget)
    t_to = int(rd.header(to_block)[1])
    # about 0.6 s a block; the exact window length is measured from block timestamps below
    span = int(args.days * 86_400 / 0.5764)
    from_block = (to_block - span) // STEP * STEP
    grid = [to_block] + list(range((to_block - 1) // STEP * STEP, from_block - 1, -STEP))   # head first, going back

    refills, done_to, complete = [], to_block, True
    try:
        for i, (b, a) in enumerate(zip(grid, grid[1:])):
            if rd.out_of_time():
                complete = False
                break
            for blk in refills_between(rd, per_byte, a, b):
                before, after = rd.account(blk - 1), rd.account(blk)
                info = rd.receipt(blk)
                refills.append({
                    "block": blk, "timestamp_utc": rb.iso(info["timestamp"]),
                    "amount_near": rb.near(int(after[1]) - int(before[1])),
                    "free_before_near": rb.near(free_yocto(before, per_byte)),
                    "free_after_near": rb.near(free_yocto(after, per_byte)),
                    "receipt_id": info.get("receipt_id"), "predecessor_id": info.get("predecessor_id")})
                say("refill at %d from %s" % (blk, info.get("predecessor_id")))
            done_to = a
            if i % 20 == 0:
                rd.save()
                say("step %d/%d, back to block %d, %d refills, %d network reads" % (i, len(grid) - 1, a, len(refills), rd.reads))
    except TimeoutError:
        complete = False
    rd.save()

    refills.sort(key=lambda r: r["block"])
    t_from = int(rd.header(done_to)[1])
    rd.save()
    by_refiller = sum(1 for r in refills if r["predecessor_id"] == rb.REFILLER)
    unresolved = sum(1 for r in refills if not r["predecessor_id"])
    samples = [{"block": h, "free_near": rb.near(free_yocto(rd.account(h), per_byte))}
               for h in sorted(g for g in grid if g >= done_to)]
    out = {
        "schema_version": "1.0",
        "generated_at_utc": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "account": rb.INTENTS, "complete": complete,
        "window": {"from_block": done_to, "to_block": to_block, "from_utc": rb.iso(t_from), "to_utc": rb.iso(t_to),
                   "days": round((t_to - t_from) / rb.DAY_NS, 3)},
        "grid_step_blocks": STEP, "min_jump_near": rb.REFILL_MIN_NEAR,
        "refill_count": len(refills), "refilled_near": round(sum(r["amount_near"] for r in refills), 2),
        "from_refiller_count": by_refiller, "other_sender_count": len(refills) - by_refiller - unresolved,
        "unresolved_count": unresolved,
        "from_refiller_pct": round(100 * by_refiller / len(refills), 2) if refills else None,
        "refills": refills, "samples": samples,
    }
    with open(OUT + ".tmp", "w") as f:
        json.dump(out, f, indent=1)
    os.replace(OUT + ".tmp", OUT)
    w = out["window"]
    print("refill trace: %d top-ups of %s over %.3f days (blocks %d to %d)%s"
          % (len(refills), rb.INTENTS, w["days"], w["from_block"], w["to_block"], "" if complete else "  [partial: ran out of time]"))
    print("  from %s: %d   other senders: %d   unresolved: %d   total %.2f NEAR"
          % (rb.REFILLER, by_refiller, out["other_sender_count"], unresolved, out["refilled_near"]))
    print("  network reads %d" % rd.reads)


if __name__ == "__main__":
    main()
