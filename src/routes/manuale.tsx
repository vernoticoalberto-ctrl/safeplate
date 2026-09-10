import { createFileRoute, Link } from "@tanstack/react-router";
import { FileDown, FileJson, FolderArchive } from "lucide-react";
import { useState } from "react";
import { Page } from "@/components/app-shell";
import { TrafficLegend } from "@/components/traffic-light";
import { Button } from "@/components/ui/button";
import { isManualPath, manuale } from "@/lib/safeplate/manuale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manuale")({ component: ManualePage });

function ManualePage() {
  const [chapterId, setChapterId] = useState(manuale.capitoli[0]?.id ?? "ospite");
  const [source, setSource] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState(false);
  const chapter = manuale.capitoli.find((c) => c.id === chapterId) ?? manuale.capitoli[0];

  async function showPython() {
    if (source) {
      setSource(null);
      return;
    }
    try {
      const res = await fetch("/safeplate-protocol.py");
      if (!res.ok) throw new Error("missing");
      setSource(await res.text());
      setSourceError(false);
    } catch {
      setSourceError(true);
    }
  }

  return (
    <Page className="space-y-14">
      <header className="grid items-end gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">
            {manuale.kicker}
          </p>
          <h1 className="mt-2 max-w-xl font-display text-4xl tracking-tight">{manuale.titolo}</h1>
          <p className="mt-4 max-w-xl text-muted">{manuale.sottotitolo}</p>
          <p className="mt-3 max-w-xl text-sm text-muted">{manuale.intro}</p>
        </div>
        <img
          src="/images/pass-hero.jpg"
          alt="Passaporto SafePlate"
          className="aspect-[16/9] w-full rounded-2xl object-cover ring-1 ring-line"
        />
      </header>

      <p className="max-w-3xl rounded-2xl bg-cream px-5 py-4 text-sm text-muted ring-1 ring-line">
        {manuale.avvertenza}
      </p>

      <section>
        <h2 className="font-display text-3xl">Semaforo</h2>
        <p className="mt-2 max-w-2xl text-muted">
          Lo stesso codice in sala, in aereo, a bordo, a scaffale. Versione {manuale.versione}.
        </p>
        <div className="mt-6">
          <TrafficLegend />
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl">Ruoli</h2>
            <p className="mt-2 max-w-xl text-muted">Cinque procedure. Un protocollo.</p>
          </div>
          <p className="font-mono text-xs text-subtle">{manuale.protocollo}</p>
        </div>
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {manuale.capitoli.map((cap) => {
            const active = cap.id === chapter.id;
            return (
              <button
                key={cap.id}
                type="button"
                onClick={() => setChapterId(cap.id)}
                className={cn(
                  "h-11 shrink-0 rounded-full px-4 text-sm",
                  active ? "bg-ink text-paper" : "bg-cream text-muted ring-1 ring-line hover:text-ink",
                )}
              >
                {cap.ruolo}
              </button>
            );
          })}
        </div>

        {chapter ? (
          <article className="mt-8 rounded-2xl bg-cream p-6 ring-1 ring-line sm:p-8">
            <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">
              {chapter.ruolo}
            </p>
            <h3 className="mt-2 font-display text-3xl tracking-tight">{chapter.titolo}</h3>
            <p className="mt-3 max-w-2xl text-muted">{chapter.sommario}</p>
            <ol className="mt-8 space-y-6">
              {chapter.passi.map((passo) => (
                <li key={passo.n} className="grid gap-3 sm:grid-cols-[auto_1fr] sm:gap-5">
                  <span className="grid size-10 place-items-center rounded-full bg-mist font-mono text-sm">
                    {passo.n}
                  </span>
                  <div>
                    <h4 className="font-medium">{passo.titolo}</h4>
                    <p className="mt-1 text-sm text-muted">{passo.testo}</p>
                    {passo.azione && isManualPath(passo.azione.to) ? (
                      <Button asChild variant="outline" size="sm" className="mt-3">
                        <Link to={passo.azione.to}>{passo.azione.label}</Link>
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
            {chapter.note.length ? (
              <ul className="mt-8 space-y-2 border-t border-line pt-6 text-sm text-muted">
                {chapter.note.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ) : null}
      </section>

      <section>
        <h2 className="font-display text-3xl">Identità dimostrative</h2>
        <p className="mt-2 max-w-2xl text-muted">
          Non sono cartelle cliniche. Servono a incrociare il catalogo di prova.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {manuale.identita_demo.map((row) => (
            <li key={row.id} className="rounded-2xl bg-cream p-5 ring-1 ring-line">
              <p className="font-mono text-xs text-subtle">{row.id}</p>
              <h3 className="mt-2 font-medium">{row.etichetta}</h3>
              <p className="mt-2 text-sm text-muted">{row.uso}</p>
              <Link
                to="/kiosk"
                search={{ pid: row.id }}
                className="mt-4 inline-flex h-10 items-center text-sm text-sage underline-offset-2 hover:underline"
              >
                Prova al totem
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-3xl">{manuale.cloud.titolo}</h2>
        <p className="mt-2 max-w-2xl text-muted">{manuale.cloud.sottotitolo}</p>
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl bg-cream ring-1 ring-line">
          {manuale.cloud.campi.map((row) => (
            <li
              key={row.campo}
              className="grid gap-1 px-5 py-4 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-6"
            >
              <p className="font-mono text-xs text-sage">{row.campo}</p>
              <p className="font-mono text-sm">{row.valore}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-2xl text-sm text-muted">{manuale.cloud.nota}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <a href={manuale.cloud.url_share} target="_blank" rel="noreferrer">
              Apri Streamlit Cloud
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={manuale.cloud.url_github} target="_blank" rel="noreferrer">
              Repository GitHub
            </a>
          </Button>
        </div>
      </section>

      <section>
        <h2 className="font-display text-3xl">Pacchetto da caricare</h2>
        <p className="mt-2 max-w-2xl text-muted">
          File Python unico con motore, manuale e test. JSON di catalogo, filiera e manuale. Stesso
          contratto verso il database europeo.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <a href="/safeplate-protocol.py" download="safeplate_protocol.py">
              <FileDown className="size-4" strokeWidth={1.6} />
              Python completo
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/protocol/manuale.json" download="manuale.json">
              <FileJson className="size-4" strokeWidth={1.6} />
              manuale.json
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/safeplate-protocol-ue.zip" download="safeplate-protocol-ue.zip">
              <FolderArchive className="size-4" strokeWidth={1.6} />
              Pacchetto UE
            </a>
          </Button>
          <Button type="button" variant="ghost" onClick={() => void showPython()}>
            {source ? "Nascondi codice" : "Mostra codice Python"}
          </Button>
        </div>
        {sourceError ? (
          <p className="mt-3 text-sm text-danger">Il file Python non è disponibile in questa sessione.</p>
        ) : null}
        {source ? (
          <pre className="mt-6 max-h-[32rem] overflow-auto rounded-2xl bg-pass p-5 font-mono text-xs leading-relaxed text-pass-fg ring-1 ring-line">
            {source}
          </pre>
        ) : null}

        <h3 className="mt-10 font-display text-2xl">Modifiche ai file</h3>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl bg-cream ring-1 ring-line">
          {manuale.pacchetto.modifiche.map((row) => (
            <li key={row.file} className="grid gap-1 px-5 py-4 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-6">
              <p className="font-mono text-xs text-sage">{row.file}</p>
              <p className="text-sm text-muted">{row.modifica}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-3xl">Domande</h2>
        <dl className="mt-6 grid gap-4">
          {manuale.faq.map((item) => (
            <div key={item.q} className="rounded-2xl bg-cream p-5 ring-1 ring-line">
              <dt className="font-medium">{item.q}</dt>
              <dd className="mt-2 text-sm text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/wallet">Crea l’ID</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/kiosk" search={{}}>
            Apri il totem
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/protocol">Protocollo</Link>
        </Button>
      </section>
    </Page>
  );
}
