import { QrMark } from "@/components/qr-mark";

export function PassCard({
  publicId,
  payload,
  name,
}: {
  publicId: string;
  payload: string;
  name?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-pass p-5 text-pass-fg shadow-[var(--shadow-soft)] sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-sage/20" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.28em] text-pass-fg/60 uppercase">
            SafePlate ID
          </p>
          <p className="mt-2 font-display text-2xl font-medium tracking-tight">Food-Health Passport</p>
          {name ? <p className="mt-1 text-sm text-pass-fg/70">{name}</p> : null}
        </div>
        <span className="rounded-full bg-pass-fg/10 px-2.5 py-1 text-[10px] tracking-widest uppercase">
          GDPR
        </span>
      </div>
      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-sm tracking-wider">{publicId}</p>
          <p className="mt-2 max-w-[18ch] text-xs leading-relaxed text-pass-fg/55">
            Il QR non contiene dati sanitari. Solo l’identificativo pubblico.
          </p>
        </div>
        <div className="size-28 shrink-0 rounded-lg bg-pass p-1 ring-1 ring-pass-fg/15 sm:size-32">
          <QrMark value={payload} inverted className="size-full" />
        </div>
      </div>
    </div>
  );
}
