import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Page } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { SignInGate } from "@/lib/auth/gates";
import { listMyReports, submitReport } from "@/lib/safeplate/server";

export const Route = createFileRoute("/report")({ component: ReportPage });

function ReportPage() {
  return (
    <Page>
      <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">Catalogazione</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Segnala un prodotto</h1>
      <p className="mt-3 max-w-xl text-muted">
        Foto dell’etichetta, nome, disegno. L’IA legge gli allergeni. Poi invii la scheda via
        WhatsApp o email al protocollo.
      </p>
      <SignInGate
        fallback={
          <div className="mt-8 max-w-lg rounded-2xl bg-cream p-6 ring-1 ring-line">
            <p className="text-sm text-muted">Per registrare la segnalazione sul tuo account, entra.</p>
            <Button asChild className="mt-4">
              <Link to="/login">Entra</Link>
            </Button>
          </div>
        }
      >
        <ReportForm />
      </SignInGate>
    </Page>
  );
}

function ReportForm() {
  const qc = useQueryClient();
  const reports = useQuery({ queryKey: ["reports"], queryFn: () => listMyReports() });
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [result, setResult] = useState<{ analysis: string; whatsapp: string; mailto: string } | null>(
    null,
  );

  const submit = useMutation({
    mutationFn: () => submitReport({ data: { name, brand, notes, image } }),
    onSuccess: async (res) => {
      if (res.ok) {
        setResult({ analysis: res.analysis, whatsapp: res.whatsapp, mailto: res.mailto });
        await qc.invalidateQueries({ queryKey: ["reports"] });
      }
    },
  });

  function onFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      if (url.length > 850_000) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const scale = Math.min(1, 900 / img.width);
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          setImage(canvas.toDataURL("image/jpeg", 0.72));
        };
        img.src = url;
      } else {
        setImage(url);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-2">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
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
          Note
          <textarea
            className="mt-1 min-h-24 w-full rounded-lg border border-line bg-cream px-3 py-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Foto etichetta o disegno
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="mt-1 w-full text-sm"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        {image ? <img src={image} alt="Anteprima etichetta" className="max-h-48 rounded-xl object-contain" /> : null}
        {submit.data && !submit.data.ok ? (
          <p className="text-sm text-danger">{submit.data.error}</p>
        ) : null}
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? "Analisi in corso…" : "Scansiona e registra"}
        </Button>
      </form>
      <div className="space-y-6">
        {result ? (
          <div className="rounded-2xl bg-cream p-5 ring-1 ring-line">
            <h2 className="font-display text-xl">Analisi IA</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{result.analysis}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <a href={result.whatsapp} target="_blank" rel="noreferrer">
                  Invia su WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={result.mailto}>Invia per email</a>
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Dopo l’analisi puoi inoltrare la scheda al numero o all’indirizzo operativo SafePlate.
          </p>
        )}
        <section>
          <h2 className="font-display text-xl">Le tue segnalazioni</h2>
          <ul className="mt-3 space-y-3">
            {(reports.data ?? []).map((r) => (
              <li key={r.id} className="rounded-xl bg-cream p-4 text-sm ring-1 ring-line">
                <p className="font-medium">{r.product_name}</p>
                <p className="text-xs text-subtle">{new Date(r.created_at).toLocaleString("it-IT")}</p>
                <p className="mt-2 line-clamp-4 text-muted">{r.ai_analysis}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
