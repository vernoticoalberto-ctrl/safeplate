export const VISTAS = [
  { id: "wallet", label: "Wallet", match: "/wallet" },
  { id: "menu", label: "Menu", match: "/menu" },
  { id: "totem", label: "Totem", match: "/kiosk" },
  { id: "filiera", label: "Filiera", match: "/filiera" },
  { id: "catalogo", label: "Catalogo", match: "/catalog" },
  { id: "segnala", label: "Segnala", match: "/report" },
  { id: "manleva", label: "Manleva", match: "/certify" },
  { id: "manuale", label: "Manuale", match: "/manuale" },
] as const;

export type VistaId = (typeof VISTAS)[number]["id"];

export function parseVista(value: unknown): VistaId {
  const hit = VISTAS.find((v) => v.id === value);
  return hit?.id ?? "wallet";
}
