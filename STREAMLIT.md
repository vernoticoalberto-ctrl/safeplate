# Streamlit Community Cloud — SafePlate

Il motore Python vive su GitHub: [vernoticoalberto-ctrl/safeplate](https://github.com/vernoticoalberto-ctrl/safeplate).

## Campi da inserire

Apri [share.streamlit.io](https://share.streamlit.io) → **Create app** → **Yup, I have an app**.

| Campo | Valore |
| --- | --- |
| Repository | `vernoticoalberto-ctrl/safeplate` |
| Branch | `main` |
| **Main file path** | `streamlit_app.py` |
| Python version (Advanced) | `3.12` (è già il default) |

Oppure **Paste GitHub URL**:

`https://github.com/vernoticoalberto-ctrl/safeplate/blob/main/streamlit_app.py`

Non usare `protocol/main.py`. Quello è il motore a riga di comando.

Subdomain consigliato: `safeplate`. L’app sarà su `https://safeplate.streamlit.app`.

## Dipendenze

`requirements.txt` in root (Cloud lo installa da solo):

```
streamlit>=1.36.0
```

Il protocollo (allergeni, matching, filiera) è Python standard: nessun altro pacchetto.

## Segreti

Nessun secret è richiesto per la demo. Non caricare dati sanitari reali.
