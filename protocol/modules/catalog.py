"""Load EU-bound JSON catalogs (suppliers, products, dishes, chain)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from protocol.core.blockchain import seal_chain

DATI = Path(__file__).resolve().parent.parent / "dati"


def load_json(name: str) -> Any:
    path = DATI / name
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def load_catalog() -> dict[str, Any]:
    fornitori = load_json("fornitori.json")
    prodotti = load_json("prodotti.json")
    ristoranti = load_json("ristoranti.json")
    piatti = load_json("piatti.json")
    filiera = load_json("filiera.json")
    sealed: list[dict[str, Any]] = []
    by_product: dict[str, list[dict[str, Any]]] = {}
    for event in filiera:
        by_product.setdefault(event["prodotto_id"], []).append(event)
    for product_id, events in by_product.items():
        sealed.extend(seal_chain(events))
    return {
        "fornitori": fornitori,
        "prodotti": prodotti,
        "ristoranti": ristoranti,
        "piatti": piatti,
        "filiera": sealed,
        "prodotti_by_id": {p["id"]: p for p in prodotti},
        "ristoranti_by_id": {r["id"]: r for r in ristoranti},
        "piatti_by_id": {p["id"]: p for p in piatti},
        "filiera_by_product": {
            pid: [e for e in sealed if e["prodotto_id"] == pid] for pid in {e["prodotto_id"] for e in sealed}
        },
    }
