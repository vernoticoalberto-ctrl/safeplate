import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChainView, type ChainItem } from "@/components/chain-view";
import { PassCard } from "@/components/pass-card";
import { TrafficBadge, TrafficLegend } from "@/components/traffic-light";
import { Button } from "@/components/ui/button";
import { DECLARATION } from "@/lib/safeplate/constants";
import { encodePayload, parsePayload } from "@/lib/safeplate/engine";
import { manuale } from "@/lib/safeplate/manuale";
import {
  getRestaurantMenu,
  listCatalog,
  listCertifications,
  listFiliera,
} from "@/lib/safeplate/server";
import { readPid, writePid } from "@/lib/safeplate/session-pid";
import {
  allergenLabel,
  RESTAURANT_KIND,
} from "@/lib/safeplate/types";
import type { VistaId } from "@/lib/safeplate/vistas";
import { formatPrice } from "@/lib/utils";

type DemoPerson = {
  id: string;
  etichetta: string;
  note: string;
  allergeni: string[];
  gravidanza: boolean;
  diabete: boolean;
  ipertensione: boolean;
};

type Boot = {
  restaurants: Array<{
    id: string;
    nome: string;
    tipo: string;
    citta: string;
    certificato: boolean;
    immagine: string;
    indirizzo: string;
  }>;
  demoPassports: DemoPerson[];
  counts: { fornitori: number; prodotti: number; piatti: number; eventi: number };
};

type MenuResult = Awaited<ReturnType<typeof getRestaurantMenu>>;
type MenuOk = Extract<MenuResult, { ok: true }>;

const CERT_OPTIONS = [
  "Schede tecniche fornitori",
  "Olio di frittura dedicato / tracciato",
  "Protocollo farina volatile",
  "Superfici e taglieri separati",
  "Catena del freddo",
  "SafePlate Pregnancy (listeria / toxo)",
];

export function AppConsole({
  vista,
  boot,
  pid: initialPid,
  rid: initialRid,
  menu: initialMenu,
  origin,
}: {
  vista: VistaId;
  boot: Boot;
  pid: string;
  rid: string;
  menu: MenuResult | null;
  origin: string;
}) {
  const [pid, setPid] = useState(initialPid);
  const [rid, setRid] = useState(initialRid);
  const [raw, setRaw] = useState(initialPid);

  useEffect(() => {
    const stored = readPid();
    if (stored && stored !== pid) {
      setPid(stored);
      setRaw(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const person = boot.demoPassports.find((p) => p.id === pid) ?? boot.demoPassports[0];
  const menuQuery = useQuery({
    queryKey: ["console-menu", rid, pid, vista === "totem"],
    queryFn: () =>
      getRestaurantMenu({
        data: { restaurantId: rid, passportId: pid, kiosk: vista === "totem" },
      }),
    initialData:
      rid === initialRid && pid === initialPid && initialMenu && initialMenu.ok
        ? initialMenu
        : undefined,
  });
  const items = menuQuery.data && menuQuery.data.ok ? menuQuery.data.items : [];
  const restaurant = menuQuery.data && menuQuery.data.ok ? menuQuery.data.restaurant : null;

  function pickPerson(id: string) {
    writePid(id);
    setPid(id);
    setRaw(id);
  }

  return (
    <div className="space-y-8">
      {vista === "wallet" ? (
        <WalletPane boot={boot} person={person} pid={pid} origin={origin} onPick={pickPerson} />
      ) : null}
      {vista === "menu" ? (
        <MenuPane
          boot={boot}
          pid={pid}
          rid={rid}
          items={items}
          restaurant={restaurant}
          onPid={pickPerson}
          onRid={setRid}
          kiosk={false}
        />
      ) : null}
      {vista === "totem" ? (
        <TotemPane
          boot={boot}
          pid={pid}
          raw={raw}
          rid={rid}
          items={items}
          restaurant={restaurant}
          onRaw={setRaw}
          onScan={() => pickPerson(parsePayload(raw) ?? raw.trim())}
          onPick={pickPerson}
          onRid={setRid}
        />
      ) : null}
      {vista === "filiera" ? <FilieraPane /> : null}
      {vista === "catalogo" ? <CatalogoPane /> : null}
      {vista === "segnala" ? <SegnalaPane /> : null}
      {vista === "manleva" ? <ManlevaPane /> : null}
      {vista === "manuale" ? <ManualePane /> : null}
    </div>
  );
}

function WalletPane({
  boot,
  person,
  pid,
  origin,
  onPick,
}: {
  boot: Boot;
  person?: DemoPerson;
  pid: string;
  origin: string;
  onPick: (id: string) => void;
}) {
  const payload = encodePayload(pid, origin || undefined);
  return (
    <div className="space-y-10">
      <header className="grid items-end gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">
            Protocollo SafePlate · Med-Tech
          </p>
          <h1 className="mt-3 max-w-xl font-display text-4xl tracking-tight sm:text-5xl">
            Il tuo piatto. La tua privacy.
          </h1>
          <p className="mt-4 max-w-lg text-muted">
            Passaporto nel wallet, QR senza dati sanitari, menu a semaforo. Il ristorante vede
            solo sicuro / attenzione / non sicuro.
          </p>
          <p className="mt-4 text-sm text-subtle">
            {boot.counts.piatti} piatti · {boot.counts.prodotti} schede · {boot.counts.eventi}{" "}
            blocchi di filiera · {boot.counts.fornitori} fornitori
          </p>
        </div>
        <PassCard publicId={pid} payload={payload} name={person?.etichetta} />
      </header>

      <section>
        <h2 className="font-display text-2xl">Identità dimostrative</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Non sono cartelle cliniche. Servono a incrociare il catalogo. Il tuo passaporto reale
          si crea con un account.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boot.demoPassports.map((row) => {
            const on = row.id === pid;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onPick(row.id)}
                  className={
                    "w-full rounded-2xl p-5 text-left ring-1 " +
                    (on ? "bg-ink text-paper ring-ink" : "bg-cream text-ink ring-line")
                  }
                >
                  <p className={"font-mono text-xs " + (on ? "text-paper/60" : "text-subtle")}>
                    {row.id}
                  </p>
                  <p className="mt-2 font-medium">{row.etichetta}</p>
                  <p className={"mt-2 text-sm " + (on ? "text-paper/70" : "text-muted")}>
                    {row.allergeni.length
                      ? row.allergeni.map(allergenLabel).join(" · ")
                      : "Nessun allergene EU 14"}
                    {row.gravidanza ? " · gravidanza" : ""}
                    {row.diabete ? " · diabete" : ""}
                    {row.ipertensione ? " · ipertensione" : ""}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "QR cieco",
            body: "Il codice contiene solo l’ID pubblico. Mai allergeni, gravidanza o patologie.",
          },
          {
            title: "Semaforo in sala",
            body: "Il personale riceve un oggetto { status }. I motivi restano nel wallet.",
          },
          {
            title: "Filiera sigillata",
            body: "Ogni lotto è un blocco SHA-256: origine, trasformazione, logistica, piatto.",
          },
        ].map((item) => (
          <article key={item.title} className="rounded-2xl bg-cream p-5 ring-1 ring-line">
            <h3 className="font-display text-xl">{item.title}</h3>
            <p className="mt-2 text-sm text-muted">{item.body}</p>
          </article>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/wallet">Crea il tuo ID</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/" search={{ vista: "totem" }}>
            Apri il totem
          </Link>
        </Button>
      </div>
    </div>
  );
}

function MenuPane({
  boot,
  pid,
  rid,
  items,
  restaurant,
  onPid,
  onRid,
  kiosk,
}: {
  boot: Boot;
  pid: string;
  rid: string;
  items: MenuOk["items"];
  restaurant: MenuOk["restaurant"] | null;
  onPid: (id: string) => void;
  onRid: (id: string) => void;
  kiosk: boolean;
}) {
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">Menu filtrato</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">
          {restaurant?.nome ?? "Menu"}
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          {kiosk
            ? "Vista totem: niente motivi sanitari. Solo il semaforo."
            : "Incrocio sul passaporto dimostrativo. I motivi restano visibili all’ospite, non in cassa."}
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Identità
          <select
            className="mt-1 h-11 w-full rounded-lg border border-line bg-cream px-3"
            value={pid}
            onChange={(e) => onPid(e.target.value)}
          >
            {boot.demoPassports.map((p) => (
              <option key={p.id} value={p.id}>
                {p.etichetta}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Locale
          <select
            className="mt-1 h-11 w-full rounded-lg border border-line bg-cream px-3"
            value={rid}
            onChange={(e) => onRid(e.target.value)}
          >
            {boot.restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome} · {RESTAURANT_KIND[r.tipo] ?? r.tipo}
              </option>
            ))}
          </select>
        </label>
      </div>
      <TrafficLegend />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.id}
            to="/dish/$dishId"
            params={{ dishId: item.id }}
            search={{ pid }}
            className="overflow-hidden rounded-2xl bg-cream ring-1 ring-line"
          >
            <img src={item.immagine} alt="" className="aspect-[4/3] w-full object-cover" />
            <div className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium">{item.nome}</h3>
                {item.status ? <TrafficBadge status={item.status} compact /> : null}
              </div>
              <p className="line-clamp-2 text-sm text-muted">{item.descrizione}</p>
              {!kiosk && item.reasons[0] ? (
                <p className="line-clamp-2 text-xs text-subtle">{item.reasons[0]}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TotemPane({
  boot,
  pid,
  raw,
  rid,
  items,
  restaurant,
  onRaw,
  onScan,
  onPick,
  onRid,
}: {
  boot: Boot;
  pid: string;
  raw: string;
  rid: string;
  items: MenuOk["items"];
  restaurant: MenuOk["restaurant"] | null;
  onRaw: (v: string) => void;
  onScan: () => void;
  onPick: (id: string) => void;
  onRid: (id: string) => void;
}) {
  const safeCount = items.filter((i) => i.status === "safe").length;
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">Totem / kiosk</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Scansione silenziosa</h1>
        <p className="mt-3 max-w-xl text-muted">
          Il personale non vede allergie, gravidanza o patologie. Solo il semaforo.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="text-sm">
          Locale
          <select
            className="mt-1 h-11 w-full rounded-lg border border-line bg-cream px-3"
            value={rid}
            onChange={(e) => onRid(e.target.value)}
          >
            {boot.restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome} · {RESTAURANT_KIND[r.tipo] ?? r.tipo}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          SafePlate ID o payload
          <div className="mt-1 flex gap-2">
            <input
              className="h-11 flex-1 rounded-lg border border-line bg-cream px-3 font-mono text-sm"
              value={raw}
              onChange={(e) => onRaw(e.target.value)}
              placeholder="SP-DEMO-CELIA"
            />
            <Button type="button" onClick={onScan}>
              Incrocia
            </Button>
          </div>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {boot.demoPassports.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.id)}
            className="h-10 rounded-full bg-mist px-3 text-xs hover:bg-line"
          >
            {p.etichetta.replace("Demo · ", "")}
          </button>
        ))}
      </div>
      {restaurant ? (
        <div>
          <h2 className="font-display text-2xl">{restaurant.nome}</h2>
          <p className="text-sm text-muted">
            ID {pid} · {safeCount} piatti sicuri su {items.length}
          </p>
          <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl bg-cream ring-1 ring-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 p-4">
                <img src={item.immagine} alt="" className="size-16 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.nome}</p>
                  <p className="text-sm text-muted">{formatPrice(item.prezzo_cent)}</p>
                </div>
                {item.status ? <TrafficBadge status={item.status} /> : null}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-subtle">
            Vista totem: i motivi sanitari sono omessi di proposito.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function FilieraPane() {
  const data = useQuery({ queryKey: ["filiera"], queryFn: () => listFiliera() });
  const [productId, setProductId] = useState("prod-semola");
  const events = useMemo(() => {
    return ((data.data?.events ?? []) as ChainItem[]).filter((e) => e.prodotto_id === productId);
  }, [data.data, productId]);
  const product = data.data?.products.find((p) => p.id === productId);
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">Registro</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Filiera</h1>
        <p className="mt-3 max-w-xl text-muted">
          Dal campo al piatto. Ogni evento ha un hash SHA-256 legato al precedente.
        </p>
      </header>
      <img
        src="/images/grano.jpg"
        alt="Campo di grano"
        className="aspect-[21/8] w-full rounded-2xl object-cover"
      />
      <label className="block max-w-lg text-sm">
        Prodotto
        <select
          className="mt-1 h-11 w-full rounded-lg border border-line bg-cream px-3"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          {(data.data?.products ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
      {product ? (
        <p className="text-sm text-muted">
          Origine {product.origine_luogo} · lotto {product.lotto}
        </p>
      ) : null}
      <ChainView events={events} />
    </div>
  );
}

function CatalogoPane() {
  const data = useQuery({ queryKey: ["catalog"], queryFn: () => listCatalog() });
  const [q, setQ] = useState("");
  const products = useMemo(() => {
    const list = data.data?.products ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (p) =>
        p.nome.toLowerCase().includes(s) ||
        p.marca.toLowerCase().includes(s) ||
        p.lotto.toLowerCase().includes(s),
    );
  }, [data.data, q]);
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">Catalogo UE</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Prodotti e schede</h1>
        <p className="mt-3 max-w-xl text-muted">
          JSON di prova pronti per il database europeo. Senza scheda il piatto non può essere verde.
        </p>
      </header>
      <input
        className="h-12 w-full max-w-md rounded-xl border border-line bg-cream px-4"
        placeholder="Cerca nome, marca, lotto"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <li key={p.id}>
            <Link
              to="/product/$productId"
              params={{ productId: p.id }}
              className="block overflow-hidden rounded-2xl bg-cream ring-1 ring-line"
            >
              <img src={p.immagine} alt="" className="aspect-[16/9] w-full object-cover" />
              <div className="p-4">
                <p className="text-xs text-subtle">{p.marca}</p>
                <h2 className="mt-1 font-medium">{p.nome}</h2>
                <p className="mt-1 font-mono text-[11px] text-muted">{p.lotto}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.stato_certificazione !== "certified" ? (
                    <span className="rounded-full bg-caution/10 px-2 py-0.5 text-[11px] text-caution">
                      non rintracciabile
                    </span>
                  ) : (
                    <span className="rounded-full bg-safe/10 px-2 py-0.5 text-[11px] text-safe">
                      certificato
                    </span>
                  )}
                  {p.allergeni.map((a) => (
                    <span key={a} className="rounded-full bg-mist px-2 py-0.5 text-[11px]">
                      {allergenLabel(a)}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SegnalaPane() {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<{ analysis: string; whatsapp: string; mailto: string } | null>(
    null,
  );
  const send = useMutation({
    mutationFn: async () => {
      const nome = name.trim();
      if (!nome) throw new Error("Indica il nome del prodotto");
      const analysis = [
        "Scheda preliminare. Prodotto non in banca dati = giallo finché il produttore non aderisce.",
        `Nome: ${nome}`,
        `Marca: ${brand.trim() || "—"}`,
        notes.trim() ? `Note: ${notes.trim()}` : null,
        "Allergeni EU 14: da confermare su etichetta. Tracce e vettori di cucina restano a carico del locale.",
      ]
        .filter(Boolean)
        .join("\n");
      const body = `Segnalazione SafePlate — prodotto non catalogato\nNome: ${nome}\nMarca: ${brand || "—"}\nNote: ${notes || "—"}\nAnalisi: ${analysis}`;
      return {
        analysis,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(body)}`,
        mailto: `mailto:segnalazioni@safeplate.eu?subject=${encodeURIComponent("SafePlate: prodotto non catalogato — " + nome)}&body=${encodeURIComponent(body)}`,
      };
    },
    onSuccess: setResult,
  });
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">Catalogazione</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Segnala un prodotto</h1>
        <p className="mt-3 max-w-xl text-muted">
          Foto, nome, disegno. Poi inoltri la scheda via WhatsApp o email. Senza catalogo il piatto
          resta giallo.
        </p>
      </header>
      <div className="grid gap-10 lg:grid-cols-2">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
        >
          <label className="block text-sm">
            Nome del prodotto
            <input
              required
              className="mt-1 h-11 w-full rounded-lg border border-line bg-cream px-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Marca
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line bg-cream px-3"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Note / ingredienti visibili
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-line bg-cream px-3 py-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={send.isPending}>
            Prepara la scheda
          </Button>
          <p className="text-xs text-subtle">
            Per analizzare la foto con IA e registrarla sul tuo account,{" "}
            <Link to="/report" className="text-sage underline-offset-2 hover:underline">
              entra e apri Segnala
            </Link>
            .
          </p>
        </form>
        {result ? (
          <div className="rounded-2xl bg-cream p-5 ring-1 ring-line">
            <h2 className="font-display text-xl">Scheda</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {result.analysis}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <a href={result.whatsapp} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={result.mailto}>Email</a>
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Dopo la scheda puoi inoltrare al numero operativo o all’indirizzo SafePlate.
          </p>
        )}
      </div>
    </div>
  );
}

function ManlevaPane() {
  const certs = useQuery({ queryKey: ["certs"], queryFn: () => listCertifications() });
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">
          Manleva digitale
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Autocertificazione</h1>
        <p className="mt-3 max-w-xl text-muted">
          L’operatore firma i processi di cucina. Il personale continua a vedere solo il semaforo.
        </p>
      </header>
      <blockquote className="rounded-2xl bg-mist p-5 text-sm leading-relaxed text-muted">
        {DECLARATION}
      </blockquote>
      <ul className="grid gap-2 sm:grid-cols-2">
        {CERT_OPTIONS.map((item) => (
          <li key={item} className="rounded-xl bg-cream px-4 py-3 text-sm ring-1 ring-line">
            {item}
          </li>
        ))}
      </ul>
      <Button asChild>
        <Link to="/certify">Firma con account operatore</Link>
      </Button>
      <section>
        <h2 className="font-display text-2xl">Registro pubblico</h2>
        <ul className="mt-4 space-y-3">
          {(certs.data ?? []).length === 0 ? (
            <li className="text-sm text-muted">Nessuna firma in questa sessione.</li>
          ) : (
            (certs.data ?? []).map((c) => (
              <li key={c.id} className="rounded-xl bg-cream p-4 ring-1 ring-line">
                <p className="font-medium">{c.restaurant_name}</p>
                <p className="text-sm text-muted">
                  {c.city} · {c.signature_name}
                </p>
                <p className="mt-2 font-mono text-[11px] text-subtle break-all">{c.content_hash}</p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function ManualePane() {
  const [chapterId, setChapterId] = useState(manuale.capitoli[0]?.id ?? "ospite");
  const chapter = manuale.capitoli.find((c) => c.id === chapterId) ?? manuale.capitoli[0];
  return (
    <div className="space-y-10">
      <header>
        <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">{manuale.kicker}</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">{manuale.titolo}</h1>
        <p className="mt-3 max-w-xl text-muted">{manuale.sottotitolo}</p>
      </header>
      <TrafficLegend />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {manuale.capitoli.map((cap) => (
          <button
            key={cap.id}
            type="button"
            onClick={() => setChapterId(cap.id)}
            className={
              "h-11 shrink-0 rounded-lg px-3 text-sm " +
              (cap.id === chapter.id ? "bg-mist font-medium" : "text-muted hover:bg-mist")
            }
          >
            {cap.ruolo}
          </button>
        ))}
      </div>
      {chapter ? (
        <article className="space-y-6">
          <h2 className="font-display text-2xl">{chapter.titolo}</h2>
          <p className="text-muted">{chapter.sommario}</p>
          <ol className="space-y-5">
            {chapter.passi.map((passo) => (
              <li key={passo.n} className="grid gap-3 sm:grid-cols-[auto_1fr] sm:gap-5">
                <span className="grid size-10 place-items-center rounded-full bg-mist font-mono text-sm">
                  {passo.n}
                </span>
                <div>
                  <h3 className="font-medium">{passo.titolo}</h3>
                  <p className="mt-1 text-sm text-muted">{passo.testo}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
      ) : null}
      <Button asChild variant="outline">
        <Link to="/manuale">Apri il manuale completo</Link>
      </Button>
    </div>
  );
}
