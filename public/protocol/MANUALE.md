# Manuale di utilizzo

_Protocollo SafePlate · Med-Tech · versione 1.0_

Come si usa il passaporto, il totem e la filiera. Senza dire ad alta voce cosa non puoi mangiare.

SafePlate è un'infrastruttura Med-Tech: il SafePlate ID vive nel wallet, il QR identifica solo te, il ristorante vede un semaforo. Questo manuale è il documento operativo da caricare nel database europeo insieme ai JSON di catalogo, fornitori e filiera.

> Le identità SP-DEMO-* sono dimostrative. Non sono cartelle cliniche. Il ristoratore non memorizza allergie, gravidanza o patologie. Il protocollo non sostituisce il parere del medico né gli obblighi di legge.

## Semaforo

| Stato | Significato |
| --- | --- |
| Certificato sicuro | Dati validati. Nessun incrocio con il passaporto. Si può servire. |
| Prestare attenzione | Tracce, farina volatile, scheda non certificata o filiera incompleta. Verifica manuale. |
| Non sicuro | Allergene dichiarato, olio di frittura condiviso, listeria o toxo in gravidanza. Non servire. |

## Identità dimostrative

| ID | Profilo | Uso |
| --- | --- | --- |
| `SP-DEMO-CELIA` | Celiachia | Glutine. Carbonara e pizza rosse; quinoa gialla se c’è farina volatile. |
| `SP-DEMO-LATTE` | Latte | Latte e lattosio. Pizza e tiramisù non sicuri. |
| `SP-DEMO-MARE` | Crostacei, molluschi, pesce | Totem McSafe e cucina di bordo: fritture e olio condiviso. |
| `SP-DEMO-GUSCIO` | Frutta a guscio e arachidi | Incrocio su salse e dessert con tracce. |
| `SP-DEMO-UOVA` | Uova | Carbonara e pasta all’uovo rosse. |
| `SP-DEMO-GRAVID` | Gravidanza | SafePlate Pregnancy: listeria e toxoplasmosi. Crudo e affumicati rossi. |
| `SP-DEMO-DIAB` | Diabete | Limite 8 g di zuccheri da scheda tecnica. Tiramisù in attenzione. |
| `SP-DEMO-IPER` | Ipertensione | Limite 400 mg di sodio. Salumi e fondi di cucina. |
| `SP-DEMO-MULTI` | Glutine, latte, uova | Profilo multiplo. Serve a verificare che il kiosk non riveli i motivi. |

## Ospite: Il tuo piatto, in silenzio

Crei l’ID una volta. Al tavolo mostri il QR. Il menu si filtra da solo.

1. **Entra nel wallet.** Accedi con Google, X o email. I dati sanitari restano nel tuo account, mai nel codice a barre.
   - Azione: Apri il wallet → `/wallet`
2. **Compila il passaporto.** Seleziona gli allergeni UE (14), e se serve gravidanza, diabete o ipertensione. Salva. Ricevi un SafePlate ID pubblico (SP-…).
   - Azione: Crea l’ID → `/wallet`
3. **Mostra il QR.** Il QR contiene solo SAFEPLATE:v1:SP-… oppure l’indirizzo del totem. Nessun allergene, nessuna condizione.
   - Azione: Prova il totem → `/kiosk`
4. **Leggi il semaforo.** Verde: ordina. Giallo: chiedi in privato. Rosso: non ordinare. Puoi filtrare «solo certificati sicuri».
   - Azione: Apri i menu → `/menu`
5. **Senza account, usa una demo.** Sulla home o al totem scegli un profilo SP-DEMO-*. Serve a provare il protocollo, non a certificare una persona reale.
   - Azione: Prova un incrocio → `/`

- Non dettare allergie ad alta voce: è il punto del protocollo.
- Se un piatto è giallo, la filiera o una traccia non è chiusa: apri la scheda prima di insistere.

## Sala / totem: Solo il semaforo

Il personale non vede perché. Vede se può servire.

1. **Apri il totem.** Kiosk, cassa, carrello di bordo, corsia del supermercato: stessa vista. Scegli il locale.
   - Azione: Apri il totem → `/kiosk`
2. **Scansione o ID.** L’ospite inquadra il QR o detta solo l’identificativo pubblico. Incolla il payload se arrivi da un lettore.
3. **Servi secondo il colore.** Verde: vai. Giallo: non inventare, verifica con cucina. Rosso: non servire, proponi un’alternativa verde.
4. **Non chiedere il motivo.** La vista totem omette i motivi sanitari. GDPR by design. Se l’ospite vuole spiegarlo, è una sua scelta, non una procedura.

- Un passaporto non trovato resta senza semaforo: verifica l’ID, non interrogare l’ospite.
- McSafe Roma Termini è il totem dimostrativo: celiachia → pollo alla piastra verde, crispy bites rossi.

## Ristoratore: Manleva e processo, non solo etichetta

Autocertifichi i protocolli. Il motore incrocia lotti, vettori e passaporto.

1. **Dichiara i vettori.** Olio di frittura condiviso, farina volatile, superfici. Non basta l’ingrediente in ricetta: si valida la cucina.
   - Azione: Autocertifica → `/certify`
2. **Firma la manleva digitale.** La dichiarazione è hashata. Se il protocollo certificato è seguito, la responsabilità operativa si sposta sull’algoritmo, fermi gli obblighi inderogabili.
   - Azione: Firma → `/certify`
3. **Tieni le schede fornitore.** Ogni lotto in catalogo ha origine, allergeni, tracce, zuccheri, sodio, listeria/toxo. Un prodotto non in banca dati resta giallo.
   - Azione: Catalogo → `/catalog`
4. **Segnala l’ignoto.** Foto dell’etichetta, nome, marca. L’IA legge gli allergeni. Invia la scheda via WhatsApp o email al protocollo.
   - Azione: Segnala un prodotto → `/report`

- L’olio di frittura condiviso rende rosso solo i piatti che lo usano, non l’intero menu.
- La salsa dello chef senza scheda è gialla o rossa: non è un dettaglio, è il punto di manleva.

## Fornitore: Dal campo al lotto

Ogni evento di filiera è un blocco SHA-256. I JSON sono il carico verso il database UE.

1. **Origine e trasformazione.** Campo, mulino, caseificio, logistica, arrivo in cucina. Sequenza, attore, luogo, lotto, nota.
   - Azione: Apri la filiera → `/filiera`
2. **Hash concatenato.** Ogni blocco cita il precedente. Una modifica a un lotto spezza la catena. Il motore Python e quello web usano la stessa canonicalizzazione.
3. **Scheda tecnica.** Allergeni dichiarati, tracce, zucchero, sodio, rischi di processo. Senza scheda il piatto non può essere verde.
   - Azione: Schede prodotto → `/catalog`

- Il file protocol/manuale.py e i JSON in protocol/dati/ sono il pacchetto da caricare nel database europeo.
- Prodotto non catalogato = incentivo di mercato: resta filtrato finché il produttore non aderisce.

## Privacy: GDPR by design

Il ristorante non è titolare dei dati sanitari. L’incrocio avviene sul protocollo.

1. **Cosa c’è nel QR.** Solo l’ID pubblico. Payload SAFEPLATE:v1:SP-… oppure /kiosk?pid=. Mai allergeni, mai gravidanza, mai patologie.
   - Azione: Protocollo → `/protocol`
2. **Cosa vede la sala.** Un oggetto { status: safe | caution | unsafe }. I motivi restano nel wallet dell’ospite.
3. **Chi conserva il passaporto.** L’account dell’ospite, cifrato nel wallet. Il ristoratore firma di non memorizzare dati sanitari.
   - Azione: Testo della manleva → `/certify`
4. **Demo e produzione.** SP-DEMO-* possono mostrare i motivi nell’interfaccia ospite, per didattica. Al totem i motivi sono sempre omessi.

- Non fotografare il passaporto aperto in sala.
- Una richiesta verbale di «dimmi cosa non mangi» viola il protocollo anche se l’ospite risponde.

## FAQ

**Devo dire al cameriere che sono celiaco?**

No. Mostri il QR o l’ID. Il menu si colora. Se vuoi aggiungere un dettaglio, è una scelta tua.

**Perché la quinoa è gialla e non verde?**

L’ingrediente può essere sicuro, ma la cucina ha farina volatile o superfici condivise. Il giallo è un vettore, non un errore di catalogo.

**Il totem è rotto se non vedo il motivo del rosso?**

È corretto. Il totem è la vista personale di sala. I motivi stanno nel piatto aperto dall’ospite, non in cassa.

**Posso usare SafePlate in aereo o in nave?**

Sì. Stesso protocollo: catering aereo, cucina di bordo, grande distribuzione. Cambia solo il locale.

**Cos’è la manleva digitale?**

Una dichiarazione firmata e hashata. Non è un parere legale. Sposta la responsabilità operativa sul protocollo se i dati e i processi dichiarati sono veri.

**Come carico questo manuale nel database UE?**

Scarica il file unico Python dalla pagina Manuale (safeplate_protocol.py) insieme ai JSON di catalogo. Oppure esegui il protocollo con --export per ottenere manuale.json.

**Qual è il Main file path per Streamlit Cloud?**

streamlit_app.py. Repository vernoticoalberto-ctrl/safeplate, branch main, Python 3.12. Non usare protocol/main.py.

## Streamlit Community Cloud

Console Python pubblica. Stesso motore, stesso semaforo.

| Campo | Valore |
| --- | --- |
| Repository | `vernoticoalberto-ctrl/safeplate` |
| Branch | `main` |
| Main file path | `streamlit_app.py` |
| Python | `3.12` |
| Subdomain | `safeplate` |

Apri share.streamlit.io, accedi con GitHub, Create app → Yup, I have an app. Non usare protocol/main.py: è il motore a riga di comando. Nessun secret per la demo.
