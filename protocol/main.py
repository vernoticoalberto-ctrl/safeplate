#!/usr/bin/env python3
"""First-run verification of the SafePlate protocol with trial data."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from protocol.core.allergens import STATUS_LABEL
from protocol.core.blockchain import verify_chain
from protocol.core.matching import evaluate_dish
from protocol.core.qr import encode_payload
from protocol.manuale import MANUALE
from protocol.modules.catalog import load_catalog
from protocol.modules.certification import sign_declaration
from protocol.modules.reports import build_report
from protocol.modules.users import load_demo_passports, profile_from_record


def main() -> int:
    catalog = load_catalog()
    passports = load_demo_passports()
    print("SafePlate protocol — caricamento dati di prova")
    print(f"  fornitori  {len(catalog['fornitori'])}")
    print(f"  prodotti   {len(catalog['prodotti'])}")
    print(f"  ristoranti {len(catalog['ristoranti'])}")
    print(f"  piatti     {len(catalog['piatti'])}")
    print(f"  eventi     {len(catalog['filiera'])}")
    print(f"  identità   {len(passports)}")
    print(f"  manuale    {MANUALE['versione']} · {len(MANUALE['capitoli'])} capitoli")

    broken = 0
    for product_id, events in catalog["filiera_by_product"].items():
        check = verify_chain(events)
        mark = "OK" if check["ok"] else "FAIL"
        if not check["ok"]:
            broken += 1
        print(f"  catena {product_id:18} {mark}  blocchi={check['length']}  tip={check['tip'][:12]}…")
        if not check["ok"]:
            for err in check["errors"]:
                print(f"           {err}")

    print("\nIncroci dimostrativi (il kiosk vedrebbe solo lo stato):")
    trials = [
        ("SP-DEMO-CELIA", "dish-carbonara"),
        ("SP-DEMO-CELIA", "dish-air-quinoa"),
        ("SP-DEMO-CELIA", "dish-quinoa-osteria"),
        ("SP-DEMO-MARE", "dish-cruise-pollo"),
        ("SP-DEMO-GRAVID", "dish-crudo"),
        ("SP-DEMO-DIAB", "dish-tiramisu"),
        ("SP-DEMO-LATTE", "dish-pizza"),
        ("SP-DEMO-MULTI", "dish-salsa-segreta"),
    ]
    by_passport = {p["id"]: p for p in passports}
    for pid, dish_id in trials:
        profile = profile_from_record(by_passport[pid])
        dish = catalog["piatti_by_id"][dish_id]
        restaurant = catalog["ristoranti_by_id"][dish["ristorante_id"]]
        result = evaluate_dish(dish, restaurant, catalog["prodotti_by_id"], profile)
        print(f"  {pid:16} × {dish['nome'][:28]:28} → {STATUS_LABEL[result.status]}")
        print(f"     kiosk: {json.dumps(result.public(), ensure_ascii=False)}")

    print("\nQR (nessun dato sanitario nel payload):")
    for passport in passports[:3]:
        print(" ", encode_payload(passport["id"]))

    cert = sign_declaration(
        restaurant_name="Osteria del Borgo",
        city="Roma",
        signature_name="Maria Benedetti",
        protocols=["farina volatile", "olio frittura", "schede fornitore"],
    )
    print(f"\nAutocertificazione hash={cert['hash'][:16]}…")
    report = build_report(nome="Snack etnico ignoto", marca="Sconosciuta", note="Etichetta in arabo")
    print(f"Segnalazione WhatsApp: {report['whatsapp'][:64]}…")

    if broken:
        print(f"\nFAIL: {broken} catene non integre")
        return 1
    print("\nOK — dati di prova caricati, motore e filiera verificati.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
