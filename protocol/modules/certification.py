"""Digital self-certification and liability-shield (manleva) hash."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any

from protocol.core.blockchain import canonical


DECLARATION = (
    "Dichiaro, in qualità di operatore del settore alimentare, che gli ingredienti, "
    "i lotti e i protocolli di contaminazione incrociata comunicati a SafePlate sono "
    "veritieri. Accetto che il protocollo restituisca al personale di sala solo lo "
    "stato Sicuro / Attenzione / Non sicuro, senza dati sanitari dell'ospite. "
    "Se il protocollo certificato viene seguito, la manleva digitale sposta la "
    "responsabilità operativa sull'algoritmo validato, fermi restando gli obblighi "
    "di legge inderogabili."
)


def sign_declaration(
    *,
    restaurant_name: str,
    city: str,
    signature_name: str,
    protocols: list[str],
) -> dict[str, Any]:
    payload = {
        "ristorante": restaurant_name,
        "citta": city,
        "firmatario": signature_name,
        "protocolli": protocols,
        "testo": DECLARATION,
        "quando": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    }
    digest = hashlib.sha256(canonical(payload).encode("utf-8")).hexdigest()
    payload["hash"] = digest
    payload["stato"] = "certified"
    return payload
