#!/usr/bin/env python3
"""SafePlate — console Streamlit, stessa grafica della console web.

Main file path Streamlit Cloud: streamlit_app.py
"""

from __future__ import annotations

import base64
import io
from pathlib import Path

import qrcode
import streamlit as st
from PIL import Image

from protocol.core.allergens import EU14, STATUS_LABEL
from protocol.core.blockchain import verify_chain
from protocol.core.matching import evaluate_dish
from protocol.core.qr import encode_payload
from protocol.manuale import MANUALE
from protocol.modules.catalog import load_catalog
from protocol.modules.certification import DECLARATION, sign_declaration
from protocol.modules.reports import build_report
from protocol.modules.users import load_demo_passports, profile_from_record

ROOT = Path(__file__).resolve().parent
IMAGES = ROOT / "public" / "images"

st.set_page_config(
    page_title="SafePlate",
    page_icon="●",
    layout="wide",
    initial_sidebar_state="expanded",
)

COLOR = {"safe": "#1b7f4e", "caution": "#b45309", "unsafe": "#b42318"}
KIND = {
    "trattoria": "Trattoria",
    "kiosk": "Totem / kiosk",
    "airline": "Catering aereo",
    "cruise": "Cucina di bordo",
    "supermarket": "Grande distribuzione",
}
CERT_OPTIONS = [
    "Schede tecniche fornitori",
    "Olio di frittura dedicato / tracciato",
    "Protocollo farina volatile",
    "Superfici e taglieri separati",
    "Catena del freddo",
    "SafePlate Pregnancy (listeria / toxo)",
]

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&family=Outfit:wght@400;500;600&display=swap');
html, body, [data-testid="stAppViewContainer"], .stApp {
  background: #f3eee6 !important;
  color: #15201b;
  font-family: Outfit, ui-sans-serif, system-ui, sans-serif;
}
h1, h2, h3, .sp-display {
  font-family: Fraunces, Georgia, serif !important;
  letter-spacing: -0.03em;
  font-weight: 500 !important;
}
[data-testid="stHeader"] { background: transparent; }
#MainMenu, footer, .stDeployButton { visibility: hidden; height: 0; }
[data-testid="stToolbar"] { right: 0.5rem; }
.stTabs [data-baseweb="tab-list"] {
  gap: 4px;
  background: transparent;
  border-bottom: 1px solid #d4cdc0;
}
.stTabs [data-baseweb="tab"] {
  background: transparent;
  color: #5c675f;
  border-radius: 10px 10px 0 0;
  font-family: Outfit, sans-serif;
  padding: 10px 14px;
}
.stTabs [aria-selected="true"] {
  background: #e7e0d4 !important;
  color: #15201b !important;
  font-weight: 500;
}
.stButton>button {
  background: #1f6b57;
  color: #f4efe6;
  border: 0;
  border-radius: 12px;
  height: 44px;
  font-family: Outfit, sans-serif;
}
.stButton>button:hover { opacity: 0.92; border: 0; }
div[data-testid="stSidebar"] {
  background: #faf7f2;
  border-right: 1px solid #d4cdc0;
}
.sp-kicker {
  font-family: "IBM Plex Mono", monospace;
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #8a9188;
  margin: 0;
}
.sp-pass {
  position: relative;
  overflow: hidden;
  background: #1a2e28;
  color: #e7eee8;
  border-radius: 18px;
  padding: 1.35rem 1.4rem;
  min-height: 220px;
}
.sp-pass .sp-gdpr {
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  background: rgba(231,238,232,0.1);
  border-radius: 999px;
  padding: 4px 10px;
}
.sp-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
}
.sp-dot { width: 10px; height: 10px; border-radius: 99px; display: inline-block; }
.sp-card {
  background: #faf7f2;
  border: 1px solid #d4cdc0;
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 0.85rem;
}
.sp-card img { width: 100%; height: 180px; object-fit: cover; display: block; }
.sp-card .body { padding: 0.9rem 1rem 1.1rem; }
.sp-muted { color: #5c675f; font-size: 0.92rem; }
.sp-subtle { color: #8a9188; font-size: 0.78rem; font-family: "IBM Plex Mono", monospace; }
.sp-chip {
  display: inline-block;
  background: #e7e0d4;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  margin: 2px 4px 0 0;
}
.sp-id {
  background: #faf7f2;
  border: 1px solid #d4cdc0;
  border-radius: 18px;
  padding: 1.1rem 1.15rem;
  min-height: 9rem;
}
.sp-id.on { background: #15201b; color: #f3eee6; border-color: #15201b; }
.sp-legend {
  background: #faf7f2;
  border: 1px solid #d4cdc0;
  border-radius: 14px;
  padding: 1rem;
}
.sp-chain {
  background: #faf7f2;
  border: 1px solid #d4cdc0;
  border-radius: 14px;
  padding: 1rem 1.1rem;
  margin-bottom: 0.7rem;
}
.sp-step {
  width: 36px; height: 36px; border-radius: 99px;
  background: #15201b; color: #f3eee6;
  display: grid; place-items: center;
  font-family: "IBM Plex Mono", monospace; font-size: 12px;
}
"""


def html(src: str) -> None:
    st.markdown(src, unsafe_allow_html=True)


def media(src: str | None) -> Path | None:
    if not src:
        return None
    name = src.rsplit("/", 1)[-1]
    path = IMAGES / name
    return path if path.exists() else None


def b64(path: Path) -> str:
    suffix = path.suffix.lower().lstrip(".") or "jpeg"
    if suffix == "jpg":
        suffix = "jpeg"
    return f"data:image/{suffix};base64," + base64.b64encode(path.read_bytes()).decode()


@st.cache_data(show_spinner=False)
def catalog():
    return load_catalog()


@st.cache_data(show_spinner=False)
def passports():
    return load_demo_passports()


@st.cache_data(show_spinner=False)
def qr_png(payload: str) -> bytes:
    qr = qrcode.QRCode(border=1, box_size=10, error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#e7eee8", back_color="#1a2e28").convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def badge(status: str, compact: bool = False) -> str:
    color = COLOR[status]
    label = STATUS_LABEL[status]
    tint = {"safe": "rgba(27,127,78,0.12)", "caution": "rgba(180,83,9,0.12)", "unsafe": "rgba(180,35,24,0.12)"}[status]
    return (
        f"<span class='sp-badge' style='background:{tint};color:{color}'>"
        f"<span class='sp-dot' style='background:{color}'></span>{label}</span>"
    )


def show_image(src: str | None, *, caption: str = "", height: int | None = None) -> None:
    path = media(src)
    if not path:
        return
    if height:
        img = Image.open(path)
        st.image(img, width="stretch", caption=caption or None)
    else:
        st.image(str(path), width="stretch", caption=caption or None)


def pass_card(public_id: str, label: str) -> None:
    payload = encode_payload(public_id)
    qr = "data:image/png;base64," + base64.b64encode(qr_png(payload)).decode()
    html(
        f"""
        <div class="sp-pass">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem">
            <div>
              <p class="sp-kicker" style="color:#e7eee899">SafePlate ID</p>
              <p class="sp-display" style="font-size:1.6rem;margin:0.4rem 0 0">Food-Health Passport</p>
              <p style="margin:0.35rem 0 0;color:#e7eee8b3;font-size:0.9rem">{label}</p>
            </div>
            <span class="sp-gdpr">GDPR</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;margin-top:1.4rem">
            <div>
              <p style="font-family:'IBM Plex Mono',monospace;letter-spacing:0.06em;margin:0">{public_id}</p>
              <p style="max-width:18ch;color:#e7eee88c;font-size:0.75rem;margin:0.5rem 0 0;line-height:1.45">
                Il QR non contiene dati sanitari. Solo l’identificativo pubblico.
              </p>
            </div>
            <img src="{qr}" alt="QR SafePlate" style="width:118px;height:118px;border-radius:10px;border:1px solid #e7eee826"/>
          </div>
        </div>
        """
    )


def traffic_legend() -> None:
    items = [
        ("safe", "Certificato sicuro", "Dati validati. Nessun incrocio con il passaporto. Si può servire."),
        ("caution", "Prestare attenzione", "Tracce, farina volatile, scheda non certificata o filiera incompleta."),
        ("unsafe", "Non sicuro", "Allergene dichiarato, olio condiviso, listeria o toxo. Non servire."),
    ]
    cols = st.columns(3)
    for col, (status, title, text) in zip(cols, items):
        with col:
            html(
                f"<div class='sp-legend'>{badge(status)}<p style='margin:0.65rem 0 0;font-size:0.9rem;color:#5c675f'>{text}</p></div>"
            )


def dish_visual(dish: dict, result, *, kiosk: bool) -> None:
    path = media(dish.get("immagine"))
    if path:
        st.image(str(path), width="stretch")
    reasons = ""
    if not kiosk:
        reasons = "".join(
            f"<div class='sp-subtle' style='margin-top:0.35rem;font-family:Outfit,sans-serif'>· {r}</div>"
            for r in result.reasons[:3]
        )
    euro = f"{dish.get('prezzo_cent', 0) / 100:.2f}".replace(".", ",")
    html(
        f"""
        <div class="sp-card" style="margin-top:-4px">
          <div class="body">
            <div style="display:flex;justify-content:space-between;gap:0.6rem;align-items:flex-start">
              <strong>{dish['nome']}</strong>
              {badge(result.status)}
            </div>
            <p class="sp-muted" style="margin:0.4rem 0 0">{dish.get('descrizione','')}</p>
            <p class="sp-subtle" style="margin:0.45rem 0 0">€ {euro}</p>
            {reasons}
          </div>
        </div>
        """
    )


def main() -> None:
    html(f"<style>{CSS}</style>")
    data = catalog()
    people = passports()
    restaurants = data["ristoranti"]
    dishes = data["piatti"]

    if "pid" not in st.session_state:
        st.session_state.pid = people[0]["id"]
    if "rid" not in st.session_state:
        st.session_state.rid = restaurants[0]["id"]

    with st.sidebar:
        html("<p class='sp-kicker'>Incrocio</p><p class='sp-display' style='font-size:1.4rem;margin:0.3rem 0 0.8rem'>Passaporto</p>")
        pid = st.selectbox(
            "Identità dimostrativa",
            options=[p["id"] for p in people],
            format_func=lambda i: next(p["etichetta"] for p in people if p["id"] == i),
            key="pid",
        )
        rid = st.selectbox(
            "Locale",
            options=[r["id"] for r in restaurants],
            format_func=lambda i: f"{next(r['nome'] for r in restaurants if r['id'] == i)}",
            key="rid",
        )
        record = next(p for p in people if p["id"] == pid)
        st.caption("Il QR non contiene allergeni né patologie.")
        show_image("pass-hero.jpg")

    restaurant = data["ristoranti_by_id"][rid]
    profile = profile_from_record(record)
    menu = [d for d in dishes if d["ristorante_id"] == rid]
    record = next(p for p in people if p["id"] == pid)

    html(
        """
        <div style="display:flex;align-items:center;gap:10px;margin:0 0 1.2rem">
          <span style="width:32px;height:32px;border-radius:99px;background:#15201b;display:grid;place-items:center">
            <span style="width:14px;height:14px;border-radius:99px;box-shadow:0 0 0 2px #f3eee6"></span>
          </span>
          <span class="sp-display" style="font-size:1.35rem">SafePlate</span>
        </div>
        """
    )

    tabs = st.tabs(
        ["Wallet", "Menu", "Totem", "Filiera", "Catalogo", "Segnala", "Manleva", "Manuale"]
    )

    with tabs[0]:
        left, right = st.columns([1.1, 0.9], gap="large")
        with left:
            html("<p class='sp-kicker'>Protocollo SafePlate · Med-Tech</p>")
            html("<h1 style='font-size:2.6rem;margin:0.4rem 0 0.8rem;line-height:1.1'>Il tuo piatto. La tua privacy.</h1>")
            html(
                "<p class='sp-muted' style='font-size:1.05rem;max-width:36rem'>"
                "Non dire più ad alta voce cosa non puoi mangiare. Il SafePlate ID filtra il menu in silenzio. "
                "Il personale vede solo un semaforo.</p>"
            )
            html(
                f"<p class='sp-subtle' style='margin-top:1rem'>"
                f"{len(dishes)} piatti · {len(data['prodotti'])} schede · "
                f"{len(data['filiera'])} blocchi · {len(data['fornitori'])} fornitori</p>"
            )
        with right:
            pass_card(pid, record["etichetta"])
        show_image("pass-hero.jpg")

        html("<h2 style='margin:1.6rem 0 0.4rem'>Identità dimostrative</h2>")
        html("<p class='sp-muted'>Non sono cartelle cliniche. Servono a incrociare il catalogo.</p>")
        cols = st.columns(3)
        for i, person in enumerate(people):
            extras = []
            if person.get("gravidanza"):
                extras.append("gravidanza")
            if person.get("diabete"):
                extras.append("diabete")
            if person.get("ipertensione"):
                extras.append("ipertensione")
            chips = person.get("allergeni") or []
            labels = ", ".join(next((a["label"] for a in EU14 if a["id"] == x), x) for x in chips) or "Nessun allergene EU 14"
            if extras:
                labels += " · " + " · ".join(extras)
            on = " on" if person["id"] == pid else ""
            with cols[i % 3]:
                html(
                    f"<div class='sp-id{on}'>"
                    f"<p class='sp-subtle' style='margin:0'>{person['id']}</p>"
                    f"<p style='margin:0.45rem 0 0;font-weight:500'>{person['etichetta']}</p>"
                    f"<p class='sp-muted' style='margin:0.4rem 0 0;color:inherit;opacity:0.8'>{labels}</p>"
                    f"</div>"
                )
                if st.button("Usa questa identità", key=f"use-{person['id']}"):
                    st.session_state.pid = person["id"]
                    st.rerun()

        html("<h2 style='margin:1.8rem 0 0.6rem'>Semaforo</h2>")
        traffic_legend()
        cols = st.columns(3)
        notes = [
            ("QR cieco", "Il codice contiene solo l’ID pubblico. Mai allergeni, gravidanza o patologie."),
            ("Semaforo in sala", "Il personale riceve solo lo stato. I motivi restano nel wallet."),
            ("Filiera sigillata", "Ogni lotto è un blocco SHA-256: origine, trasformazione, logistica, piatto."),
        ]
        for col, (title, body) in zip(cols, notes):
            with col:
                html(f"<div class='sp-legend'><p class='sp-display' style='font-size:1.2rem;margin:0'>{title}</p><p class='sp-muted' style='margin:0.45rem 0 0'>{body}</p></div>")

    with tabs[1]:
        banner = media(restaurant.get("immagine"))
        if banner:
            st.image(str(banner), width="stretch")
        html(f"<p class='sp-kicker'>Menu filtrato</p>")
        html(f"<h1 style='margin:0.3rem 0 0.4rem'>{restaurant['nome']}</h1>")
        html(
            f"<p class='sp-muted'>{KIND.get(restaurant['tipo'], restaurant['tipo'])} · {restaurant['citta']}"
            f"{' · Certificato SafePlate' if restaurant.get('certificato') else ''}</p>"
        )
        html("<p class='sp-muted'>Incrocio sul passaporto dimostrativo. I motivi restano visibili all’ospite, non in cassa.</p>")
        traffic_legend()
        cols = st.columns(3)
        for i, dish in enumerate(menu):
            result = evaluate_dish(dish, restaurant, data["prodotti_by_id"], profile)
            with cols[i % 3]:
                dish_visual(dish, result, kiosk=False)

    with tabs[2]:
        banner = media(restaurant.get("immagine"))
        if banner:
            st.image(str(banner), width="stretch")
        html("<p class='sp-kicker'>Totem / kiosk</p>")
        html("<h1 style='margin:0.3rem 0 0.4rem'>Scansione silenziosa</h1>")
        html("<p class='sp-muted'>Il personale non vede allergie, gravidanza o patologie. Solo il semaforo.</p>")
        safe = 0
        for dish in menu:
            result = evaluate_dish(dish, restaurant, data["prodotti_by_id"], profile)
            if result.status == "safe":
                safe += 1
        html(f"<p class='sp-subtle'>ID {pid} · {safe} piatti sicuri su {len(menu)}</p>")
        for dish in menu:
            result = evaluate_dish(dish, restaurant, data["prodotti_by_id"], profile)
            path = media(dish.get("immagine"))
            euro = f"{dish.get('prezzo_cent', 0) / 100:.2f}".replace(".", ",")
            c_img, c_body = st.columns([0.22, 0.78])
            with c_img:
                if path:
                    st.image(str(path), width="stretch")
            with c_body:
                html(
                    f"<div class='sp-card' style='padding:0.85rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem'>"
                    f"<div><strong>{dish['nome']}</strong><div class='sp-muted'>€ {euro}</div></div>"
                    f"{badge(result.status)}</div>"
                )
        html("<p class='sp-subtle'>Vista totem: i motivi sanitari sono omessi di proposito.</p>")

    with tabs[3]:
        show_image("grano.jpg")
        html("<p class='sp-kicker'>Registro</p>")
        html("<h1 style='margin:0.3rem 0 0.4rem'>Filiera</h1>")
        html("<p class='sp-muted'>Dal campo al piatto. Ogni evento ha un hash SHA-256 legato al precedente.</p>")
        product_id = st.selectbox(
            "Prodotto",
            options=[p["id"] for p in data["prodotti"]],
            format_func=lambda i: next(p["nome"] for p in data["prodotti"] if p["id"] == i),
        )
        product = next(p for p in data["prodotti"] if p["id"] == product_id)
        path = media(product.get("immagine"))
        c1, c2 = st.columns([0.9, 1.1])
        with c1:
            if path:
                st.image(str(path), width="stretch")
            html(
                f"<p class='sp-muted'>Origine {product.get('origine_luogo','—')} · lotto {product.get('lotto','—')}</p>"
            )
        events = data["filiera_by_product"].get(product_id, [])
        check = verify_chain(events)
        with c2:
            html(
                "<p class='sp-badge' style='background:rgba(27,127,78,0.12);color:#1b7f4e'>Catena integra</p>"
                if check["ok"]
                else "<p class='sp-badge' style='background:rgba(180,83,9,0.12);color:#b45309'>Catena rotta</p>"
            )
            if not events:
                html("<div class='sp-legend' style='color:#b45309'>Filiera incompleta. Prestare attenzione.</div>")
            for event in events:
                digest = (event.get("hash") or "—")
                short = digest[:10] + "…" + digest[-4:] if len(digest) > 16 else digest
                html(
                    f"<div class='sp-chain'><div style='display:flex;gap:0.85rem'>"
                    f"<div class='sp-step'>{event.get('seq','')}</div>"
                    f"<div style='flex:1'><strong style='text-transform:capitalize'>{event.get('tipo','')}</strong>"
                    f"<div>{event.get('attore','')}</div>"
                    f"<div class='sp-muted'>{event.get('luogo','')}</div>"
                    f"<div class='sp-muted' style='margin-top:0.35rem'>{event.get('note','')}</div>"
                    f"<div class='sp-subtle' style='margin-top:0.45rem'>lotto {event.get('lotto','—')} · hash {short}</div>"
                    f"</div></div></div>"
                )

    with tabs[4]:
        html("<p class='sp-kicker'>Catalogo UE</p>")
        html("<h1 style='margin:0.3rem 0 0.4rem'>Prodotti e schede</h1>")
        html("<p class='sp-muted'>JSON di prova pronti per il database europeo. Senza scheda il piatto non può essere verde.</p>")
        query = st.text_input("Cerca nome, marca, lotto")
        rows = data["prodotti"]
        if query.strip():
            q = query.strip().lower()
            rows = [
                p
                for p in rows
                if q in p["nome"].lower() or q in p["marca"].lower() or q in p["lotto"].lower()
            ]
        cols = st.columns(3)
        for i, p in enumerate(rows):
            path = media(p.get("immagine"))
            stato = "certificato" if p.get("stato_certificazione") == "certified" else "non rintracciabile"
            tint = "#1b7f4e" if stato == "certificato" else "#b45309"
            chips = "".join(f"<span class='sp-chip'>{a}</span>" for a in (p.get("allergeni") or []))
            with cols[i % 3]:
                if path:
                    st.image(str(path), width="stretch")
                html(
                    f"<div class='sp-card' style='margin-top:-4px'><div class='body'>"
                    f"<p class='sp-subtle' style='margin:0'>{p.get('marca','')}</p>"
                    f"<strong>{p['nome']}</strong>"
                    f"<p class='sp-subtle'>{p.get('lotto','')}</p>"
                    f"<span class='sp-chip' style='color:{tint}'>{stato}</span>{chips}"
                    f"</div></div>"
                )

    with tabs[5]:
        html("<p class='sp-kicker'>Catalogazione</p>")
        html("<h1 style='margin:0.3rem 0 0.4rem'>Segnala un prodotto</h1>")
        html("<p class='sp-muted'>Foto, nome, disegno. Poi inoltri la scheda via WhatsApp o email. Senza catalogo il piatto resta giallo.</p>")
        left, right = st.columns(2)
        with left:
            with st.form("segnala"):
                nome = st.text_input("Nome del prodotto")
                marca = st.text_input("Marca")
                note = st.text_area("Note / ingredienti visibili")
                submitted = st.form_submit_button("Prepara la scheda")
            if submitted and nome.strip():
                report = build_report(nome=nome.strip(), marca=marca, note=note)
                st.session_state["last_report"] = report
        with right:
            report = st.session_state.get("last_report")
            if report:
                html(
                    f"<div class='sp-legend'><p class='sp-display' style='font-size:1.3rem;margin:0'>Scheda</p>"
                    f"<p class='sp-muted' style='white-space:pre-wrap;margin-top:0.7rem'>{report.get('analisi') or 'Scheda pronta. Prodotto non catalogato = giallo.'}</p></div>"
                )
                st.link_button("WhatsApp", report["whatsapp"])
                st.link_button("Email", report["mailto"])
            else:
                html("<p class='sp-muted'>Dopo la scheda puoi inoltrare al numero operativo o all’indirizzo SafePlate.</p>")

    with tabs[6]:
        html("<p class='sp-kicker'>Manleva digitale</p>")
        html("<h1 style='margin:0.3rem 0 0.4rem'>Autocertificazione</h1>")
        html("<p class='sp-muted'>L’operatore firma i processi di cucina. Il personale continua a vedere solo il semaforo.</p>")
        html(f"<div class='sp-legend'><p class='sp-muted' style='margin:0;line-height:1.55'>{DECLARATION}</p></div>")
        cols = st.columns(2)
        for i, item in enumerate(CERT_OPTIONS):
            with cols[i % 2]:
                html(f"<div class='sp-legend' style='margin-bottom:0.5rem'>{item}</div>")
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
                protocols=list(CERT_OPTIONS),
            )
            html(f"<p class='sp-subtle' style='word-break:break-all'>Firmato · {signed['hash']}</p>")
            html("<p class='sp-muted'>Hash SHA-256 della dichiarazione. Nessun dato sanitario dell’ospite.</p>")

    with tabs[7]:
        html(f"<p class='sp-kicker'>{MANUALE['kicker']}</p>")
        html(f"<h1 style='margin:0.3rem 0 0.4rem'>{MANUALE['titolo']}</h1>")
        html(f"<p class='sp-muted'>{MANUALE['sottotitolo']}</p>")
        traffic_legend()
        chapter = st.selectbox(
            "Ruolo",
            options=MANUALE["capitoli"],
            format_func=lambda c: f"{c['ruolo']} — {c['titolo']}",
        )
        html(f"<h2>{chapter['titolo']}</h2><p class='sp-muted'>{chapter['sommario']}</p>")
        for passo in chapter["passi"]:
            html(
                f"<div class='sp-chain' style='display:flex;gap:0.9rem;align-items:flex-start'>"
                f"<div class='sp-step'>{passo['n']}</div>"
                f"<div><strong>{passo['titolo']}</strong><p class='sp-muted' style='margin:0.35rem 0 0'>{passo['testo']}</p></div>"
                f"</div>"
            )


main()
