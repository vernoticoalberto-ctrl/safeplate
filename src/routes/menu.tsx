import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Page } from "@/components/app-shell";
import { getBootstrap } from "@/lib/safeplate/server";
import { RESTAURANT_KIND } from "@/lib/safeplate/types";

export const Route = createFileRoute("/menu")({
  loader: () => getBootstrap(),
  component: MenuIndex,
});

function MenuIndex() {
  const loaded = Route.useLoaderData();
  const boot = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => getBootstrap(),
    initialData: loaded,
  });
  return (
    <Page>
      <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">Locali</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Menu filtrati</h1>
      <p className="mt-3 max-w-xl text-muted">
        Trattorie, totem, catering aereo, navi, supermercati. Stesso protocollo, stesso semaforo.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {(boot.data?.restaurants ?? []).map((r) => (
          <Link
            key={r.id}
            to="/menu/$restaurantId"
            params={{ restaurantId: r.id }}
            search={{}}
            className="group overflow-hidden rounded-2xl bg-cream ring-1 ring-line"
          >
            <img src={r.immagine} alt="" className="aspect-[16/9] w-full object-cover" />
            <div className="p-5">
              <p className="text-xs text-subtle">{RESTAURANT_KIND[r.tipo] ?? r.tipo}</p>
              <h2 className="mt-1 font-display text-2xl group-hover:underline">{r.nome}</h2>
              <p className="mt-1 text-sm text-muted">
                {r.citta}
                {r.certificato ? " · Certificato SafePlate" : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Page>
  );
}
