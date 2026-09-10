import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Page } from "@/components/app-shell";
import { ChainView } from "@/components/chain-view";
import { TrafficBadge, TrafficLegend } from "@/components/traffic-light";
import { getBootstrap, getDishDetail } from "@/lib/safeplate/server";
import { allergenLabel } from "@/lib/safeplate/types";
import { formatPrice } from "@/lib/utils";
import { readPid, writePid } from "@/lib/safeplate/session-pid";

export const Route = createFileRoute("/dish/$dishId")({
  validateSearch: (s: Record<string, unknown>): { pid?: string } =>
    typeof s.pid === "string" ? { pid: s.pid } : {},
  loaderDeps: ({ search }) => ({ pid: search.pid }),
  loader: async ({ params, deps }) => {
    const passportId = deps.pid ?? "SP-DEMO-CELIA";
    const [boot, detail] = await Promise.all([
      getBootstrap(),
      getDishDetail({ data: { dishId: params.dishId, passportId } }),
    ]);
    return { boot, detail, passportId, dishId: params.dishId };
  },
  component: DishPage,
});

function DishPage() {
  const { dishId } = Route.useParams();
  const search = Route.useSearch();
  const loaded = Route.useLoaderData();
  const [pid, setPid] = useState(search.pid ?? loaded.passportId);
  useEffect(() => {
    setPid(search.pid || readPid());
  }, [search.pid]);

  const boot = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => getBootstrap(),
    initialData: loaded.boot,
  });
  const detail = useQuery({
    queryKey: ["dish", dishId, pid],
    queryFn: () => getDishDetail({ data: { dishId, passportId: pid } }),
    initialData: dishId === loaded.dishId && pid === loaded.passportId ? loaded.detail : undefined,
  });

  if (detail.isPending) return <Page><div className="h-80 animate-pulse rounded-2xl bg-mist" /></Page>;
  if (!detail.data || !detail.data.ok) {
    return (
      <Page>
        <p>Piatto non trovato.</p>
      </Page>
    );
  }
  const { dish, restaurant, components, match, events } = detail.data;

  return (
    <Page className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <img src={dish.immagine} alt={dish.nome} className="aspect-[4/3] w-full rounded-2xl object-cover ring-1 ring-line" />
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">{dish.portata}</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight">{dish.nome}</h1>
          {restaurant ? (
            <Link
              to="/menu/$restaurantId"
              params={{ restaurantId: restaurant.id }}
              search={{ pid }}
              className="mt-2 inline-block text-sm text-sage underline-offset-2 hover:underline"
            >
              {restaurant.nome}
            </Link>
          ) : null}
          <p className="mt-4 text-muted">{dish.descrizione}</p>
          <p className="mt-3 text-sm">{formatPrice(dish.prezzo_cent)}</p>
          <label className="mt-6 block text-sm">
            Passaporto
            <select
              className="mt-1 h-11 w-full rounded-lg border border-line bg-cream px-3"
              value={pid}
              onChange={(e) => {
                writePid(e.target.value);
                setPid(e.target.value);
              }}
            >
              {(boot.data?.demoPassports ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.etichetta}
                </option>
              ))}
            </select>
          </label>
          {match ? (
            <div className="mt-5 space-y-3">
              <TrafficBadge status={match.status} />
              {match.reasons.length ? (
                <ul className="space-y-1 text-sm text-muted">
                  {match.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Incrocio eseguito. Motivi visibili solo al titolare del passaporto.</p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <section>
        <h2 className="font-display text-2xl">Componenti e allergeni</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {dish.allergeni_dichiarati.length ? (
            dish.allergeni_dichiarati.map((id) => (
              <span key={id} className="rounded-full bg-danger/10 px-3 py-1 text-xs text-danger">
                {allergenLabel(id)}
              </span>
            ))
          ) : (
            <span className="text-sm text-muted">Nessun allergene dichiarato sul piatto.</span>
          )}
          {dish.tracce.map((id) => (
            <span key={id} className="rounded-full bg-caution/10 px-3 py-1 text-xs text-caution">
              tracce di {allergenLabel(id)}
            </span>
          ))}
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {components.map((p) => (
            <li key={p.id}>
              <Link
                to="/product/$productId"
                params={{ productId: p.id }}
                className="flex gap-3 rounded-xl bg-cream p-3 ring-1 ring-line"
              >
                <img src={p.immagine} alt="" className="size-16 rounded-md object-cover" />
                <div>
                  <p className="font-medium">{p.nome}</p>
                  <p className="text-xs text-muted">
                    {p.marca} · {p.stato_certificazione === "certified" ? "certificato" : "non rintracciabile"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-2xl">Filiera</h2>
        <p className="mt-2 text-sm text-muted">Ogni blocco è concatenato. Una nota alterata spezza l’hash.</p>
        <div className="mt-6">
          <ChainView events={events} productHref />
        </div>
      </section>

      <TrafficLegend />
    </Page>
  );
}
