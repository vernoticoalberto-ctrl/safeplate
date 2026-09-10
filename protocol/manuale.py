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

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
DATI = HERE / "dati"
DOCS = HERE / "documentazione"

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
        {
            "q": "Qual è il Main file path per Streamlit Cloud?",
            "a": "streamlit_app.py. Repository vernoticoalberto-ctrl/safeplate, branch main, Python 3.12. Non usare protocol/main.py.",
        },
    ],
    "cloud": {
        "titolo": "Streamlit Community Cloud",
        "sottotitolo": "Console Python pubblica. Stesso motore, stesso semaforo.",
        "nota": (
            "Apri share.streamlit.io, accedi con GitHub, Create app → Yup, I have an app. "
            "Non usare protocol/main.py: è il motore a riga di comando. Nessun secret per la demo."
        ),
        "url_github": "https://github.com/vernoticoalberto-ctrl/safeplate",
        "url_share": "https://share.streamlit.io",
        "campi": [
            {"campo": "Repository", "valore": "vernoticoalberto-ctrl/safeplate"},
            {"campo": "Branch", "valore": "main"},
            {"campo": "Main file path", "valore": "streamlit_app.py"},
            {"campo": "Python", "valore": "3.12"},
            {"campo": "Subdomain", "valore": "safeplate"},
        ],
    },
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
            {
                "file": "streamlit_app.py",
                "modifica": "Entrypoint Streamlit Community Cloud: menu filtrato, totem, filiera, manuale.",
            },
            {
                "file": "requirements.txt · .streamlit/config.toml",
                "modifica": "Dipendenza streamlit>=1.36.0 e tema carta/sage. Main file path: streamlit_app.py.",
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
    cloud = m.get("cloud")
    if cloud:
        lines += [f"## {cloud['titolo']}", "", cloud["sottotitolo"], "", "| Campo | Valore |", "| --- | --- |"]
        for row in cloud["campi"]:
            lines.append(f"| {row['campo']} | `{row['valore']}` |")
        lines += ["", cloud["nota"], ""]
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


if __name__ == "__main__":
    raise SystemExit(main())
