import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Page } from "@/components/app-shell";
import { TrafficBadge } from "@/components/traffic-light";
import { Button } from "@/components/ui/button";
import { getBootstrap, getRestaurantMenu } from "@/lib/safeplate/server";
import { parsePayload } from "@/lib/safeplate/engine";
import { RESTAURANT_KIND } from "@/lib/safeplate/types";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/kiosk")({
  validateSearch: (s: Record<string, unknown>): { pid?: string; r?: string } => {
    const out: { pid?: string; r?: string } = {};
    if (typeof s.pid === "string") out.pid = s.pid;
    if (typeof s.r === "string") out.r = s.r;
    return out;
  },
  loaderDeps: ({ search }) => ({ pid: search.pid, r: search.r }),
  loader: async ({ deps }) => {
    const rid = deps.r ?? "rst-mcsafe-termini";
    const pid = deps.pid ?? "";
    const boot = await getBootstrap();
    const menu = pid
      ? await getRestaurantMenu({ data: { restaurantId: rid, passportId: pid, kiosk: true } })
      : null;
    return { boot, menu, rid, pid };
  },
  component: KioskPage,
});

function KioskPage() {
  const search = Route.useSearch();
  const loaded = Route.useLoaderData();
  const [rid, setRid] = useState(search.r ?? loaded.rid);
  const [raw, setRaw] = useState(search.pid ?? loaded.pid);
  const [pid, setPid] = useState(search.pid ?? loaded.pid);

  useEffect(() => {
    if (search.pid) {
      setRaw(search.pid);
      setPid(search.pid);
    }
  }, [search.pid]);

  const boot = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => getBootstrap(),
    initialData: loaded.boot,
  });
  const menu = useQuery({
    queryKey: ["kiosk", rid, pid],
    enabled: Boolean(pid),
    queryFn: () => getRestaurantMenu({ data: { restaurantId: rid, passportId: pid, kiosk: true } }),
    initialData: rid === loaded.rid && pid === loaded.pid ? loaded.menu ?? undefined : undefined,
  });

  const items = menu.data && menu.data.ok ? menu.data.items : [];
  const safeCount = items.filter((i) => i.status === "safe").length;

  return (
    <Page>
      <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">Totem / kiosk</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Scansione silenziosa</h1>
      <p className="mt-3 max-w-xl text-muted">
        Il personale non vede allergie, gravidanza o patologie. Solo il semaforo. Prova con un ID
        dimostrativo o incolla un payload QR.
      </p>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <label className="text-sm">
          Locale
          <select
            className="mt-1 h-11 w-full rounded-lg border border-line bg-cream px-3"
            value={rid}
            onChange={(e) => setRid(e.target.value)}
          >
            {(boot.data?.restaurants ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome} · {RESTAURANT_KIND[r.tipo]}
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
              onChange={(e) => setRaw(e.target.value)}
              placeholder="SP-DEMO-CELIA"
            />
            <Button
              type="button"
              onClick={() => setPid(parsePayload(raw) ?? raw.trim())}
            >
              Incrocia
            </Button>
          </div>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(boot.data?.demoPassports ?? []).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setRaw(p.id);
              setPid(p.id);
            }}
            className="h-10 rounded-full bg-mist px-3 text-xs hover:bg-line"
          >
            {p.etichetta.replace("Demo · ", "")}
          </button>
        ))}
      </div>

      {pid && menu.data && menu.data.ok ? (
        <div className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">{menu.data.restaurant.nome}</h2>
              <p className="text-sm text-muted">
                ID {pid} · {safeCount} piatti sicuri su {items.length}
              </p>
            </div>
            {!menu.data.passportFound ? (
              <p className="text-sm text-caution">Passaporto non trovato. Verifica l’ID.</p>
            ) : null}
          </div>
          <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl bg-cream ring-1 ring-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 p-4">
                <img src={item.immagine} alt="" className="size-16 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.nome}</p>
                  <p className="text-sm text-muted">{formatPrice(item.prezzo_cent)}</p>
                </div>
                {item.status ? <TrafficBadge status={item.status} /> : null}
                <Link
                  to="/dish/$dishId"
                  params={{ dishId: item.id }}
                  search={{ pid }}
                  className="hidden text-sm text-sage sm:inline"
                >
                  Dettaglio
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-subtle">
            Vista totem: i motivi sanitari sono omessi di proposito. GDPR by design.
          </p>
        </div>
      ) : null}
    </Page>
  );
}
