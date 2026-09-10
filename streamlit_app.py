#!/usr/bin/env python3
"""SafePlate — entrypoint Streamlit (Community Cloud / locale).

Main file path da indicare a Streamlit: streamlit_app.py
"""

from __future__ import annotations

import streamlit as st

from protocol.core.allergens import STATUS_LABEL
from protocol.core.blockchain import verify_chain
from protocol.core.matching import evaluate_dish
from protocol.core.qr import encode_payload
from protocol.manuale import MANUALE
from protocol.modules.catalog import load_catalog
from protocol.modules.users import load_demo_passports, profile_from_record

st.set_page_config(
    page_title="SafePlate",
    page_icon="●",
    layout="wide",
    initial_sidebar_state="expanded",
)

COLOR = {"safe": "#1b7f4e", "caution": "#b45309", "unsafe": "#b42318"}


@st.cache_data(show_spinner=False)
def catalog():
    return load_catalog()


@st.cache_data(show_spinner=False)
def passports():
    return load_demo_passports()


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
        kiosk = st.toggle("Vista totem (niente motivi sanitari)", value=True)
        record = next(p for p in people if p["id"] == pid)
        st.code(encode_payload(pid), language=None)
        st.caption("Il QR non contiene allergeni né patologie.")

    tabs = st.tabs(["Menu", "Filiera", "Manuale"])
    menu = [d for d in dishes if d["ristorante_id"] == rid]
    restaurant = data["ristoranti_by_id"][rid]
    profile = profile_from_record(record)

    with tabs[0]:
        st.write(f"**{restaurant['nome']}** · {restaurant['citta']}")
        for dish in menu:
            result = evaluate_dish(dish, restaurant, data["prodotti_by_id"], profile)
            label = STATUS_LABEL[result.status]
            color = COLOR[result.status]
            st.markdown(
                f"<div style='padding:0.85rem 1rem;margin-bottom:0.6rem;background:#faf7f2;"
                f"border:1px solid #d4cdc0;border-radius:14px'>"
                f"<strong>{dish['nome']}</strong>"
                f"<span style='float:right;color:{color};font-size:0.85rem'>{label}</span>"
                f"<div style='color:#5c675f;font-size:0.9rem;margin-top:0.35rem'>{dish.get('descrizione','')}</div>"
                + (
                    ""
                    if kiosk
                    else "".join(
                        f"<div style='color:#5c675f;font-size:0.8rem;margin-top:0.25rem'>· {reason}</div>"
                        for reason in result.reasons[:4]
                    )
                )
                + "</div>",
                unsafe_allow_html=True,
            )

    with tabs[1]:
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

    with tabs[2]:
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
