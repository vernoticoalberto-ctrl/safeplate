import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Page } from "@/components/app-shell";
import { ChainView } from "@/components/chain-view";
import { getProductDetail } from "@/lib/safeplate/server";
import { allergenLabel } from "@/lib/safeplate/types";

export const Route = createFileRoute("/product/$productId")({
  loader: async ({ params }) => getProductDetail({ data: { productId: params.productId } }),
  component: ProductPage,
});

function ProductPage() {
  const { productId } = Route.useParams();
  const loaded = Route.useLoaderData();
  const detail = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductDetail({ data: { productId } }),
    initialData: loaded,
  });
  if (detail.isPending) return <Page><div className="h-80 animate-pulse rounded-2xl bg-mist" /></Page>;
  if (!detail.data || !detail.data.ok) return <Page><p>Prodotto non trovato.</p></Page>;
  const { product, supplier, events, usedIn } = detail.data;
  return (
    <Page className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-2">
        <img src={product.immagine} alt={product.nome} className="aspect-[16/9] w-full rounded-2xl object-cover ring-1 ring-line" />
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">{product.categoria}</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight">{product.nome}</h1>
          <p className="mt-2 text-muted">
            {product.marca} · {product.origine_luogo}, {product.origine_regione}
          </p>
          <p className="mt-2 font-mono text-sm">Lotto {product.lotto}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {product.stato_certificazione === "certified" ? (
              <span className="rounded-full bg-safe/10 px-3 py-1 text-xs text-safe">Certificato</span>
            ) : (
              <span className="rounded-full bg-caution/10 px-3 py-1 text-xs text-caution">
                Prestare attenzione · non rintracciabile
              </span>
            )}
            {product.allergeni.map((a) => (
              <span key={a} className="rounded-full bg-danger/10 px-3 py-1 text-xs text-danger">
                {allergenLabel(a)}
              </span>
            ))}
            {product.tracce.map((a) => (
              <span key={a} className="rounded-full bg-caution/10 px-3 py-1 text-xs text-caution">
                tracce {allergenLabel(a)}
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm leading-relaxed text-muted">{product.scheda_tecnica}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-subtle">Zuccheri</dt>
              <dd>{product.zucchero_g} g</dd>
            </div>
            <div>
              <dt className="text-subtle">Sodio</dt>
              <dd>{product.sodio_mg} mg</dd>
            </div>
            <div>
              <dt className="text-subtle">Listeria</dt>
              <dd>{product.rischio_listeria ? "Rischio dichiarato" : "Processo validato"}</dd>
            </div>
            <div>
              <dt className="text-subtle">Toxo</dt>
              <dd>{product.rischio_toxo ? "Rischio dichiarato" : "Processo validato"}</dd>
            </div>
          </dl>
        </div>
      </div>
      {supplier ? (
        <section className="rounded-2xl bg-cream p-5 ring-1 ring-line">
          <h2 className="font-display text-2xl">Fornitore</h2>
          <p className="mt-2 font-medium">{supplier.nome}</p>
          <p className="text-sm text-muted">
            {supplier.tipo} · {supplier.regione}, {supplier.paese}
          </p>
          <p className="mt-2 text-sm">{supplier.certificazioni.join(" · ")}</p>
        </section>
      ) : null}
      <section>
        <h2 className="font-display text-2xl">Blockchain di filiera</h2>
        <div className="mt-6">
          <ChainView events={events} />
        </div>
      </section>
      {usedIn.length ? (
        <section>
          <h2 className="font-display text-2xl">Nei piatti</h2>
          <ul className="mt-4 space-y-2">
            {usedIn.map((d) => (
              <li key={d.id}>
                <Link to="/dish/$dishId" params={{ dishId: d.id }} search={{}} className="text-sage underline-offset-2 hover:underline">
                  {d.nome}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Page>
  );
}
