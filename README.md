# SafePlate

Protocollo Med-Tech: passaporto alimentare, QR, semaforo, filiera SHA-256.  
Il ristorante vede solo sicuro / attenzione / non sicuro.

Console completa:

**Wallet · Menu · Totem · Filiera · Catalogo · Segnala · Manleva · Manuale**

## Streamlit Community Cloud

| Campo | Valore |
| --- | --- |
| Repository | `vernoticoalberto-ctrl/safeplate` |
| Branch | `main` |
| Main file path | **`streamlit_app.py`** |
| Python | `3.12` |

1. Apri [share.streamlit.io](https://share.streamlit.io) e accedi con GitHub.
2. **Create app** → **Yup, I have an app**.
3. Compila i campi sopra, oppure incolla  
   `https://github.com/vernoticoalberto-ctrl/safeplate/blob/main/streamlit_app.py`
4. Advanced settings → Python **3.12**. Subdomain: `safeplate`.
5. **Deploy**. I push successivi su `main` aggiornano l’app Cloud.

Dettagli: [STREAMLIT.md](STREAMLIT.md)

## Contenuto

- `streamlit_app.py` — console Python (8 schede)
- `src/` — console web (wallet, totem, catalogo, segnalazioni, manleva)
- `protocol/` — motore ufficiale + JSON di prova per il database UE
- `public/` — immagini, QR assets, pacchetto Python scaricabile
- `requirements.txt` — dipendenze Streamlit Cloud
- `.streamlit/config.toml` — tema carta / sage

## Identità dimostrative

`SP-DEMO-CELIA`, `SP-DEMO-LATTE`, `SP-DEMO-MARE`, `SP-DEMO-GUSCIO`, `SP-DEMO-UOVA`, `SP-DEMO-GRAVID`, `SP-DEMO-DIAB`, `SP-DEMO-IPERT`, `SP-DEMO-MULTI`

Al totem i motivi sanitari sono omessi. Nessun dato sanitario reale.
