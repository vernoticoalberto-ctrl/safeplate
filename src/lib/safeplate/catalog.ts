import fornitoriJson from "../../../protocol/dati/fornitori.json";
import prodottiJson from "../../../protocol/dati/prodotti.json";
import ristorantiJson from "../../../protocol/dati/ristoranti.json";
import piattiJson from "../../../protocol/dati/piatti.json";
import filieraJson from "../../../protocol/dati/filiera.json";
import utentiJson from "../../../protocol/dati/utenti.json";
import type {
  ChainEvent,
  Dish,
  Passport,
  Product,
  Restaurant,
  Supplier,
} from "./types";

export const suppliers = fornitoriJson as Supplier[];
export const products = prodottiJson as Product[];
export const restaurants = ristorantiJson as Restaurant[];
export const dishes = piattiJson as Dish[];
export const chainEvents = filieraJson as ChainEvent[];

export type DemoPassportRecord = {
  id: string;
  etichetta: string;
  allergeni: string[];
  gravidanza: boolean;
  diabete: boolean;
  ipertensione: boolean;
  limite_zucchero_g: number | null;
  limite_sodio_mg: number | null;
  note: string;
};

export const demoPassports = utentiJson as DemoPassportRecord[];

export function demoToPassport(record: DemoPassportRecord): Passport {
  return {
    publicId: record.id,
    allergens: record.allergeni,
    pregnancy: record.gravidanza,
    diabetes: record.diabete,
    hypertension: record.ipertensione,
    sugarLimitG: record.limite_zucchero_g,
    sodiumLimitMg: record.limite_sodio_mg,
    demo: true,
    label: record.etichetta,
  };
}

export const productsById: Record<string, Product> = Object.fromEntries(
  products.map((p) => [p.id, p]),
);
export const restaurantsById: Record<string, Restaurant> = Object.fromEntries(
  restaurants.map((r) => [r.id, r]),
);
export const dishesById: Record<string, Dish> = Object.fromEntries(dishes.map((d) => [d.id, d]));
export const suppliersById: Record<string, Supplier> = Object.fromEntries(
  suppliers.map((s) => [s.id, s]),
);
