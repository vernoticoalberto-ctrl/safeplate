import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Page } from "@/components/app-shell";
import { PassCard } from "@/components/pass-card";
import { Button } from "@/components/ui/button";
import { SignInGate } from "@/lib/auth/gates";
import { encodePayload } from "@/lib/safeplate/engine";
import { getMyPassport, saveMyPassport } from "@/lib/safeplate/server";
import { EU14 } from "@/lib/safeplate/types";
import { writePid } from "@/lib/safeplate/session-pid";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/wallet")({ component: WalletPage });

function WalletPage() {
  return (
    <Page>
      <SignInGate
        fallback={
          <div className="mx-auto max-w-lg rounded-2xl bg-cream p-8 text-center ring-1 ring-line">
            <h1 className="font-display text-3xl">Il tuo SafePlate ID</h1>
            <p className="mt-3 text-muted">
              Accedi per creare il passaporto. I dati restano nel tuo account, mai nel QR.
            </p>
            <Button asChild className="mt-6">
              <Link to="/login">Entra</Link>
            </Button>
          </div>
        }
      >
        <WalletInner />
      </SignInGate>
    </Page>
  );
}

function WalletInner() {
  const user = useCurrentUser();
  const qc = useQueryClient();
  const pass = useQuery({ queryKey: ["passport"], queryFn: () => getMyPassport() });
  const [origin, setOrigin] = useState("");
  const [allergens, setAllergens] = useState<string[]>([]);
  const [pregnancy, setPregnancy] = useState(false);
  const [diabetes, setDiabetes] = useState(false);
  const [hypertension, setHypertension] = useState(false);
  const [sugar, setSugar] = useState("8");
  const [sodium, setSodium] = useState("400");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!pass.data) return;
    setAllergens(pass.data.allergens);
    setPregnancy(pass.data.pregnancy);
    setDiabetes(pass.data.diabetes);
    setHypertension(pass.data.hypertension);
    if (pass.data.sugarLimitG != null) setSugar(String(pass.data.sugarLimitG));
    if (pass.data.sodiumLimitMg != null) setSodium(String(pass.data.sodiumLimitMg));
    writePid(pass.data.publicId);
  }, [pass.data]);

  const save = useMutation({
    mutationFn: () =>
      saveMyPassport({
        data: {
          allergens,
          pregnancy,
          diabetes,
          hypertension,
          sugarLimitG: diabetes ? Number(sugar) || null : null,
          sodiumLimitMg: hypertension ? Number(sodium) || null : null,
        },
      }),
    onSuccess: async () => {
      setSaved(true);
      await qc.invalidateQueries({ queryKey: ["passport"] });
    },
  });

  if (pass.isPending || !pass.data) {
    return <div className="h-64 animate-pulse rounded-2xl bg-mist" />;
  }

  const payload = encodePayload(pass.data.publicId, origin || undefined);

  function toggle(id: string) {
    setAllergens((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    setSaved(false);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-4">
        <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">Wallet</p>
        <h1 className="font-display text-4xl tracking-tight">Passaporto</h1>
        <PassCard
          publicId={pass.data.publicId}
          payload={payload}
          name={user?.displayName ?? undefined}
        />
        <p className="text-sm text-muted">
          Mostra questo QR al totem. Il locale non legge le tue condizioni. Puoi copiare il
          collegamento o aggiungerlo agli screenshot del wallet del telefono.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(payload);
            }}
          >
            Copia collegamento
          </Button>
          <Button asChild variant="ghost">
            <Link to="/kiosk" search={{ pid: pass.data.publicId }}>
              Simula scansione
            </Link>
          </Button>
        </div>
      </div>
      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <section>
          <h2 className="font-display text-2xl">Allergeni EU 14</h2>
          <p className="mt-1 text-sm text-muted">Seleziona solo ciò che ti riguarda. Resta sul tuo account.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-2">
            {EU14.map((a) => {
              const on = allergens.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggle(a.id)}
                  className={
                    "min-h-12 rounded-xl px-3 py-2 text-left text-sm ring-1 " +
                    (on ? "bg-ink text-paper ring-ink" : "bg-cream text-ink ring-line")
                  }
                >
                  {a.short}
                </button>
              );
            })}
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="font-display text-2xl">Estensioni Total Care</h2>
          <label className="flex min-h-12 items-center justify-between rounded-xl bg-cream px-4 ring-1 ring-line">
            <span>SafePlate Pregnancy</span>
            <input
              type="checkbox"
              className="size-5 accent-sage"
              checked={pregnancy}
              onChange={(e) => {
                setPregnancy(e.target.checked);
                setSaved(false);
              }}
            />
          </label>
          <label className="flex min-h-12 items-center justify-between rounded-xl bg-cream px-4 ring-1 ring-line">
            <span>Diabete · limite zuccheri</span>
            <input
              type="checkbox"
              className="size-5 accent-sage"
              checked={diabetes}
              onChange={(e) => {
                setDiabetes(e.target.checked);
                setSaved(false);
              }}
            />
          </label>
          {diabetes ? (
            <label className="block text-sm">
              Soglia zuccheri (g / porzione)
              <input
                className="mt-1 h-11 w-full rounded-lg border border-line bg-cream px-3"
                type="number"
                min={0}
                value={sugar}
                onChange={(e) => setSugar(e.target.value)}
              />
            </label>
          ) : null}
          <label className="flex min-h-12 items-center justify-between rounded-xl bg-cream px-4 ring-1 ring-line">
            <span>Ipertensione · limite sodio</span>
            <input
              type="checkbox"
              className="size-5 accent-sage"
              checked={hypertension}
              onChange={(e) => {
                setHypertension(e.target.checked);
                setSaved(false);
              }}
            />
          </label>
          {hypertension ? (
            <label className="block text-sm">
              Soglia sodio (mg / porzione)
              <input
                className="mt-1 h-11 w-full rounded-lg border border-line bg-cream px-3"
                type="number"
                min={0}
                value={sodium}
                onChange={(e) => setSodium(e.target.value)}
              />
            </label>
          ) : null}
        </section>
        <Button type="submit" disabled={save.isPending} className="w-full sm:w-auto">
          {save.isPending ? "Salvataggio…" : saved ? "Salvato" : "Salva passaporto"}
        </Button>
      </form>
    </div>
  );
}
