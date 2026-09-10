#!/usr/bin/env python3
"""SafePlate — console Streamlit completa (Community Cloud).

Main file path da indicare a Streamlit: streamlit_app.py
"""

from __future__ import annotations

import streamlit as st

from protocol.core.allergens import EU14, STATUS_LABEL
from protocol.core.blockchain import verify_chain
from protocol.core.matching import evaluate_dish
from protocol.core.qr import encode_payload
from protocol.manuale import MANUALE
from protocol.modules.catalog import load_catalog
from protocol.modules.certification import DECLARATION, sign_declaration
from protocol.modules.reports import build_report
from protocol.modules.users import load_demo_passports, profile_from_record

st.set_page_config(
    page_title="SafePlate",
    page_icon="●",
    layout="wide",
    initial_sidebar_state="expanded",
)

COLOR = {"safe": "#1b7f4e", "caution": "#b45309", "unsafe": "#b42318"}
CERT_OPTIONS = [
    "Schede tecniche fornitori",
    "Olio di frittura dedicato / tracciato",
    "Protocollo farina volatile",
    "Superfici e taglieri separati",
    "Catena del freddo",
    "SafePlate Pregnancy (listeria / toxo)",
]


@st.cache_data(show_spinner=False)
def catalog():
    return load_catalog()


@st.cache_data(show_spinner=False)
def passports():
    return load_demo_passports()


def card(html: str) -> None:
    st.markdown(
        f"<div style='padding:0.85rem 1rem;margin-bottom:0.6rem;background:#faf7f2;"
        f"border:1px solid #d4cdc0;border-radius:14px'>{html}</div>",
        unsafe_allow_html=True,
    )


def dish_card(dish: dict, result, *, kiosk: bool) -> None:
    label = STATUS_LABEL[result.status]
    color = COLOR[result.status]
    reasons = ""
    if not kiosk:
        reasons = "".join(
            f"<div style='color:#5c675f;font-size:0.8rem;margin-top:0.25rem'>· {reason}</div>"
            for reason in result.reasons[:4]
        )
    card(
        f"<strong>{dish['nome']}</strong>"
        f"<span style='float:right;color:{color};font-size:0.85rem'>{label}</span>"
        f"<div style='color:#5c675f;font-size:0.9rem;margin-top:0.35rem'>{dish.get('descrizione','')}</div>"
        + reasons
    )


def main() -> None:
    data = catalog()
    people = passports()
    restaurants = data["ristoranti"]
    dishes = data["piatti"]

    st.markdown("### SafePlate")
    st.caption("Protocollo Med-Tech · il ristorante vede solo il semaforo.")

    with st.sidebar:
        st.subheader("Incrocio")
        pid = st.selectbox(
            "Identità dimostrativa",
            options=[p["id"] for p in people],
            format_func=lambda i: next(p["etichetta"] for p in people if p["id"] == i),
        )
        rid = st.selectbox(
            "Locale",
            options=[r["id"] for r in restaurants],
            format_func=lambda i: next(r["nome"] for r in restaurants if r["id"] == i),
        )
        record = next(p for p in people if p["id"] == pid)
        st.code(encode_payload(pid), language=None)
        st.caption("Il QR non contiene allergeni né patologie.")

    restaurant = data["ristoranti_by_id"][rid]
    profile = profile_from_record(record)
    menu = [d for d in dishes if d["ristorante_id"] == rid]

    tabs = st.tabs(
        ["Wallet", "Menu", "Totem", "Filiera", "Catalogo", "Segnala", "Manleva", "Manuale"]
    )

    with tabs[0]:
        st.write(f"**{record['etichetta']}**")
        st.caption(record["note"])
        st.write("ID pubblico:", record["id"])
        chips = record.get("allergeni") or []
        st.write(
            "EU 14:",
            ", ".join(next((a["label"] for a in EU14 if a["id"] == x), x) for x in chips)
            or "nessun allergene",
        )
        extras = []
        if record.get("gravidanza"):
            extras.append("gravidanza")
        if record.get("diabete"):
            extras.append("diabete")
        if record.get("ipertensione"):
            extras.append("ipertensione")
        st.write("Total Care:", ", ".join(extras) or "non attivo")
        st.info("Il locale non memorizza queste voci. In sala resta solo il semaforo.")

    with tabs[1]:
        st.write(f"**{restaurant['nome']}** · {restaurant['citta']}")
        st.caption("Vista ospite: i motivi restano visibili a te, non in cassa.")
        for dish in menu:
            result = evaluate_dish(dish, restaurant, data["prodotti_by_id"], profile)
            dish_card(dish, result, kiosk=False)

    with tabs[2]:
        st.write(f"**{restaurant['nome']}** · totem")
        st.caption("Vista personale di sala. I motivi sanitari sono omessi.")
        safe = 0
        for dish in menu:
            result = evaluate_dish(dish, restaurant, data["prodotti_by_id"], profile)
            if result.status == "safe":
                safe += 1
            dish_card(dish, result, kiosk=True)
        st.caption(f"{safe} piatti sicuri su {len(menu)}")

    with tabs[3]:
        product_id = st.selectbox(
            "Prodotto",
            options=[p["id"] for p in data["prodotti"]],
            format_func=lambda i: next(p["nome"] for p in data["prodotti"] if p["id"] == i),
        )
        events = data["filiera_by_product"].get(product_id, [])
        check = verify_chain(events)
        st.write("Catena integra." if check["ok"] else "Catena rotta.")
        st.dataframe(
            [
                {
                    "seq": e["seq"],
                    "tipo": e["tipo"],
                    "attore": e["attore"],
                    "luogo": e["luogo"],
                    "hash": (e.get("hash") or "")[:16] + "…",
                }
                for e in events
            ],
            hide_index=True,
            use_container_width=True,
        )

    with tabs[4]:
        query = st.text_input("Cerca nome, marca, lotto")
        rows = data["prodotti"]
        if query.strip():
            q = query.strip().lower()
            rows = [
                p
                for p in rows
                if q in p["nome"].lower() or q in p["marca"].lower() or q in p["lotto"].lower()
            ]
        for p in rows:
            stato = "certificato" if p.get("stato_certificazione") == "certified" else "non rintracciabile"
            allergeni = ", ".join(p.get("allergeni") or []) or "—"
            card(
                f"<strong>{p['nome']}</strong> · {p['marca']}"
                f"<div style='color:#5c675f;font-size:0.85rem;margin-top:0.35rem'>"
                f"{stato} · lotto {p['lotto']} · {allergeni}</div>"
            )

    with tabs[5]:
        with st.form("segnala"):
            nome = st.text_input("Nome del prodotto")
            marca = st.text_input("Marca")
            note = st.text_area("Note / ingredienti visibili")
            submitted = st.form_submit_button("Prepara la scheda")
        if submitted and nome.strip():
            report = build_report(nome=nome.strip(), marca=marca, note=note)
            st.write(report["analisi"] or "Scheda pronta. Prodotto non catalogato = giallo.")
            st.link_button("WhatsApp", report["whatsapp"])
            st.link_button("Email", report["mailto"])
        else:
            st.caption("Senza scheda in banca dati il piatto resta filtrato.")

    with tabs[6]:
        st.write(DECLARATION)
        for item in CERT_OPTIONS:
            st.checkbox(item, value=item == CERT_OPTIONS[0], key=f"proto-{item}")
        col_a, col_b, col_c = st.columns(3)
        with col_a:
            locale = st.text_input("Attività", value=restaurant["nome"])
        with col_b:
            citta = st.text_input("Città", value=restaurant.get("citta", ""))
        with col_c:
            firmatario = st.text_input("Firmatario", value="Demo operatore")
        if st.button("Simula firma"):
            signed = sign_declaration(
                restaurant_name=locale,
                city=citta,
                signature_name=firmatario,
                protocols=[i for i in CERT_OPTIONS],
            )
            st.code(signed["hash"], language=None)
            st.caption("Hash SHA-256 della dichiarazione. Nessun dato sanitario dell’ospite.")

    with tabs[7]:
        st.write(MANUALE["sottotitolo"])
        chapter = st.selectbox(
            "Ruolo",
            options=MANUALE["capitoli"],
            format_func=lambda c: f"{c['ruolo']} — {c['titolo']}",
        )
        st.write(chapter["sommario"])
        for passo in chapter["passi"]:
            st.markdown(f"**{passo['n']}. {passo['titolo']}**  \n{passo['testo']}")


main()
