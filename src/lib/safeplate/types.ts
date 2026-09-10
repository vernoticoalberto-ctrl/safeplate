export const EU14 = [
  { id: "glutine", label: "Cereali con glutine", short: "Glutine" },
  { id: "crostacei", label: "Crostacei", short: "Crostacei" },
  { id: "uova", label: "Uova", short: "Uova" },
  { id: "pesce", label: "Pesce", short: "Pesce" },
  { id: "arachidi", label: "Arachidi", short: "Arachidi" },
  { id: "soia", label: "Soia", short: "Soia" },
  { id: "latte", label: "Latte e lattosio", short: "Latte" },
  { id: "frutta_guscio", label: "Frutta a guscio", short: "Guscio" },
  { id: "sedano", label: "Sedano", short: "Sedano" },
  { id: "senape", label: "Senape", short: "Senape" },
  { id: "sesamo", label: "Sesamo", short: "Sesamo" },
  { id: "solfiti", label: "Anidride solforosa e solfiti", short: "Solfiti" },
  { id: "lupini", label: "Lupini", short: "Lupini" },
  { id: "molluschi", label: "Molluschi", short: "Molluschi" },
] as const;

export type AllergenId = (typeof EU14)[number]["id"];

export type TrafficStatus = "safe" | "caution" | "unsafe";

export type Vectors = {
  farina_volatile: boolean;
  olio_frittura_condiviso: boolean;
  allergeni_olio: string[];
  superfici_condivise: boolean;
  allergeni_superfici: string[];
};

export type Supplier = {
  id: string;
  nome: string;
  paese: string;
  regione: string;
  tipo: string;
  certificazioni: string[];
  contatto: string | null;
  lat: number;
  lng: number;
  immagine: string;
};

export type Product = {
  id: string;
  nome: string;
  marca: string;
  fornitore_id: string;
  categoria: string;
  allergeni: string[];
  tracce: string[];
  zucchero_g: number;
  sodio_mg: number;
  rischio_listeria: boolean;
  rischio_toxo: boolean;
  lotto: string;
  origine_paese: string;
  origine_regione: string;
  origine_luogo: string;
  stato_certificazione: "certified" | "pending" | "unlisted";
  scheda_tecnica: string;
  immagine: string;
};

export type Restaurant = {
  id: string;
  nome: string;
  tipo: string;
  citta: string;
  paese: string;
  indirizzo: string;
  certificato: boolean;
  hash_certificazione: string;
  immagine: string;
  vettori: Vectors;
};

export type Dish = {
  id: string;
  ristorante_id: string;
  nome: string;
  descrizione: string;
  portata: string;
  prodotti: string[];
  allergeni_dichiarati: string[];
  tracce: string[];
  zucchero_g: number;
  sodio_mg: number;
  rischio_listeria: boolean;
  rischio_toxo: boolean;
  stato_certificazione: "certified" | "pending";
  immagine: string;
  prezzo_cent: number;
  vettori: Vectors;
};

export type ChainEvent = {
  id: string;
  prodotto_id: string;
  seq: number;
  tipo: string;
  attore: string;
  luogo: string;
  lat: number;
  lng: number;
  quando: string;
  lotto: string;
  note: string;
  prev_hash?: string;
  hash?: string;
};

export type Passport = {
  publicId: string;
  allergens: string[];
  pregnancy: boolean;
  diabetes: boolean;
  hypertension: boolean;
  sugarLimitG: number | null;
  sodiumLimitMg: number | null;
  demo?: boolean;
  label?: string;
};

export type MatchResult = {
  status: TrafficStatus;
  reasons: string[];
};

export type PublicMatch = {
  dishId: string;
  name: string;
  status: TrafficStatus;
  image: string;
  course: string;
  priceCents: number;
  certified: boolean;
};

export const STATUS_LABEL: Record<TrafficStatus, string> = {
  safe: "Certificato sicuro",
  caution: "Prestare attenzione",
  unsafe: "Non sicuro",
};

export const STATUS_HINT: Record<TrafficStatus, string> = {
  safe: "Dati validati. Nessun incrocio con il passaporto.",
  caution: "Tracce, vettori o filiera non rintracciabile. Verifica manuale.",
  unsafe: "Allergene, contaminazione o rischio processo. Non servire.",
};

export const RESTAURANT_KIND: Record<string, string> = {
  trattoria: "Trattoria",
  kiosk: "Totem / kiosk",
  airline: "Catering aereo",
  cruise: "Cucina di bordo",
  supermarket: "Grande distribuzione",
};

export function allergenLabel(id: string): string {
  return EU14.find((a) => a.id === id)?.label ?? id;
}
