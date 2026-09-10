import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Page } from "@/components/app-shell";
import { TrafficBadge } from "@/components/traffic-light";
import { getBootstrap, getRestaurantMenu } from "@/lib/safeplate/server";
import { RESTAURANT_KIND } from "@/lib/safeplate/types";
import { formatPrice } from "@/lib/utils";
import { readPid, writePid } from "@/lib/safeplate/session-pid";

export const Route = createFileRoute("/menu/$restaurantId")({
  validateSearch: (s: Record<string, unknown>): { pid?: string } =>
    typeof s.pid === "string" ? { pid: s.pid } : {},
  loaderDeps: ({ search }) => ({ pid: search.pid }),
  loader: async ({ params, deps }) => {
    const passportId = deps.pid ?? "SP-DEMO-CELIA";
    const [boot, menu] = await Promise.all([
      getBootstrap(),
      getRestaurantMenu({ data: { restaurantId: params.restaurantId, passportId } }),
    ]);
    return { boot, menu, passportId, restaurantId: params.restaurantId };
  },
  component: RestaurantMenu,
});

function RestaurantMenu() {
  const { restaurantId } = Route.useParams();
  const search = Route.useSearch();
  const loaded = Route.useLoaderData();
  const [pid, setPid] = useState(search.pid ?? loaded.passportId);
  const [onlySafe, setOnlySafe] = useState(false);
  useEffect(() => {
    setPid(search.pid || readPid());
  }, [search.pid]);

  const boot = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => getBootstrap(),
    initialData: loaded.boot,
  });
  const menu = useQuery({
    queryKey: ["menu", restaurantId, pid],
    queryFn: () => getRestaurantMenu({ data: { restaurantId, passportId: pid } }),
    initialData:
      restaurantId === loaded.restaurantId && pid === loaded.passportId ? loaded.menu : undefined,
  });

  const items =
    menu.data && menu.data.ok
      ? onlySafe
        ? menu.data.items.filter((i) => i.status === "safe")
        : menu.data.items
      : [];

  return (
    <Page>
      {menu.data && menu.data.ok ? (
        <>
          <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">
            {RESTAURANT_KIND[menu.data.restaurant.tipo]}
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-tight">{menu.data.restaurant.nome}</h1>
          <p className="mt-2 text-muted">
            {menu.data.restaurant.indirizzo} · {menu.data.restaurant.citta}
          </p>
        </>
      ) : (
        <div className="h-20 animate-pulse rounded-xl bg-mist" />
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm">
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
        <label className="flex h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-sage"
            checked={onlySafe}
            onChange={(e) => setOnlySafe(e.target.checked)}
          />
          Solo certificati sicuri
        </label>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
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
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-medium">{item.nome}</h2>
                {item.status ? <TrafficBadge status={item.status} /> : null}
              </div>
              <p className="line-clamp-2 text-sm text-muted">{item.descrizione}</p>
              <p className="text-sm">{formatPrice(item.prezzo_cent)}</p>
              {item.reasons[0] ? <p className="text-xs text-muted">{item.reasons[0]}</p> : null}
            </div>
          </Link>
        ))}
      </div>
    </Page>
  );
}
