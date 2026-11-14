"""Offline checks of data/refills_30d.json (written by scripts/trace_refills.py). No network."""
import datetime, json, os, unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(ROOT, "data", "refills_30d.json")))


def ts(s):
    return datetime.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc).timestamp()


class Refills30d(unittest.TestCase):
    def test_counts_match_the_list(self):
        refills = R["refills"]
        self.assertEqual(R["refill_count"], len(refills))
        by = sum(1 for r in refills if r["predecessor_id"] == "intents_refiller.near")
        unresolved = sum(1 for r in refills if not r["predecessor_id"])
        self.assertEqual(R["from_refiller_count"], by)
        self.assertEqual(R["unresolved_count"], unresolved)
        self.assertEqual(R["other_sender_count"], len(refills) - by - unresolved)
        self.assertAlmostEqual(R["refilled_near"], sum(r["amount_near"] for r in refills), places=2)
        if refills:
            self.assertAlmostEqual(R["from_refiller_pct"], 100 * by / len(refills), places=2)

    def test_window_and_refills_are_consistent(self):
        w = R["window"]
        self.assertAlmostEqual(w["days"], (ts(w["to_utc"]) - ts(w["from_utc"])) / 86400, places=2)
        blocks = [r["block"] for r in R["refills"]]
        self.assertEqual(blocks, sorted(set(blocks)))
        for r in R["refills"]:
            self.assertTrue(w["from_block"] < r["block"] <= w["to_block"])
            self.assertGreater(r["free_after_near"] - r["free_before_near"], R["min_jump_near"])


if __name__ == "__main__":
    unittest.main()
