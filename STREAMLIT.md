# Streamlit Cloud — SafePlate

## Impostazioni da inserire in share.streamlit.io

| Campo | Valore |
| --- | --- |
| Repository | `vernoticoalberto-ctrl/safeplate` |
| Branch | `main` |
| **Main file path** | `streamlit_app.py` |
| Python version | `3.12` |

Non usare `protocol/main.py`. Quello è il motore a riga di comando.

## Dipendenze

`requirements.txt` in root (Streamlit lo installa da solo):

```
streamlit>=1.36.0
```

Il protocollo (allergeni, matching, filiera) è Python standard: nessun altro pacchetto.

## Segreti

Nessun secret è richiesto per la demo. Non caricare dati sanitari reali.
