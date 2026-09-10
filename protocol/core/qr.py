"""SafePlate ID payload. The QR never embeds medical data."""

from __future__ import annotations

PREFIX = "SAFEPLATE"
VERSION = "v1"


def encode_payload(public_id: str, origin: str | None = None) -> str:
    public_id = public_id.strip()
    if origin:
        return f"{origin.rstrip('/')}/kiosk?pid={public_id}"
    return f"{PREFIX}:{VERSION}:{public_id}"


def parse_payload(raw: str) -> str | None:
    text = raw.strip()
    if "pid=" in text:
        from urllib.parse import parse_qs, urlparse

        query = parse_qs(urlparse(text).query)
        values = query.get("pid") or []
        return values[0] if values else None
    parts = text.split(":")
    if len(parts) == 3 and parts[0] == PREFIX and parts[1] == VERSION:
        return parts[2]
    if text.startswith("SP-"):
        return text
    return None
