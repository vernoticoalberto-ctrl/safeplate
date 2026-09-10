import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type ChainItem = {
  id: string;
  prodotto_id: string;
  seq: number;
  tipo: string;
  attore: string;
  luogo: string;
  quando: string;
  lotto: string;
  note: string;
  prev_hash?: string;
  hash?: string;
};

function shortHash(value?: string) {
  if (!value) return "—";
  return value.slice(0, 10) + "…" + value.slice(-4);
}

export function ChainView({
  events,
  productHref,
}: {
  events: ChainItem[];
  productHref?: boolean;
}) {
  if (!events.length) {
    return (
      <p className="rounded-xl bg-caution/10 px-4 py-3 text-sm text-caution">
        Filiera incompleta. Prestare attenzione: il prodotto non è rintracciabile.
      </p>
    );
  }
  return (
    <ol className="relative space-y-0">
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-4 pb-8 last:pb-0">
          <div className="flex w-8 flex-col items-center">
            <span className="grid size-8 place-items-center rounded-full bg-ink font-mono text-xs text-paper">
              {event.seq}
            </span>
            {index < events.length - 1 ? (
              <span className="mt-1 w-px flex-1 bg-line" />
            ) : null}
          </div>
          <div className={cn("min-w-0 flex-1 rounded-xl bg-cream p-4 ring-1 ring-line")}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium capitalize">{event.tipo}</p>
              <time className="font-mono text-[11px] text-subtle">
                {new Date(event.quando).toLocaleString("it-IT")}
              </time>
            </div>
            <p className="mt-1 text-sm text-ink">{event.attore}</p>
            <p className="text-sm text-muted">{event.luogo}</p>
            <p className="mt-2 text-sm text-muted">{event.note}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-subtle">
              <span>lotto {event.lotto || "—"}</span>
              <span>hash {shortHash(event.hash)}</span>
              {productHref ? (
                <Link
                  to="/product/$productId"
                  params={{ productId: event.prodotto_id }}
                  className="text-sage underline-offset-2 hover:underline"
                >
                  {event.prodotto_id}
                </Link>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
