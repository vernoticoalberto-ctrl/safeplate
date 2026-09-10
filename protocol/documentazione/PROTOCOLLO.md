# Protocollo SafePlate

Infrastruttura Med-Tech per la sicurezza alimentare e la manleva digitale.

## Motore

Il cuore gira in Python (`protocol/core`, `protocol/modules`). I dati di prova
vivono in JSON (`protocol/dati`) e sono il contratto verso il futuro database UE.

```
python3 protocol/main.py          # carica i dati di prova e verifica la filiera
python3 -m protocol.test.test_protocol
```

La console web (questa app) esegue lo stesso algoritmo in TypeScript, sugli
stessi JSON, così l’anteprima e il protocollo restano allineati.

## Semaforo

| Stato | Significato |
| --- | --- |
| Verde · Certificato sicuro | Dati validati, nessun incrocio con il passaporto, vettori sotto controllo |
| Giallo · Prestare attenzione | Tracce, farina volatile, scheda non certificata, prodotto non rintracciabile |
| Rosso · Non sicuro | Allergene dichiarato, olio di frittura condiviso, listeria/toxo in gravidanza |

## Privacy by design

Il QR del SafePlate ID contiene solo l’identificativo pubblico (`SAFEPLATE:v1:SP-…`
oppure l’URL del totem). Nessun allergene, nessuna condizione. Il ristoratore
riceve unicamente `{ status: safe | caution | unsafe }`.

## Manleva

Se l’operatore firma l’autocertificazione digitale e segue il protocollo
validato, la responsabilità operativa si sposta sull’algoritmo certificato,
fermi restando gli obblighi inderogabili di legge. Non è un parere legale.
