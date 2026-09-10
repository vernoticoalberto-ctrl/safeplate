import {
  allergenLabel,
  type ChainEvent,
  type Dish,
  type MatchResult,
  type Passport,
  type Product,
  type Restaurant,
  type TrafficStatus,
  type Vectors,
} from "./types";

const RANK: Record<TrafficStatus, number> = { safe: 0, caution: 1, unsafe: 2 };
export const GENESIS = "0".repeat(64);

export function worse(a: TrafficStatus, b: TrafficStatus): TrafficStatus {
  return RANK[a] >= RANK[b] ? a : b;
}

export function mergeVectors(
  restaurant: Vectors | null | undefined,
  dish: Vectors | null | undefined,
): Vectors {
  const r = restaurant ?? emptyVectors();
  const d = dish ?? emptyVectors();
  const farina = Boolean(r.farina_volatile || d.farina_volatile);
  const superfici = Boolean(r.superfici_condivise || d.superfici_condivise);
  const surfaces = unique([
    ...(r.allergeni_superfici ?? []),
    ...(d.allergeni_superfici ?? []),
  ]);
  let olio: boolean;
  let oil: string[];
  if (dish && "olio_frittura_condiviso" in dish) {
    olio = Boolean(d.olio_frittura_condiviso);
    oil = d.allergeni_olio ?? [];
    if (olio && oil.length === 0) oil = r.allergeni_olio ?? [];
  } else {
    olio = Boolean(r.olio_frittura_condiviso);
    oil = r.allergeni_olio ?? [];
  }
  return {
    farina_volatile: farina,
    olio_frittura_condiviso: olio,
    allergeni_olio: unique(oil),
    superfici_condivise: superfici,
    allergeni_superfici: surfaces,
  };
}

export function emptyVectors(): Vectors {
  return {
    farina_volatile: false,
    olio_frittura_condiviso: false,
    allergeni_olio: [],
    superfici_condivise: false,
    allergeni_superfici: [],
  };
}

function unique(items: string[]): string[] {
  return [...new Set(items)].sort();
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function evaluateDish(
  dish: Dish,
  restaurant: Restaurant | null,
  productsById: Record<string, Product>,
  profile: Passport,
): MatchResult {
  let status: TrafficStatus = "safe";
  const reasons: string[] = [];
  const user = new Set(profile.allergens ?? []);

  const bump = (next: TrafficStatus, reason: string) => {
    status = worse(status, next);
    if (!reasons.includes(reason)) reasons.push(reason);
  };

  const declared = new Set(dish.allergeni_dichiarati ?? []);
  const traces = new Set(dish.tracce ?? []);
  const hit = [...declared].filter((id) => user.has(id)).sort();
  if (hit.length) bump("unsafe", "Contiene " + hit.map(allergenLabel).join(", "));
  const traceHit = [...traces].filter((id) => user.has(id)).sort();
  if (traceHit.length) {
    bump("caution", "Può contenere tracce di " + traceHit.map(allergenLabel).join(", "));
  }
  if ((dish.stato_certificazione || "pending") !== "certified") {
    bump("caution", "Piatto non ancora certificato SafePlate (filiera o ricetta incompleta)");
  }

  for (const productId of dish.prodotti ?? []) {
    const product = productsById[productId];
    if (!product) {
      bump("caution", `Ingrediente ${productId} non catalogato`);
      continue;
    }
    const name = product.nome || productId;
    if ((product.stato_certificazione || "pending") !== "certified") {
      bump("caution", `${name}: scheda tecnica non certificata / non rintracciabile`);
    }
    const phit = (product.allergeni ?? []).filter((id) => user.has(id)).sort();
    if (phit.length) bump("unsafe", `${name} contiene ` + phit.map(allergenLabel).join(", "));
    const ptraces = (product.tracce ?? []).filter((id) => user.has(id)).sort();
    if (ptraces.length) {
      bump("caution", `${name} può contenere tracce di ` + ptraces.map(allergenLabel).join(", "));
    }
    if (profile.pregnancy && product.rischio_listeria) {
      bump("unsafe", `${name}: rischio listeria (SafePlate Pregnancy)`);
    }
    if (profile.pregnancy && product.rischio_toxo) {
      bump("unsafe", `${name}: rischio toxoplasmosi (SafePlate Pregnancy)`);
    }
    const sugar = num(product.zucchero_g);
    const sodium = num(product.sodio_mg);
    if (
      profile.diabetes &&
      profile.sugarLimitG != null &&
      sugar != null &&
      sugar > profile.sugarLimitG
    ) {
      bump("caution", `${name}: zuccheri ${sugar} g sopra la soglia ${profile.sugarLimitG} g`);
    }
    if (
      profile.hypertension &&
      profile.sodiumLimitMg != null &&
      sodium != null &&
      sodium > profile.sodiumLimitMg
    ) {
      bump("caution", `${name}: sodio ${sodium} mg sopra la soglia ${profile.sodiumLimitMg} mg`);
    }
  }

  if (profile.pregnancy && dish.rischio_listeria) {
    bump("unsafe", "Piatto a rischio listeria (processo non pastorizzato / crudo)");
  }
  if (profile.pregnancy && dish.rischio_toxo) {
    bump("unsafe", "Piatto a rischio toxoplasmosi (crudo o non validato)");
  }
  const dishSugar = num(dish.zucchero_g);
  const dishSodium = num(dish.sodio_mg);
  if (
    profile.diabetes &&
    profile.sugarLimitG != null &&
    dishSugar != null &&
    dishSugar > profile.sugarLimitG
  ) {
    bump("caution", `Zuccheri del piatto ${dishSugar} g sopra la soglia`);
  }
  if (
    profile.hypertension &&
    profile.sodiumLimitMg != null &&
    dishSodium != null &&
    dishSodium > profile.sodiumLimitMg
  ) {
    bump("caution", `Sodio del piatto ${dishSodium} mg sopra la soglia`);
  }

  const vectors = mergeVectors(restaurant?.vettori, dish.vettori);
  if (vectors.farina_volatile && user.has("glutine")) {
    bump("caution", "Farina volatile in cucina: possibile contaminazione da glutine");
  }
  if (vectors.olio_frittura_condiviso) {
    const oilHit = vectors.allergeni_olio.filter((id) => user.has(id)).sort();
    if (oilHit.length) {
      bump("unsafe", "Olio di frittura condiviso con " + oilHit.map(allergenLabel).join(", "));
    }
  }
  if (vectors.superfici_condivise) {
    const surfaceHit = vectors.allergeni_superfici.filter((id) => user.has(id)).sort();
    if (surfaceHit.length) {
      bump("caution", "Superfici condivise con " + surfaceHit.map(allergenLabel).join(", "));
    }
  }

  return { status, reasons };
}

export function publicMatch(result: MatchResult): { status: TrafficStatus } {
  return { status: result.status };
}

function canonical(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, Object.keys(payload).sort());
}

export async function sha256Hex(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function eventHash(event: ChainEvent, prevHash: string): Promise<string> {
  const body = {
    attore: event.attore,
    lotto: event.lotto || "",
    luogo: event.luogo,
    note: event.note || "",
    prev_hash: prevHash,
    prodotto_id: event.prodotto_id,
    quando: event.quando,
    seq: event.seq,
    tipo: event.tipo,
  };
  return sha256Hex(canonical(body));
}

export async function sealChain(events: ChainEvent[]): Promise<ChainEvent[]> {
  const ordered = [...events].sort((a, b) => a.seq - b.seq);
  let prev = GENESIS;
  const sealed: ChainEvent[] = [];
  for (const raw of ordered) {
    const event = { ...raw, prev_hash: prev };
    const hash = await eventHash(event, prev);
    event.hash = hash;
    prev = hash;
    sealed.push(event);
  }
  return sealed;
}

export async function verifyChain(events: ChainEvent[]): Promise<{
  ok: boolean;
  length: number;
  tip: string;
  errors: string[];
}> {
  if (!events.length) return { ok: true, length: 0, tip: GENESIS, errors: [] };
  const ordered = [...events].sort((a, b) => a.seq - b.seq);
  const errors: string[] = [];
  let prev = GENESIS;
  for (let i = 0; i < ordered.length; i += 1) {
    const event = ordered[i];
    if (event.seq !== i + 1) errors.push(`seq gap at ${event.id}`);
    if (event.prev_hash !== prev) errors.push(`broken link at ${event.id}`);
    const recomputed = await eventHash(event, prev);
    if (event.hash !== recomputed) errors.push(`hash mismatch at ${event.id}`);
    prev = event.hash || recomputed;
  }
  return { ok: errors.length === 0, length: ordered.length, tip: prev, errors };
}

export function encodePayload(publicId: string, origin?: string): string {
  const id = publicId.trim();
  if (origin) return `${origin.replace(/\/$/, "")}/kiosk?pid=${id}`;
  return `SAFEPLATE:v1:${id}`;
}

export function parsePayload(raw: string): string | null {
  const text = raw.trim();
  try {
    const url = new URL(text);
    const pid = url.searchParams.get("pid");
    if (pid) return pid;
  } catch {
    /* not a url */
  }
  const parts = text.split(":");
  if (parts.length === 3 && parts[0] === "SAFEPLATE" && parts[1] === "v1") return parts[2];
  if (text.startsWith("SP-")) return text;
  return null;
}

export function newPublicId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "SP-";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

