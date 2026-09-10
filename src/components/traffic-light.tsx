import { cn } from "@/lib/utils";
import { STATUS_HINT, STATUS_LABEL, type TrafficStatus } from "@/lib/safeplate/types";

const DOT: Record<TrafficStatus, string> = {
  safe: "bg-safe",
  caution: "bg-caution",
  unsafe: "bg-danger",
};

const TINT: Record<TrafficStatus, string> = {
  safe: "bg-safe/10 text-safe",
  caution: "bg-caution/10 text-caution",
  unsafe: "bg-danger/10 text-danger",
};

export function TrafficDot({ status, className }: { status: TrafficStatus; className?: string }) {
  return (
    <span
      className={cn("inline-block size-2.5 rounded-full", DOT[status], className)}
      aria-hidden
    />
  );
}

export function TrafficBadge({
  status,
  compact,
}: {
  status: TrafficStatus;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
        TINT[status],
      )}
    >
      <TrafficDot status={status} />
      {compact ? STATUS_LABEL[status] : STATUS_LABEL[status]}
    </span>
  );
}

export function TrafficLegend() {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {(["safe", "caution", "unsafe"] as TrafficStatus[]).map((status) => (
        <li key={status} className="rounded-xl bg-cream p-4 ring-1 ring-line">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrafficDot status={status} />
            {STATUS_LABEL[status]}
          </div>
          <p className="mt-2 text-sm text-muted">{STATUS_HINT[status]}</p>
        </li>
      ))}
    </ul>
  );
}
