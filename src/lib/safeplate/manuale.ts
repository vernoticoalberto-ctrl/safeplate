import manualeJson from "../../../protocol/dati/manuale.json";

export type ManualAction = {
  to: string;
  label: string;
};

export type ManualStep = {
  n: number;
  titolo: string;
  testo: string;
  azione?: ManualAction;
};

export type ManualChapter = {
  id: string;
  ruolo: string;
  titolo: string;
  sommario: string;
  passi: ManualStep[];
  note: string[];
};

export type ManualSemaforo = {
  stato: "safe" | "caution" | "unsafe";
  etichetta: string;
  testo: string;
};

export type ManualDemoId = {
  id: string;
  etichetta: string;
  uso: string;
};

export type ManualFaq = {
  q: string;
  a: string;
};

export type ManualChange = {
  file: string;
  modifica: string;
};

export type ManualCloudField = {
  campo: string;
  valore: string;
};

export type ManualCloud = {
  titolo: string;
  sottotitolo: string;
  nota: string;
  url_github: string;
  url_share: string;
  campi: ManualCloudField[];
};

export type Manuale = {
  id: string;
  versione: string;
  protocollo: string;
  lingua: string;
  titolo: string;
  kicker: string;
  sottotitolo: string;
  intro: string;
  avvertenza: string;
  semaforo: ManualSemaforo[];
  identita_demo: ManualDemoId[];
  capitoli: ManualChapter[];
  faq: ManualFaq[];
  cloud: ManualCloud;
  pacchetto: {
    file_python: string;
    file_json: string;
    modifiche: ManualChange[];
  };
};

export const manuale = manualeJson as Manuale;

export const MANUAL_PATHS = [
  "/",
  "/wallet",
  "/kiosk",
  "/menu",
  "/catalog",
  "/certify",
  "/report",
  "/filiera",
  "/protocol",
  "/manuale",
] as const;

export type ManualPath = (typeof MANUAL_PATHS)[number];

export function isManualPath(value: string): value is ManualPath {
  return (MANUAL_PATHS as readonly string[]).includes(value);
}
