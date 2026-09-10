import { encode } from "uqr";
import { cn } from "@/lib/utils";

export function QrMark({
  value,
  inverted,
  className,
  label = "QR SafePlate",
}: {
  value: string;
  inverted?: boolean;
  className?: string;
  label?: string;
}) {
  const qr = encode(value, { ecc: "M", border: 2 });
  const fg = inverted ? "#e7eee8" : "#15201b";
  const bg = inverted ? "#1a2e28" : "#faf7f2";
  const cells: Array<{ x: number; y: number }> = [];
  qr.data.forEach((row, y) => {
    row.forEach((on, x) => {
      if (on) cells.push({ x, y });
    });
  });
  return (
    <svg
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      className={cn("rounded-md", className)}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={qr.size} height={qr.size} fill={bg} />
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1} height={1} fill={fg} />
      ))}
    </svg>
  );
}
