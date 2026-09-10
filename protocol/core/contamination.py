"""Cross-contamination vectors: shared oil, airborne flour, shared surfaces."""

from __future__ import annotations

from typing import Any


EMPTY_VECTORS = {
    "farina_volatile": False,
    "olio_frittura_condiviso": False,
    "allergeni_olio": [],
    "superfici_condivise": False,
    "allergeni_superfici": [],
}


def merge_vectors(restaurant: dict[str, Any] | None, dish: dict[str, Any] | None) -> dict[str, Any]:
    r = restaurant or {}
    d = dish or {}
    farina = bool(r.get("farina_volatile") or d.get("farina_volatile"))
    superfici = bool(r.get("superfici_condivise") or d.get("superfici_condivise"))
    surfaces = sorted(set(r.get("allergeni_superfici") or []) | set(d.get("allergeni_superfici") or []))
    if "olio_frittura_condiviso" in d:
        olio = bool(d.get("olio_frittura_condiviso"))
        oil = list(d.get("allergeni_olio") or [])
        if olio and not oil:
            oil = list(r.get("allergeni_olio") or [])
    else:
        olio = bool(r.get("olio_frittura_condiviso"))
        oil = list(r.get("allergeni_olio") or [])
    return {
        "farina_volatile": farina,
        "olio_frittura_condiviso": olio,
        "allergeni_olio": sorted(set(oil)),
        "superfici_condivise": superfici,
        "allergeni_superfici": surfaces,
    }
