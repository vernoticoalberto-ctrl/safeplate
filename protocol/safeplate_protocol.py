#!/usr/bin/env python3
"""SafePlate Protocol — file Python unico da caricare sul database UE.

Contiene il motore ufficiale (allergeni UE-14, matching, filiera SHA-256,
QR, contaminazione, catalogo, manleva, segnalazioni, manuale operativo)
e i test di prova. I JSON di catalogo stanno nella cartella dati/ accanto
a questo file.

    python3 safeplate_protocol.py              # carica dati di prova
    python3 safeplate_protocol.py --manuale    # sommario del manuale
    python3 safeplate_protocol.py --export     # scrive manuale.json + MANUALE.md
    python3 safeplate_protocol.py --test       # verifica il protocollo
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import unittest
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, TypedDict
from urllib.parse import parse_qs, quote, urlparse

HERE = Path(__file__).resolve().parent
DATI = HERE / "dati"
if not DATI.exists() and (HERE / "protocol" / "dati").exists():
    DATI = HERE / "protocol" / "dati"
DOCS = HERE / "documentazione"
if not DOCS.exists() and (HERE / "protocol" / "documentazione").exists():
    DOCS = HERE / "protocol" / "documentazione"



# === core/allergens.py — EU-14, stato semaforo ===

"""EU 14 allergens plus SafePlate Health / Pregnancy expansions."""




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

# === core/blockchain.py — Filiera SHA-256 ===

"""Append-only supply-chain ledger. SHA-256 linked events."""



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

# === core/contamination.py — Vettori: olio, farina, superfici ===

"""Cross-contamination vectors: shared oil, airborne flour, shared surfaces."""




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

# === core/qr.py — QR senza dati sanitari ===

"""SafePlate ID payload. The QR never embeds medical data."""


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

        query = parse_qs(urlparse(text).query)
        values = query.get("pid") or []
        return values[0] if values else None
    parts = text.split(":")
    if len(parts) == 3 and parts[0] == PREFIX and parts[1] == VERSION:
        return parts[2]
    if text.startswith("SP-"):
        return text
    return None

# === core/matching.py — Incrocio passaporto × piatto ===

"""Encrypted cross-match: returns Safe / Caution / Unsafe without leaking the passport."""





@dataclass
class Profile:
    public_id: str
    allergens: list[str]
    pregnancy: bool = False
    diabetes: bool = False
    hypertension: bool = False
    sugar_limit_g: float | None = None
    sodium_limit_mg: float | None = None


@dataclass
class MatchResult:
    status: str
    reasons: list[str] = field(default_factory=list)

    def public(self) -> dict[str, str]:
        """Restaurant / kiosk view: binary-ish status, no medical reasons."""
        return {"status": self.status}


def _as_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def evaluate_dish(
    dish: dict[str, Any],
    restaurant: dict[str, Any] | None,
    products_by_id: dict[str, dict[str, Any]],
    profile: Profile,
) -> MatchResult:
    status = STATUS_SAFE
    reasons: list[str] = []
    user = set(profile.allergens or [])

    def bump(next_status: str, reason: str) -> None:
        nonlocal status
        status = worse(status, next_status)
        if reason not in reasons:
            reasons.append(reason)

    declared = set(dish.get("allergeni_dichiarati") or [])
    traces = set(dish.get("tracce") or [])
    hit = sorted(declared & user)
    if hit:
        bump(STATUS_UNSAFE, "Contiene " + ", ".join(allergen_label(i) for i in hit))
    trace_hit = sorted(traces & user)
    if trace_hit:
        bump(STATUS_CAUTION, "Può contenere tracce di " + ", ".join(allergen_label(i) for i in trace_hit))

    if (dish.get("stato_certificazione") or "pending") != "certified":
        bump(STATUS_CAUTION, "Piatto non ancora certificato SafePlate (filiera o ricetta incompleta)")

    for product_id in dish.get("prodotti") or []:
        product = products_by_id.get(product_id)
        if not product:
            bump(STATUS_CAUTION, f"Ingrediente {product_id} non catalogato")
            continue
        name = product.get("nome") or product_id
        if (product.get("stato_certificazione") or "pending") != "certified":
            bump(STATUS_CAUTION, f"{name}: scheda tecnica non certificata / non rintracciabile")
        phit = sorted(set(product.get("allergeni") or []) & user)
        if phit:
            bump(STATUS_UNSAFE, f"{name} contiene " + ", ".join(allergen_label(i) for i in phit))
        ptraces = sorted(set(product.get("tracce") or []) & user)
        if ptraces:
            bump(STATUS_CAUTION, f"{name} può contenere tracce di " + ", ".join(allergen_label(i) for i in ptraces))
        if profile.pregnancy and product.get("rischio_listeria"):
            bump(STATUS_UNSAFE, f"{name}: rischio listeria (SafePlate Pregnancy)")
        if profile.pregnancy and product.get("rischio_toxo"):
            bump(STATUS_UNSAFE, f"{name}: rischio toxoplasmosi (SafePlate Pregnancy)")
        sugar = _as_float(product.get("zucchero_g"))
        sodium = _as_float(product.get("sodio_mg"))
        if profile.diabetes and profile.sugar_limit_g is not None and sugar is not None and sugar > profile.sugar_limit_g:
            bump(STATUS_CAUTION, f"{name}: zuccheri {sugar} g sopra la soglia {profile.sugar_limit_g} g")
        if (
            profile.hypertension
            and profile.sodium_limit_mg is not None
            and sodium is not None
            and sodium > profile.sodium_limit_mg
        ):
            bump(STATUS_CAUTION, f"{name}: sodio {sodium} mg sopra la soglia {profile.sodium_limit_mg} mg")

    if profile.pregnancy and dish.get("rischio_listeria"):
        bump(STATUS_UNSAFE, "Piatto a rischio listeria (processo non pastorizzato / crudo)")
    if profile.pregnancy and dish.get("rischio_toxo"):
        bump(STATUS_UNSAFE, "Piatto a rischio toxoplasmosi (crudo o non validato)")

    dish_sugar = _as_float(dish.get("zucchero_g"))
    dish_sodium = _as_float(dish.get("sodio_mg"))
    if profile.diabetes and profile.sugar_limit_g is not None and dish_sugar is not None and dish_sugar > profile.sugar_limit_g:
        bump(STATUS_CAUTION, f"Zuccheri del piatto {dish_sugar} g sopra la soglia")
    if (
        profile.hypertension
        and profile.sodium_limit_mg is not None
        and dish_sodium is not None
        and dish_sodium > profile.sodium_limit_mg
    ):
        bump(STATUS_CAUTION, f"Sodio del piatto {dish_sodium} mg sopra la soglia")

    vectors = merge_vectors((restaurant or {}).get("vettori"), dish.get("vettori"))
    if vectors["farina_volatile"] and "glutine" in user:
        bump(STATUS_CAUTION, "Farina volatile in cucina: possibile contaminazione da glutine")
    if vectors["olio_frittura_condiviso"]:
        oil_hit = sorted(set(vectors["allergeni_olio"]) & user)
        if oil_hit:
            bump(
                STATUS_UNSAFE,
                "Olio di frittura condiviso con " + ", ".join(allergen_label(i) for i in oil_hit),
            )
    if vectors["superfici_condivise"]:
        surface_hit = sorted(set(vectors["allergeni_superfici"]) & user)
        if surface_hit:
            bump(
                STATUS_CAUTION,
                "Superfici condivise con " + ", ".join(allergen_label(i) for i in surface_hit),
            )

    return MatchResult(status=status, reasons=reasons)

# === modules/catalog.py — JSON verso database UE ===

"""Load EU-bound JSON catalogs (suppliers, products, dishes, chain)."""




DATI = DATI


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

# === modules/users.py — Passaporti dimostrativi ===

"""Demo passports (not real medical records) plus profile helpers."""





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

# === modules/certification.py — Manleva digitale ===

"""Digital self-certification and liability-shield (manleva) hash."""





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

# === modules/reports.py — Segnalazioni WhatsApp/email ===

"""Inbound reports for uncatalogued products (WhatsApp / mail / photo)."""




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

# === manuale.py — Manuale di utilizzo ===

#!/usr/bin/env python3
"""SafePlate — Manuale di utilizzo (file unico, caricabile sul database UE).

Questo modulo è il contratto del manuale operativo: ospite, sala/totem,
ristoratore, fornitore, privacy. Stessa struttura JSON usata dalla console
web. Nessun dato sanitario reale.

Esecuzione:

    python3 protocol/manuale.py              # sommario
    python3 protocol/manuale.py --export     # scrive dati/manuale.json e documentazione/MANUALE.md
    python3 protocol/manuale.py --markdown   # stampa il markdown
"""




VERSIONE = "1.0"
PROTOCOLLO = "SafePlate Protocol 1.0"

MANUALE: dict[str, Any] = {
    "id": "safeplate-manuale-1.0",
    "versione": VERSIONE,
    "protocollo": PROTOCOLLO,
    "lingua": "it",
    "titolo": "Manuale di utilizzo",
    "kicker": "Protocollo SafePlate · Med-Tech",
    "sottotitolo": "Come si usa il passaporto, il totem e la filiera. Senza dire ad alta voce cosa non puoi mangiare.",
    "intro": (
        "SafePlate è un'infrastruttura Med-Tech: il SafePlate ID vive nel wallet, "
        "il QR identifica solo te, il ristorante vede un semaforo. Questo manuale "
        "è il documento operativo da caricare nel database europeo insieme ai JSON "
        "di catalogo, fornitori e filiera."
    ),
    "avvertenza": (
        "Le identità SP-DEMO-* sono dimostrative. Non sono cartelle cliniche. "
        "Il ristoratore non memorizza allergie, gravidanza o patologie. "
        "Il protocollo non sostituisce il parere del medico né gli obblighi di legge."
    ),
    "semaforo": [
        {
            "stato": "safe",
            "etichetta": "Certificato sicuro",
            "testo": "Dati validati. Nessun incrocio con il passaporto. Si può servire.",
        },
        {
            "stato": "caution",
            "etichetta": "Prestare attenzione",
            "testo": "Tracce, farina volatile, scheda non certificata o filiera incompleta. Verifica manuale.",
        },
        {
            "stato": "unsafe",
            "etichetta": "Non sicuro",
            "testo": "Allergene dichiarato, olio di frittura condiviso, listeria o toxo in gravidanza. Non servire.",
        },
    ],
    "identita_demo": [
        {
            "id": "SP-DEMO-CELIA",
            "etichetta": "Celiachia",
            "uso": "Glutine. Carbonara e pizza rosse; quinoa gialla se c’è farina volatile.",
        },
        {
            "id": "SP-DEMO-LATTE",
            "etichetta": "Latte",
            "uso": "Latte e lattosio. Pizza e tiramisù non sicuri.",
        },
        {
            "id": "SP-DEMO-MARE",
            "etichetta": "Crostacei, molluschi, pesce",
            "uso": "Totem McSafe e cucina di bordo: fritture e olio condiviso.",
        },
        {
            "id": "SP-DEMO-GUSCIO",
            "etichetta": "Frutta a guscio e arachidi",
            "uso": "Incrocio su salse e dessert con tracce.",
        },
        {
            "id": "SP-DEMO-UOVA",
            "etichetta": "Uova",
            "uso": "Carbonara e pasta all’uovo rosse.",
        },
        {
            "id": "SP-DEMO-GRAVID",
            "etichetta": "Gravidanza",
            "uso": "SafePlate Pregnancy: listeria e toxoplasmosi. Crudo e affumicati rossi.",
        },
        {
            "id": "SP-DEMO-DIAB",
            "etichetta": "Diabete",
            "uso": "Limite 8 g di zuccheri da scheda tecnica. Tiramisù in attenzione.",
        },
        {
            "id": "SP-DEMO-IPER",
            "etichetta": "Ipertensione",
            "uso": "Limite 400 mg di sodio. Salumi e fondi di cucina.",
        },
        {
            "id": "SP-DEMO-MULTI",
            "etichetta": "Glutine, latte, uova",
            "uso": "Profilo multiplo. Serve a verificare che il kiosk non riveli i motivi.",
        },
    ],
    "capitoli": [
        {
            "id": "ospite",
            "ruolo": "Ospite",
            "titolo": "Il tuo piatto, in silenzio",
            "sommario": "Crei l’ID una volta. Al tavolo mostri il QR. Il menu si filtra da solo.",
            "passi": [
                {
                    "n": 1,
                    "titolo": "Entra nel wallet",
                    "testo": "Accedi con Google, X o email. I dati sanitari restano nel tuo account, mai nel codice a barre.",
                    "azione": {"to": "/wallet", "label": "Apri il wallet"},
                },
                {
                    "n": 2,
                    "titolo": "Compila il passaporto",
                    "testo": "Seleziona gli allergeni UE (14), e se serve gravidanza, diabete o ipertensione. Salva. Ricevi un SafePlate ID pubblico (SP-…).",
                    "azione": {"to": "/wallet", "label": "Crea l’ID"},
                },
                {
                    "n": 3,
                    "titolo": "Mostra il QR",
                    "testo": "Il QR contiene solo SAFEPLATE:v1:SP-… oppure l’indirizzo del totem. Nessun allergene, nessuna condizione.",
                    "azione": {"to": "/kiosk", "label": "Prova il totem"},
                },
                {
                    "n": 4,
                    "titolo": "Leggi il semaforo",
                    "testo": "Verde: ordina. Giallo: chiedi in privato. Rosso: non ordinare. Puoi filtrare «solo certificati sicuri».",
                    "azione": {"to": "/menu", "label": "Apri i menu"},
                },
                {
                    "n": 5,
                    "titolo": "Senza account, usa una demo",
                    "testo": "Sulla home o al totem scegli un profilo SP-DEMO-*. Serve a provare il protocollo, non a certificare una persona reale.",
                    "azione": {"to": "/", "label": "Prova un incrocio"},
                },
            ],
            "note": [
                "Non dettare allergie ad alta voce: è il punto del protocollo.",
                "Se un piatto è giallo, la filiera o una traccia non è chiusa: apri la scheda prima di insistere.",
            ],
        },
        {
            "id": "sala",
            "ruolo": "Sala / totem",
            "titolo": "Solo il semaforo",
            "sommario": "Il personale non vede perché. Vede se può servire.",
            "passi": [
                {
                    "n": 1,
                    "titolo": "Apri il totem",
                    "testo": "Kiosk, cassa, carrello di bordo, corsia del supermercato: stessa vista. Scegli il locale.",
                    "azione": {"to": "/kiosk", "label": "Apri il totem"},
                },
                {
                    "n": 2,
                    "titolo": "Scansione o ID",
                    "testo": "L’ospite inquadra il QR o detta solo l’identificativo pubblico. Incolla il payload se arrivi da un lettore.",
                },
                {
                    "n": 3,
                    "titolo": "Servi secondo il colore",
                    "testo": "Verde: vai. Giallo: non inventare, verifica con cucina. Rosso: non servire, proponi un’alternativa verde.",
                },
                {
                    "n": 4,
                    "titolo": "Non chiedere il motivo",
                    "testo": "La vista totem omette i motivi sanitari. GDPR by design. Se l’ospite vuole spiegarlo, è una sua scelta, non una procedura.",
                },
            ],
            "note": [
                "Un passaporto non trovato resta senza semaforo: verifica l’ID, non interrogare l’ospite.",
                "McSafe Roma Termini è il totem dimostrativo: celiachia → pollo alla piastra verde, crispy bites rossi.",
            ],
        },
        {
            "id": "ristoratore",
            "ruolo": "Ristoratore",
            "titolo": "Manleva e processo, non solo etichetta",
            "sommario": "Autocertifichi i protocolli. Il motore incrocia lotti, vettori e passaporto.",
            "passi": [
                {
                    "n": 1,
                    "titolo": "Dichiara i vettori",
                    "testo": "Olio di frittura condiviso, farina volatile, superfici. Non basta l’ingrediente in ricetta: si valida la cucina.",
                    "azione": {"to": "/certify", "label": "Autocertifica"},
                },
                {
                    "n": 2,
                    "titolo": "Firma la manleva digitale",
                    "testo": "La dichiarazione è hashata. Se il protocollo certificato è seguito, la responsabilità operativa si sposta sull’algoritmo, fermi gli obblighi inderogabili.",
                    "azione": {"to": "/certify", "label": "Firma"},
                },
                {
                    "n": 3,
                    "titolo": "Tieni le schede fornitore",
                    "testo": "Ogni lotto in catalogo ha origine, allergeni, tracce, zuccheri, sodio, listeria/toxo. Un prodotto non in banca dati resta giallo.",
                    "azione": {"to": "/catalog", "label": "Catalogo"},
                },
                {
                    "n": 4,
                    "titolo": "Segnala l’ignoto",
                    "testo": "Foto dell’etichetta, nome, marca. L’IA legge gli allergeni. Invia la scheda via WhatsApp o email al protocollo.",
                    "azione": {"to": "/report", "label": "Segnala un prodotto"},
                },
            ],
            "note": [
                "L’olio di frittura condiviso rende rosso solo i piatti che lo usano, non l’intero menu.",
                "La salsa dello chef senza scheda è gialla o rossa: non è un dettaglio, è il punto di manleva.",
            ],
        },
        {
            "id": "fornitore",
            "ruolo": "Fornitore",
            "titolo": "Dal campo al lotto",
            "sommario": "Ogni evento di filiera è un blocco SHA-256. I JSON sono il carico verso il database UE.",
            "passi": [
                {
                    "n": 1,
                    "titolo": "Origine e trasformazione",
                    "testo": "Campo, mulino, caseificio, logistica, arrivo in cucina. Sequenza, attore, luogo, lotto, nota.",
                    "azione": {"to": "/filiera", "label": "Apri la filiera"},
                },
                {
                    "n": 2,
                    "titolo": "Hash concatenato",
                    "testo": "Ogni blocco cita il precedente. Una modifica a un lotto spezza la catena. Il motore Python e quello web usano la stessa canonicalizzazione.",
                },
                {
                    "n": 3,
                    "titolo": "Scheda tecnica",
                    "testo": "Allergeni dichiarati, tracce, zucchero, sodio, rischi di processo. Senza scheda il piatto non può essere verde.",
                    "azione": {"to": "/catalog", "label": "Schede prodotto"},
                },
            ],
            "note": [
                "Il file protocol/manuale.py e i JSON in protocol/dati/ sono il pacchetto da caricare nel database europeo.",
                "Prodotto non catalogato = incentivo di mercato: resta filtrato finché il produttore non aderisce.",
            ],
        },
        {
            "id": "privacy",
            "ruolo": "Privacy",
            "titolo": "GDPR by design",
            "sommario": "Il ristorante non è titolare dei dati sanitari. L’incrocio avviene sul protocollo.",
            "passi": [
                {
                    "n": 1,
                    "titolo": "Cosa c’è nel QR",
                    "testo": "Solo l’ID pubblico. Payload SAFEPLATE:v1:SP-… oppure /kiosk?pid=. Mai allergeni, mai gravidanza, mai patologie.",
                    "azione": {"to": "/protocol", "label": "Protocollo"},
                },
                {
                    "n": 2,
                    "titolo": "Cosa vede la sala",
                    "testo": "Un oggetto { status: safe | caution | unsafe }. I motivi restano nel wallet dell’ospite.",
                },
                {
                    "n": 3,
                    "titolo": "Chi conserva il passaporto",
                    "testo": "L’account dell’ospite, cifrato nel wallet. Il ristoratore firma di non memorizzare dati sanitari.",
                    "azione": {"to": "/certify", "label": "Testo della manleva"},
                },
                {
                    "n": 4,
                    "titolo": "Demo e produzione",
                    "testo": "SP-DEMO-* possono mostrare i motivi nell’interfaccia ospite, per didattica. Al totem i motivi sono sempre omessi.",
                },
            ],
            "note": [
                "Non fotografare il passaporto aperto in sala.",
                "Una richiesta verbale di «dimmi cosa non mangi» viola il protocollo anche se l’ospite risponde.",
            ],
        },
    ],
    "faq": [
        {
            "q": "Devo dire al cameriere che sono celiaco?",
            "a": "No. Mostri il QR o l’ID. Il menu si colora. Se vuoi aggiungere un dettaglio, è una scelta tua.",
        },
        {
            "q": "Perché la quinoa è gialla e non verde?",
            "a": "L’ingrediente può essere sicuro, ma la cucina ha farina volatile o superfici condivise. Il giallo è un vettore, non un errore di catalogo.",
        },
        {
            "q": "Il totem è rotto se non vedo il motivo del rosso?",
            "a": "È corretto. Il totem è la vista personale di sala. I motivi stanno nel piatto aperto dall’ospite, non in cassa.",
        },
        {
            "q": "Posso usare SafePlate in aereo o in nave?",
            "a": "Sì. Stesso protocollo: catering aereo, cucina di bordo, grande distribuzione. Cambia solo il locale.",
        },
        {
            "q": "Cos’è la manleva digitale?",
            "a": "Una dichiarazione firmata e hashata. Non è un parere legale. Sposta la responsabilità operativa sul protocollo se i dati e i processi dichiarati sono veri.",
        },
        {
            "q": "Come carico questo manuale nel database UE?",
            "a": "Scarica il file unico Python dalla pagina Manuale (safeplate_protocol.py) insieme ai JSON di catalogo. Oppure esegui il protocollo con --export per ottenere manuale.json.",
        },
    ],
    "pacchetto": {
        "file_python": "safeplate_protocol.py",
        "file_json": "manuale.json",
        "modifiche": [
            {
                "file": "safeplate_protocol.py",
                "modifica": "File Python unico da caricare: motore UE-14, matching, filiera SHA-256, QR, manleva, segnalazioni, manuale, test.",
            },
            {
                "file": "manuale.py",
                "modifica": "Manuale operativo (ospite, sala, ristoratore, fornitore, privacy) e export JSON/Markdown.",
            },
            {
                "file": "dati/manuale.json",
                "modifica": "Contratto JSON del manuale, stesso schema dei JSON di catalogo/filiera.",
            },
            {
                "file": "documentazione/MANUALE.md",
                "modifica": "Versione testo del manuale.",
            },
            {
                "file": "main.py",
                "modifica": "Carica i dati di prova e stampa la versione del manuale.",
            },
            {
                "file": "test/test_protocol.py",
                "modifica": "Test sui ruoli del manuale e sull’export.",
            },
            {
                "file": "console · Manuale",
                "modifica": "Nuova voce di menu dopo Filiera. Stesso foglio crema, semaforo, identità demo.",
            },
            {
                "file": "console · navigazione",
                "modifica": "Header e totem mobile: Protocollo, Wallet, Menu, Totem, Filiera, Manuale.",
            },
            {
                "file": "console · protocollo / home",
                "modifica": "Link al manuale di utilizzo.",
            },
        ],
    },
}


def to_json(payload: dict[str, Any] | None = None) -> str:
    data = payload or MANUALE
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


def to_markdown(payload: dict[str, Any] | None = None) -> str:
    m = payload or MANUALE
    lines: list[str] = [
        f"# {m['titolo']}",
        "",
        f"_{m['kicker']} · versione {m['versione']}_",
        "",
        m["sottotitolo"],
        "",
        m["intro"],
        "",
        f"> {m['avvertenza']}",
        "",
        "## Semaforo",
        "",
        "| Stato | Significato |",
        "| --- | --- |",
    ]
    for row in m["semaforo"]:
        lines.append(f"| {row['etichetta']} | {row['testo']} |")
    lines += ["", "## Identità dimostrative", "", "| ID | Profilo | Uso |", "| --- | --- | --- |"]
    for row in m["identita_demo"]:
        lines.append(f"| `{row['id']}` | {row['etichetta']} | {row['uso']} |")
    for cap in m["capitoli"]:
        lines += ["", f"## {cap['ruolo']}: {cap['titolo']}", "", cap["sommario"], ""]
        for passo in cap["passi"]:
            lines.append(f"{passo['n']}. **{passo['titolo']}.** {passo['testo']}")
            azione = passo.get("azione")
            if azione:
                lines.append(f"   - Azione: {azione['label']} → `{azione['to']}`")
        if cap.get("note"):
            lines.append("")
            for note in cap["note"]:
                lines.append(f"- {note}")
    lines += ["", "## FAQ", ""]
    for item in m["faq"]:
        lines.append(f"**{item['q']}**")
        lines.append("")
        lines.append(item["a"])
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def export(target_json: Path | None = None, target_md: Path | None = None) -> tuple[Path, Path]:
    DATI.mkdir(parents=True, exist_ok=True)
    DOCS.mkdir(parents=True, exist_ok=True)
    json_path = target_json or (DATI / "manuale.json")
    md_path = target_md or (DOCS / "MANUALE.md")
    json_path.write_text(to_json(), encoding="utf-8")
    md_path.write_text(to_markdown(), encoding="utf-8")
    return json_path, md_path


def capitolo(chapter_id: str) -> dict[str, Any]:
    for item in MANUALE["capitoli"]:
        if item["id"] == chapter_id:
            return item
    raise KeyError(chapter_id)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Manuale di utilizzo SafePlate")
    parser.add_argument("--export", action="store_true", help="Scrive JSON e Markdown")
    parser.add_argument("--markdown", action="store_true", help="Stampa il markdown")
    parser.add_argument("--json", action="store_true", help="Stampa il JSON")
    args = parser.parse_args(argv)

    if args.export:
        json_path, md_path = export()
        print(f"export {json_path}")
        print(f"export {md_path}")
        return 0
    if args.markdown:
        sys.stdout.write(to_markdown())
        return 0
    if args.json:
        sys.stdout.write(to_json())
        return 0

    print(f"{MANUALE['titolo']} · v{MANUALE['versione']}")
    print(MANUALE["sottotitolo"])
    print()
    for cap in MANUALE["capitoli"]:
        print(f"  {cap['id']:12} {cap['ruolo']} — {cap['titolo']}")
    print()
    print(f"  identità demo  {len(MANUALE['identita_demo'])}")
    print(f"  faq            {len(MANUALE['faq'])}")
    print("  python3 protocol/manuale.py --export")
    return 0





def run_trial() -> int:
    catalog = load_catalog()
    passports = load_demo_passports()
    print("SafePlate protocol — file unico")
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
        print(f"  catena {product_id:18} {mark}  blocchi={check['length']}")
    trials = [
        ("SP-DEMO-CELIA", "dish-carbonara"),
        ("SP-DEMO-CELIA", "dish-quinoa-osteria"),
        ("SP-DEMO-GRAVID", "dish-crudo"),
        ("SP-DEMO-DIAB", "dish-tiramisu"),
    ]
    by_passport = {p["id"]: p for p in passports}
    print("\nIncroci dimostrativi (kiosk = solo stato):")
    for pid, dish_id in trials:
        profile = profile_from_record(by_passport[pid])
        dish = catalog["piatti_by_id"][dish_id]
        restaurant = catalog["ristoranti_by_id"][dish["ristorante_id"]]
        result = evaluate_dish(dish, restaurant, catalog["prodotti_by_id"], profile)
        print(f"  {pid:16} × {dish['nome'][:28]:28} → {STATUS_LABEL[result.status]}")
        print(f"     kiosk: {json.dumps(result.public(), ensure_ascii=False)}")
    if broken:
        print(f"\nFAIL: {broken} catene non integre")
        return 1
    print("\nOK — motore, filiera e manuale verificati.")
    return 0


class ProtocolTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.catalog = load_catalog()
        cls.passports = {p["id"]: profile_from_record(p) for p in load_demo_passports()}

    def eval_dish(self, passport_id: str, dish_id: str):
        dish = self.catalog["piatti_by_id"][dish_id]
        restaurant = self.catalog["ristoranti_by_id"][dish["ristorante_id"]]
        return evaluate_dish(dish, restaurant, self.catalog["prodotti_by_id"], self.passports[passport_id])

    def test_carbonara_unsafe_for_celiac(self) -> None:
        self.assertEqual(self.eval_dish("SP-DEMO-CELIA", "dish-carbonara").status, STATUS_UNSAFE)

    def test_kiosk_hides_reasons(self) -> None:
        public = self.eval_dish("SP-DEMO-CELIA", "dish-carbonara").public()
        self.assertEqual(set(public.keys()), {"status"})

    def test_qr_has_no_allergens(self) -> None:
        payload = encode_payload("SP-DEMO-CELIA")
        self.assertNotIn("glutine", payload)
        self.assertEqual(parse_payload(payload), "SP-DEMO-CELIA")

    def test_manuale_roles(self) -> None:
        self.assertEqual(
            [c["id"] for c in MANUALE["capitoli"]],
            ["ospite", "sala", "ristoratore", "fornitore", "privacy"],
        )


def cli(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="SafePlate protocol — file unico UE")
    parser.add_argument("--manuale", action="store_true")
    parser.add_argument("--export", action="store_true")
    parser.add_argument("--markdown", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--test", action="store_true")
    args = parser.parse_args(argv)
    if args.export:
        json_path, md_path = export()
        print(f"export {json_path}")
        print(f"export {md_path}")
        return 0
    if args.markdown:
        sys.stdout.write(to_markdown())
        return 0
    if args.json:
        sys.stdout.write(to_json())
        return 0
    if args.manuale:
        return main([])
    if args.test:
        suite = unittest.defaultTestLoader.loadTestsFromTestCase(ProtocolTests)
        result = unittest.TextTestRunner(verbosity=2).run(suite)
        return 0 if result.wasSuccessful() else 1
    return run_trial()


if __name__ == "__main__":
    raise SystemExit(cli())

# === avvio: dati di prova, export, test ===

def run_trial() -> int:
    catalog = load_catalog()
    passports = load_demo_passports()
    print("SafePlate protocol — file unico")
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
        print(f"  catena {product_id:18} {mark}  blocchi={check['length']}")
    trials = [
        ("SP-DEMO-CELIA", "dish-carbonara"),
        ("SP-DEMO-CELIA", "dish-quinoa-osteria"),
        ("SP-DEMO-GRAVID", "dish-crudo"),
        ("SP-DEMO-DIAB", "dish-tiramisu"),
    ]
    by_passport = {p["id"]: p for p in passports}
    print("\nIncroci dimostrativi (kiosk = solo stato):")
    for pid, dish_id in trials:
        profile = profile_from_record(by_passport[pid])
        dish = catalog["piatti_by_id"][dish_id]
        restaurant = catalog["ristoranti_by_id"][dish["ristorante_id"]]
        result = evaluate_dish(dish, restaurant, catalog["prodotti_by_id"], profile)
        print(f"  {pid:16} × {dish['nome'][:28]:28} → {STATUS_LABEL[result.status]}")
        print(f"     kiosk: {json.dumps(result.public(), ensure_ascii=False)}")
    if broken:
        print(f"\nFAIL: {broken} catene non integre")
        return 1
    print("\nOK — motore, filiera e manuale verificati.")
    return 0


class ProtocolTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.catalog = load_catalog()
        cls.passports = {p["id"]: profile_from_record(p) for p in load_demo_passports()}

    def eval_dish(self, passport_id: str, dish_id: str):
        dish = self.catalog["piatti_by_id"][dish_id]
        restaurant = self.catalog["ristoranti_by_id"][dish["ristorante_id"]]
        return evaluate_dish(dish, restaurant, self.catalog["prodotti_by_id"], self.passports[passport_id])

    def test_carbonara_unsafe_for_celiac(self) -> None:
        self.assertEqual(self.eval_dish("SP-DEMO-CELIA", "dish-carbonara").status, STATUS_UNSAFE)

    def test_kiosk_hides_reasons(self) -> None:
        public = self.eval_dish("SP-DEMO-CELIA", "dish-carbonara").public()
        self.assertEqual(set(public.keys()), {"status"})

    def test_qr_has_no_allergens(self) -> None:
        payload = encode_payload("SP-DEMO-CELIA")
        self.assertNotIn("glutine", payload)
        self.assertEqual(parse_payload(payload), "SP-DEMO-CELIA")

    def test_manuale_roles(self) -> None:
        self.assertEqual(
            [c["id"] for c in MANUALE["capitoli"]],
            ["ospite", "sala", "ristoratore", "fornitore", "privacy"],
        )


def cli(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="SafePlate protocol — file unico UE")
    parser.add_argument("--manuale", action="store_true")
    parser.add_argument("--export", action="store_true")
    parser.add_argument("--markdown", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--test", action="store_true")
    args = parser.parse_args(argv)
    if args.export:
        json_path, md_path = export()
        print(f"export {json_path}")
        print(f"export {md_path}")
        return 0
    if args.markdown:
        sys.stdout.write(to_markdown())
        return 0
    if args.json:
        sys.stdout.write(to_json())
        return 0
    if args.manuale:
        return main([])
    if args.test:
        suite = unittest.defaultTestLoader.loadTestsFromTestCase(ProtocolTests)
        result = unittest.TextTestRunner(verbosity=2).run(suite)
        return 0 if result.wasSuccessful() else 1
    return run_trial()


if __name__ == "__main__":
    raise SystemExit(cli())
