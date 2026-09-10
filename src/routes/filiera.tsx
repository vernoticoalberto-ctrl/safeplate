import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Page } from "@/components/app-shell";
import { ChainView } from "@/components/chain-view";
import { listFiliera } from "@/lib/safeplate/server";

export const Route = createFileRoute("/filiera")({
  loader: () => listFiliera(),
  component: FilieraPage,
});

function FilieraPage() {
  const loaded = Route.useLoaderData();
  const data = useQuery({
    queryKey: ["filiera"],
    queryFn: () => listFiliera(),
    initialData: loaded,
  });
  const [productId, setProductId] = useState("prod-semola");
  const events = useMemo(() => {
    return (data.data?.events ?? []).filter((e) => e.prodotto_id === productId);
  }, [data.data, productId]);
  const product = data.data?.products.find((p) => p.id === productId);
  const supplier = data.data?.suppliers.find((s) => s.id === product?.fornitore_id);

  return (
    <Page>
      <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">Registro</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Filiera</h1>
      <p className="mt-3 max-w-xl text-muted">
        Dal campo al piatto. Ogni evento ha un hash SHA-256 legato al precedente. I JSON di prova
        sono il contratto verso il database UE.
      </p>
      <div className="mt-8 overflow-hidden rounded-2xl">
        <img src="/images/grano.jpg" alt="Campo di grano in Puglia" className="aspect-[21/8] w-full object-cover" />
      </div>
      <label className="mt-8 block text-sm">
        Prodotto
        <select
          className="mt-1 h-11 w-full max-w-lg rounded-lg border border-line bg-cream px-3"
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
        <p className="mt-3 text-sm text-muted">
          {supplier?.nome} · origine {product.origine_luogo} · lotto {product.lotto} ·{" "}
          <Link
            to="/product/$productId"
            params={{ productId: product.id }}
            className="text-sage underline-offset-2 hover:underline"
          >
            scheda tecnica
          </Link>
        </p>
      ) : null}
      <div className="mt-8">
        <ChainView events={events} />
      </div>
      <p className="mt-10 text-sm">
        <Link to="/catalog" className="text-sage underline-offset-2 hover:underline">
          Apri il catalogo prodotti
        </Link>
      </p>
    </Page>
  );
}
