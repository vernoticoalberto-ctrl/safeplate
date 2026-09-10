# Filiera · registro a catena

Ogni evento (raccolta, molitura, pastorizzazione, spedizione, ricezione) è un
blocco:

```
hash = SHA-256(canonical({
  seq, tipo, attore, luogo, quando, lotto, note, prev_hash, prodotto_id
}))
```

`prev_hash` del primo blocco è 64 zeri (`GENESIS`). Una modifica a un lotto o a
una nota spezza la catena: `verify_chain` torna `ok: false`.

I prodotti in stato `pending` (es. salsa dello chef) hanno filiera incompleta:
il semaforo non può diventare verde. È l’incentivo di mercato perché il
produttore aderisca a SafePlate.
