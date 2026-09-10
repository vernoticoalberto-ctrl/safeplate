# SafePlate

Protocollo Med-Tech: passaporto alimentare, semaforo, filiera SHA-256.  
Il ristorante vede solo sicuro / attenzione / non sicuro.

## Streamlit Community Cloud

| Campo | Valore |
| --- | --- |
| Repository | `vernoticoalberto-ctrl/safeplate` |
| Branch | `main` |
| Main file path | **`streamlit_app.py`** |
| Python | `3.12` |

1. Apri [share.streamlit.io](https://share.streamlit.io) e accedi con GitHub.
2. **Create app** → **Yup, I have an app**.
3. Compila i campi sopra (o incolla `https://github.com/vernoticoalberto-ctrl/safeplate/blob/main/streamlit_app.py`).
4. Advanced settings → Python **3.12**. Subdomain: `safeplate`.
5. **Deploy**.

Dettagli: [STREAMLIT.md](STREAMLIT.md)

## Contenuto

- `streamlit_app.py` — console operativa (menu filtrato, totem, filiera, manuale)
- `protocol/` — motore ufficiale + JSON di prova per il database UE
- `requirements.txt` — dipendenze Cloud
- `.streamlit/config.toml` — tema carta / sage

## Identità dimostrative

Nel selettore laterale: `SP-DEMO-CELIA`, `SP-DEMO-EGG`, `SP-DEMO-PREG`, …  
Attiva **Vista totem** per nascondere i motivi sanitari (solo semaforo).
