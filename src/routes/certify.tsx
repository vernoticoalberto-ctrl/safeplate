import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Page } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { SignInGate } from "@/lib/auth/gates";
import { DECLARATION } from "@/lib/safeplate/constants";
import { listCertifications, signCertification } from "@/lib/safeplate/server";

export const Route = createFileRoute("/certify")({ component: CertifyPage });

const OPTIONS = [
  "Schede tecniche fornitori",
  "Olio di frittura dedicato / tracciato",
  "Protocollo farina volatile",
  "Superfici e taglieri separati",
  "Catena del freddo",
  "SafePlate Pregnancy (listeria / toxo)",
];

function CertifyPage() {
  const certs = useQuery({ queryKey: ["certs"], queryFn: () => listCertifications() });
  return (
    <Page className="space-y-10">
      <div>
        <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">Manleva digitale</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Autocertificazione</h1>
        <p className="mt-3 max-w-xl text-muted">
          L’operatore firma la dichiarazione di responsabilità. Se segue il protocollo validato, la
          scudo di responsabilità si sposta sull’algoritmo certificato.
        </p>
      </div>
      <SignInGate
        fallback={
          <div className="max-w-lg rounded-2xl bg-cream p-6 ring-1 ring-line">
            <p className="text-sm text-muted">La firma richiede un account operatore.</p>
            <Button asChild className="mt-4">
              <Link to="/login">Entra</Link>
            </Button>
          </div>
        }
      >
        <CertForm />
      </SignInGate>
      <section>
        <h2 className="font-display text-2xl">Registro pubblico</h2>
        <ul className="mt-4 space-y-3">
          {(certs.data ?? []).map((c) => (
            <li key={c.id} className="rounded-xl bg-cream p-4 ring-1 ring-line">
              <p className="font-medium">{c.restaurant_name}</p>
              <p className="text-sm text-muted">
                {c.city} · {c.signature_name}
              </p>
              <p className="mt-2 font-mono text-[11px] text-subtle break-all">{c.content_hash}</p>
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
}

function CertForm() {
  const qc = useQueryClient();
  const [restaurantName, setRestaurantName] = useState("");
  const [city, setCity] = useState("");
  const [signatureName, setSignatureName] = useState("");
  const [protocols, setProtocols] = useState<string[]>([OPTIONS[0]]);
  const [hash, setHash] = useState<string | null>(null);
  const sign = useMutation({
    mutationFn: () =>
      signCertification({ data: { restaurantName, city, signatureName, protocols } }),
    onSuccess: async (res) => {
      if (res.ok) {
        setHash(res.hash);
        await qc.invalidateQueries({ queryKey: ["certs"] });
      }
    },
  });

  function toggle(item: string) {
    setProtocols((cur) => (cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item]));
  }

  return (
    <form
      className="max-w-xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        sign.mutate();
      }}
    >
      <label className="block text-sm">
        Attività
        <input
          required
          className="mt-1 h-11 w-full rounded-lg border border-line bg-cream px-3"
          value={restaurantName}
          onChange={(e) => setRestaurantName(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Città
        <input
          className="mt-1 h-11 w-full rounded-lg border border-line bg-cream px-3"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Firmatario
        <input
          required
          className="mt-1 h-11 w-full rounded-lg border border-line bg-cream px-3"
          value={signatureName}
          onChange={(e) => setSignatureName(e.target.value)}
        />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm">Protocolli adottati</legend>
        {OPTIONS.map((item) => (
          <label key={item} className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-sage"
              checked={protocols.includes(item)}
              onChange={() => toggle(item)}
            />
            {item}
          </label>
        ))}
      </fieldset>
      <blockquote className="rounded-xl bg-mist p-4 text-sm leading-relaxed text-muted">
        {DECLARATION}
      </blockquote>
      {sign.data && !sign.data.ok ? <p className="text-sm text-danger">{sign.data.error}</p> : null}
      {hash ? (
        <p className="font-mono text-xs break-all text-sage">Firmato · {hash}</p>
      ) : null}
      <Button type="submit" disabled={sign.isPending}>
        {sign.isPending ? "Firma in corso…" : "Firma la dichiarazione"}
      </Button>
    </form>
  );
}
