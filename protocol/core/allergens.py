"""EU 14 allergens plus SafePlate Health / Pregnancy expansions."""

from __future__ import annotations

from typing import TypedDict


class Allergen(TypedDict):
    id: str
    label: str
    regolamento: str


EU14: list[Allergen] = [
    {"id": "glutine", "label": "Cereali con glutine", "regolamento": "Reg. UE 1169/2011 All. II.1"},
    {"id": "crostacei", "label": "Crostacei", "regolamento": "Reg. UE 1169/2011 All. II.2"},
    {"id": "uova", "label": "Uova", "regolamento": "Reg. UE 1169/2011 All. II.3"},
    {"id": "pesce", "label": "Pesce", "regolamento": "Reg. UE 1169/2011 All. II.4"},
    {"id": "arachidi", "label": "Arachidi", "regolamento": "Reg. UE 1169/2011 All. II.5"},
    {"id": "soia", "label": "Soia", "regolamento": "Reg. UE 1169/2011 All. II.6"},
    {"id": "latte", "label": "Latte e lattosio", "regolamento": "Reg. UE 1169/2011 All. II.7"},
    {"id": "frutta_guscio", "label": "Frutta a guscio", "regolamento": "Reg. UE 1169/2011 All. II.8"},
    {"id": "sedano", "label": "Sedano", "regolamento": "Reg. UE 1169/2011 All. II.9"},
    {"id": "senape", "label": "Senape", "regolamento": "Reg. UE 1169/2011 All. II.10"},
    {"id": "sesamo", "label": "Sesamo", "regolamento": "Reg. UE 1169/2011 All. II.11"},
    {"id": "solfiti", "label": "Anidride solforosa e solfiti", "regolamento": "Reg. UE 1169/2011 All. II.12"},
    {"id": "lupini", "label": "Lupini", "regolamento": "Reg. UE 1169/2011 All. II.13"},
    {"id": "molluschi", "label": "Molluschi", "regolamento": "Reg. UE 1169/2011 All. II.14"},
]

ALLERGENS: dict[str, Allergen] = {a["id"]: a for a in EU14}

STATUS_SAFE = "safe"
STATUS_CAUTION = "caution"
STATUS_UNSAFE = "unsafe"

STATUS_RANK = {STATUS_SAFE: 0, STATUS_CAUTION: 1, STATUS_UNSAFE: 2}

STATUS_LABEL = {
    STATUS_SAFE: "Certificato sicuro",
    STATUS_CAUTION: "Prestare attenzione",
    STATUS_UNSAFE: "Non sicuro",
}


def allergen_label(allergen_id: str) -> str:
    item = ALLERGENS.get(allergen_id)
    return item["label"] if item else allergen_id


def worse(a: str, b: str) -> str:
    return a if STATUS_RANK[a] >= STATUS_RANK[b] else b
