"""Append-only supply-chain ledger. SHA-256 linked events."""

from __future__ import annotations

import hashlib
import json
from typing import Any

GENESIS = "0" * 64


def canonical(payload: dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def event_hash(event: dict[str, Any], prev_hash: str) -> str:
    body = {
        "seq": event["seq"],
        "tipo": event["tipo"],
        "attore": event["attore"],
        "luogo": event["luogo"],
        "quando": event["quando"],
        "lotto": event.get("lotto") or "",
        "note": event.get("note") or "",
        "prev_hash": prev_hash,
        "prodotto_id": event["prodotto_id"],
    }
    return hashlib.sha256(canonical(body).encode("utf-8")).hexdigest()


def seal_chain(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ordered = sorted(events, key=lambda e: int(e["seq"]))
    prev = GENESIS
    sealed: list[dict[str, Any]] = []
    for raw in ordered:
        event = dict(raw)
        event["prev_hash"] = prev
        event["hash"] = event_hash(event, prev)
        prev = event["hash"]
        sealed.append(event)
    return sealed


def verify_chain(events: list[dict[str, Any]]) -> dict[str, Any]:
    if not events:
        return {"ok": True, "length": 0, "tip": GENESIS, "errors": []}
    ordered = sorted(events, key=lambda e: int(e["seq"]))
    errors: list[str] = []
    prev = GENESIS
    for index, event in enumerate(ordered, start=1):
        expected_seq = index
        if int(event["seq"]) != expected_seq:
            errors.append(f"seq gap at {event.get('id')}: expected {expected_seq}")
        if event.get("prev_hash") != prev:
            errors.append(f"broken link at {event.get('id')}")
        recomputed = event_hash(event, prev)
        if event.get("hash") != recomputed:
            errors.append(f"hash mismatch at {event.get('id')}")
        prev = event.get("hash") or recomputed
    return {
        "ok": len(errors) == 0,
        "length": len(ordered),
        "tip": prev,
        "errors": errors,
    }
