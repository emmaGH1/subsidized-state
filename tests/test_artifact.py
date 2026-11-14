"""Offline checks of data/artifact.json against data/SCHEMA.md. No network.

    python3 -m unittest discover tests
"""
import json, os, unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = json.load(open(os.path.join(ROOT, "data", "artifact.json")))
CLAIMS = json.load(open(os.path.join(ROOT, "tests", "claims.json")))
OPS = {"<": lambda a, b: a < b, "<=": lambda a, b: a <= b, ">": lambda a, b: a > b,
       ">=": lambda a, b: a >= b, "==": lambda a, b: a == b}


def lookup(path):
    o = ART
    for k in path.split("."):
        o = o[k]
    return o


class Shape(unittest.TestCase):
    def test_top_level_keys(self):
        for k in ["schema_version", "meta", "constants", "lock", "sawtooth", "payer", "issuance", "gas_burn",
                  "vaults", "gap", "facts", "claims", "sources"]:
            self.assertIn(k, ART)
        self.assertEqual(ART["schema_version"], "1.0")
        self.assertFalse(ART["meta"]["is_sample"])

    def test_required_sources(self):
        for k in ["block_final", "block_header_at_height", "view_account", "view_account_at_block",
                  "view_access_key_list", "chunk_receipts", "neardata_block", "protocol_config",
                  "validators_epoch_start", "pool_get_account", "dao_get_proposals", "multisig_confirmations",
                  "omft_acl", "signer_state", "ft_total_supply", "oneclick_tokens"]:
            self.assertIn(k, ART["sources"])
        for section in ["lock", "sawtooth", "payer", "issuance", "gas_burn"]:
            for s in ART[section]["sources"]:
                self.assertIn(s, ART["sources"])

    def test_constants(self):
        c = ART["constants"]
        self.assertEqual(c["near_per_mb"], int(c["storage_amount_per_byte_yocto"]) * 10 ** 6 / 10 ** 24)


class Lock(unittest.TestCase):
    def test_checkpoints(self):
        cps = ART["lock"]["checkpoints"]
        self.assertGreaterEqual(len(cps), 13)
        self.assertEqual(sorted(c["block"] for c in cps), [c["block"] for c in cps])
        per_byte = int(ART["constants"]["storage_amount_per_byte_yocto"])
        for c in cps:
            self.assertAlmostEqual(c["locked_near"], c["storage_usage_bytes"] * per_byte / 10 ** 24, delta=0.011)
            self.assertAlmostEqual(c["free_near"], c["amount_near"] - c["locked_near"], delta=0.021)
        self.assertEqual(cps[-1]["block"], ART["meta"]["head_block"])

    def test_growth(self):
        l = ART["lock"]
        cps, g = l["checkpoints"], l["growth_365d"]
        self.assertEqual(g["bytes"], cps[-1]["storage_usage_bytes"] - cps[0]["storage_usage_bytes"])
        self.assertAlmostEqual(g["near"], cps[-1]["locked_near"] - cps[0]["locked_near"], delta=0.021)
        self.assertAlmostEqual(g["near_per_year"], g["near"] / g["days"] * 365, delta=1.0)
        self.assertAlmostEqual(g["gb_per_year"], g["bytes"] / 1e9 / g["days"] * 365, delta=0.001)
        self.assertEqual(l["monotonic"], all(a["storage_usage_bytes"] < b["storage_usage_bytes"]
                                             for a, b in zip(cps, cps[1:])))
        self.assertTrue(360 <= g["days"] <= 370)


class Sawtooth(unittest.TestCase):
    def test_trace(self):
        s = ART["sawtooth"]
        blocks = [t["block"] for t in s["trace"]]
        self.assertGreaterEqual(len(blocks), 150)
        self.assertEqual(blocks, sorted(set(blocks)))
        self.assertEqual(s["free_min_near"], min(t["free_near"] for t in s["trace"]))
        self.assertEqual(s["free_max_near"], max(t["free_near"] for t in s["trace"]))

    def test_refills(self):
        s = ART["sawtooth"]
        pts = {t["block"]: t["free_near"] for t in s["trace"]}
        self.assertEqual(s["refill_count"], len(s["refills"]))
        self.assertAlmostEqual(s["refilled_near"], sum(r["amount_near"] for r in s["refills"]), delta=0.01)
        for r in s["refills"]:
            self.assertEqual(pts[r["block"] - 1], r["free_before_near"])
            self.assertEqual(pts[r["block"]], r["free_after_near"])
            self.assertGreater(r["free_after_near"] - r["free_before_near"], 100)
        # no unexplained step up of more than 100 NEAR between consecutive trace points
        refill_blocks = {r["block"] for r in s["refills"]}
        tr = s["trace"]
        for a, b in zip(tr, tr[1:]):
            if b["free_near"] - a["free_near"] > 100:
                self.assertIn(b["block"], refill_blocks)


class Ledger(unittest.TestCase):
    def test_issuance(self):
        for w in ("d365", "d30"):
            d = ART["issuance"][w]
            self.assertAlmostEqual(d["net_near"], d["supply_to_near"] - d["supply_from_near"], delta=0.021)
            expect = d["net_near"] / d["days"] * 365   # days is rounded to 3 decimals in the artifact
            self.assertAlmostEqual(d["annualized_near"] / expect, 1.0, delta=1e-4)
            self.assertEqual(d["to_block"], ART["meta"]["head_block"])

    def test_gas_burn(self):
        g = ART["gas_burn"]
        self.assertGreaterEqual(len(g["epochs"]), 1)
        for e in g["epochs"]:
            burned = (int(e["supply_first_yocto"]) - int(e["supply_last_yocto"])) / 10 ** 24
            self.assertAlmostEqual(e["burned_near"], burned, delta=0.011)
            self.assertGreater(burned, 0)
        total = sum(e["burned_near"] for e in g["epochs"])
        secs = sum(e["seconds"] for e in g["epochs"])
        self.assertAlmostEqual(g["burned_near_per_year"], total / secs * 31_536_000, delta=50)

    def test_gap(self):
        g = ART["gap"]
        self.assertEqual(g["lock_near_per_year"], ART["lock"]["growth_365d"]["near_per_year"])
        self.assertEqual(g["net_issuance_near_per_year"], ART["issuance"]["d365"]["annualized_near"])
        self.assertAlmostEqual(g["lock_pct_of_issuance"], g["lock_near_per_year"] / g["net_issuance_near_per_year"] * 100, delta=1e-4)
        self.assertAlmostEqual(g["multiple"], g["net_issuance_near_per_year"] / g["lock_near_per_year"], delta=0.051)
        self.assertAlmostEqual(g["state_gb_per_year_to_offset"], g["net_issuance_near_per_year"] / g["near_per_gb"], delta=0.051)

    def test_payer(self):
        p = ART["payer"]
        approved = [x for x in p["proposals_to_refiller"] if x["status"] == "Approved"]
        self.assertEqual(p["approved_to_refiller_count"], len(approved))
        self.assertAlmostEqual(p["approved_to_refiller_near"], sum(x["amount_near"] for x in approved), delta=0.01)

    def test_vaults_not_burned(self):
        for v in ART["vaults"].values():
            self.assertIs(v["burned"], False)


class Claims(unittest.TestCase):
    def test_claims_match_registration_and_recompute(self):
        self.assertEqual([c["id"] for c in ART["claims"]], [c["id"] for c in CLAIMS])
        for got, reg in zip(ART["claims"], CLAIMS):
            self.assertEqual(got["statement"], reg["statement"])
            self.assertEqual([(k["field"], k["op"], k["value"]) for k in got["checks"]],
                             [(k["field"], k["op"], k["value"]) for k in reg["checks"]])
            for k in got["checks"]:
                obs = lookup(k["field"])
                self.assertEqual(k["observed"], obs)
                self.assertEqual(k["pass"], obs is not None and OPS[k["op"]](obs, k["value"]))
            self.assertEqual(got["pass"], all(k["pass"] for k in got["checks"]))


if __name__ == "__main__":
    unittest.main()
