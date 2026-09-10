import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Page } from "@/components/app-shell";
import { listCatalog } from "@/lib/safeplate/server";
import { allergenLabel } from "@/lib/safeplate/types";

export const Route = createFileRoute("/catalog")({
  loader: () => listCatalog(),
  component: CatalogPage,
});

function CatalogPage() {
  const loaded = Route.useLoaderData();
  const data = useQuery({
    queryKey: ["catalog"],
    queryFn: () => listCatalog(),
    initialData: loaded,
  });
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
    <Page>
      <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">Catalogo UE</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Prodotti e schede</h1>
      <p className="mt-3 max-w-xl text-muted">
        JSON di prova pronti per il database europeo. Scansiona un lotto, apri la filiera.
      </p>
      <input
        className="mt-6 h-12 w-full max-w-md rounded-xl border border-line bg-cream px-4"
        placeholder="Cerca nome, marca, lotto"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </Page>
  );
}
