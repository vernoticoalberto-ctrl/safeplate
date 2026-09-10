"""Demo passports (not real medical records) plus profile helpers."""

from __future__ import annotations

from typing import Any

from protocol.core.matching import Profile
from protocol.modules.catalog import load_json


def load_demo_passports() -> list[dict[str, Any]]:
    return load_json("utenti.json")


def profile_from_record(record: dict[str, Any]) -> Profile:
    return Profile(
        public_id=record["id"],
        allergens=list(record.get("allergeni") or []),
        pregnancy=bool(record.get("gravidanza")),
        diabetes=bool(record.get("diabete")),
        hypertension=bool(record.get("ipertensione")),
        sugar_limit_g=record.get("limite_zucchero_g"),
        sodium_limit_mg=record.get("limite_sodio_mg"),
    )
