import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/app-shell";
import { TrafficLegend } from "@/components/traffic-light";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/protocol")({ component: ProtocolPage });

function ProtocolPage() {
  return (
    <Page className="space-y-12">
      <header>
        <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">
          Specifiche ufficiali
        </p>
        <h1 className="mt-2 max-w-2xl font-display text-4xl tracking-tight">
          Protocollo SafePlate
        </h1>
        <p className="mt-4 max-w-2xl text-muted">
          Infrastruttura Med-Tech per standardizzare sicurezza alimentare e manleva digitale.
          Motore Python, dati JSON verso il database UE, console operativa in questa app.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl bg-cream p-5 ring-1 ring-line">
          <h2 className="font-display text-xl">Privacy by design</h2>
          <p className="mt-2 text-sm text-muted">
            Il ristoratore non memorizza dati sanitari. L’incrocio restituisce solo lo stato del
            semaforo. Il QR contiene l’ID pubblico, mai gli allergeni.
          </p>
        </article>
        <article className="rounded-2xl bg-cream p-5 ring-1 ring-line">
          <h2 className="font-display text-xl">Manleva</h2>
          <p className="mt-2 text-sm text-muted">
            Con dichiarazione digitale firmata e protocollo seguito, la responsabilità operativa si
            sposta sull’algoritmo certificato, fermi gli obblighi di legge inderogabili.
          </p>
        </article>
        <article className="rounded-2xl bg-cream p-5 ring-1 ring-line">
          <h2 className="font-display text-xl">Vettori invisibili</h2>
          <p className="mt-2 text-sm text-muted">
            Olio di frittura condiviso, farina volatile, superfici. Non basta l’etichetta: si
            valida il processo di cucina.
          </p>
        </article>
        <article className="rounded-2xl bg-cream p-5 ring-1 ring-line">
          <h2 className="font-display text-xl">Incentivo di mercato</h2>
          <p className="mt-2 text-sm text-muted">
            Prodotto non in banca dati = giallo. Resta filtrato, finché il produttore non aderisce.
          </p>
        </article>
      </section>

      <TrafficLegend />

      <section>
        <h2 className="font-display text-2xl">Scala</h2>
        <ul className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
          <li>Trattorie e ristorazione locale</li>
          <li>Totem e kiosk (es. stazioni, catene)</li>
          <li>Catering aereo</li>
          <li>Cucine di bordo</li>
          <li>Grande distribuzione, scansione a scaffale</li>
          <li>Riduzione premi RC tramite rischio algoritmico documentato</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-2xl">Total Care</h2>
        <p className="mt-2 max-w-xl text-muted">
          Oltre alle allergie: gravidanza (listeria, toxoplasmosi), diabete (zuccheri da scheda
          tecnica), ipertensione (sodio). Attivi nel passaporto.
        </p>
      </section>

      <section className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/wallet">Crea l’ID</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/certify">Autocertifica un locale</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/manuale">Manuale di utilizzo</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/catalog">Catalogo</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/report">Segnala un prodotto</Link>
        </Button>
      </section>
    </Page>
  );
}
