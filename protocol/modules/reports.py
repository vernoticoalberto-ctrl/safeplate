"""Inbound reports for uncatalogued products (WhatsApp / mail / photo)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote


def build_report(
    *,
    nome: str,
    marca: str = "",
    note: str = "",
    analisi: str = "",
) -> dict[str, Any]:
    body = (
        f"Segnalazione SafePlate — prodotto non catalogato\n"
        f"Nome: {nome}\n"
        f"Marca: {marca or '—'}\n"
        f"Note: {note or '—'}\n"
        f"Analisi IA: {analisi or 'in attesa'}\n"
    )
    mail = (
        "mailto:segnalazioni@safeplate.eu"
        f"?subject={quote('SafePlate: prodotto non catalogato — ' + nome)}"
        f"&body={quote(body)}"
    )
    whatsapp = "https://wa.me/?text=" + quote(body)
    return {
        "nome": nome,
        "marca": marca,
        "note": note,
        "analisi": analisi,
        "creato_il": datetime.now(timezone.utc).isoformat(),
        "mailto": mail,
        "whatsapp": whatsapp,
        "stato": "open",
    }
