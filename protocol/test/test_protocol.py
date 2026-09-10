#!/usr/bin/env python3
"""Protocol unit tests — run with: python3 -m protocol.test.test_protocol"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from protocol.core.allergens import STATUS_CAUTION, STATUS_SAFE, STATUS_UNSAFE
from protocol.core.blockchain import seal_chain, verify_chain
from protocol.core.matching import evaluate_dish
from protocol.core.qr import encode_payload, parse_payload
from protocol.manuale import MANUALE, capitolo, to_json, to_markdown
from protocol.modules.catalog import load_catalog
from protocol.modules.users import load_demo_passports, profile_from_record


class ProtocolTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.catalog = load_catalog()
        cls.passports = {p["id"]: profile_from_record(p) for p in load_demo_passports()}

    def eval_dish(self, passport_id: str, dish_id: str):
        dish = self.catalog["piatti_by_id"][dish_id]
        restaurant = self.catalog["ristoranti_by_id"][dish["ristorante_id"]]
        return evaluate_dish(dish, restaurant, self.catalog["prodotti_by_id"], self.passports[passport_id])

    def test_carbonara_unsafe_for_eggs(self) -> None:
        result = self.eval_dish("SP-DEMO-UOVA", "dish-carbonara")
        self.assertEqual(result.status, STATUS_UNSAFE)
        self.assertTrue(any("Uova" in r for r in result.reasons))

    def test_airline_quinoa_safe_for_celiac(self) -> None:
        result = self.eval_dish("SP-DEMO-CELIA", "dish-air-quinoa")
        self.assertEqual(result.status, STATUS_SAFE)
        self.assertEqual(result.public(), {"status": "safe"})
        self.assertNotIn("allergeni", result.public())

    def test_osteria_quinoa_caution_airborne_flour(self) -> None:
        result = self.eval_dish("SP-DEMO-CELIA", "dish-quinoa-osteria")
        self.assertEqual(result.status, STATUS_CAUTION)

    def test_pending_sauce_is_yellow(self) -> None:
        result = self.eval_dish("SP-DEMO-CELIA", "dish-salsa-segreta")
        self.assertIn(result.status, (STATUS_CAUTION, STATUS_UNSAFE))
        self.assertTrue(any("non" in r.lower() or "certificat" in r.lower() for r in result.reasons) or result.status == STATUS_UNSAFE)

    def test_pregnancy_blocks_smoked_salmon(self) -> None:
        result = self.eval_dish("SP-DEMO-GRAVID", "dish-crudo")
        self.assertEqual(result.status, STATUS_UNSAFE)

    def test_diabetes_flags_tiramisu(self) -> None:
        result = self.eval_dish("SP-DEMO-DIAB", "dish-tiramisu")
        self.assertEqual(result.status, STATUS_CAUTION)

    def test_shared_fry_oil_on_cruise_chicken(self) -> None:
        result = self.eval_dish("SP-DEMO-MARE", "dish-cruise-pollo")
        self.assertEqual(result.status, STATUS_UNSAFE)

    def test_kiosk_payload_has_no_medical_fields(self) -> None:
        result = self.eval_dish("SP-DEMO-MULTI", "dish-pizza")
        public = result.public()
        self.assertEqual(set(public.keys()), {"status"})

    def test_qr_never_embeds_allergens(self) -> None:
        payload = encode_payload("SP-DEMO-CELIA")
        self.assertNotIn("glutine", payload)
        self.assertEqual(parse_payload(payload), "SP-DEMO-CELIA")
        self.assertEqual(parse_payload("https://safeplate.eu/kiosk?pid=SP-DEMO-LATTE"), "SP-DEMO-LATTE")

    def test_blockchain_seals_and_verifies(self) -> None:
        events = self.catalog["filiera_by_product"]["prod-semola"]
        check = verify_chain(events)
        self.assertTrue(check["ok"], check["errors"])
        tampered = [dict(e) for e in events]
        tampered[2]["note"] = "altered"
        tampered[2]["hash"] = "deadbeef"
        self.assertFalse(verify_chain(tampered)["ok"])

    def test_catalog_counts(self) -> None:
        self.assertGreaterEqual(len(self.catalog["fornitori"]), 8)
        self.assertGreaterEqual(len(self.catalog["prodotti"]), 12)
        self.assertGreaterEqual(len(load_demo_passports()), 6)

    def test_seal_is_deterministic(self) -> None:
        raw = [e for e in self.catalog["filiera"] if e["prodotto_id"] == "prod-olio"]
        # already sealed; reseal the unhashed fields
        stripped = [{k: v for k, v in e.items() if k not in {"hash", "prev_hash"}} for e in raw]
        a = seal_chain(stripped)
        b = seal_chain(list(reversed(stripped)))
        self.assertEqual([e["hash"] for e in a], [e["hash"] for e in b])

    def test_manuale_roles_and_export(self) -> None:
        ids = [c["id"] for c in MANUALE["capitoli"]]
        self.assertEqual(ids, ["ospite", "sala", "ristoratore", "fornitore", "privacy"])
        self.assertTrue(capitolo("sala")["titolo"])
        blob = to_json()
        self.assertIn("SP-DEMO-CELIA", blob)
        md = to_markdown()
        self.assertIn("Manuale di utilizzo", md)
        self.assertIn("GDPR by design", md)


if __name__ == "__main__":
    unittest.main(verbosity=2)
