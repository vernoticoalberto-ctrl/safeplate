import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  chainEvents,
  demoPassports,
  demoToPassport,
  dishes,
  products,
  productsById,
  restaurants,
  restaurantsById,
  suppliers,
} from "./catalog";
import { DECLARATION } from "./constants";
import { encodePayload, evaluateDish, newPublicId } from "./engine";
import type { Passport, TrafficStatus } from "./types";

const globalSeed = globalThis as typeof globalThis & {
  __safeplateSeed__?: Promise<void>;
};

async function seedCatalog() {
  const sql = await getSql();
  const existing = await sql<{ id: string }>`select id from seed_meta where id = 'v1'`;
  if (existing.length) return;
  try {
    await sql`insert into seed_meta (id) values ('v1')`;
  } catch {
    return;
  }

  for (const s of suppliers) {
    await sql`insert into suppliers (id, nome, paese, regione, tipo, certificazioni, contatto, lat, lng, immagine)
      values (${s.id}, ${s.nome}, ${s.paese}, ${s.regione}, ${s.tipo}, ${JSON.stringify(s.certificazioni)}, ${s.contatto}, ${s.lat}, ${s.lng}, ${s.immagine})
      on conflict (id) do nothing`;
  }
  for (const p of products) {
    await sql`insert into products (id, nome, marca, fornitore_id, categoria, allergeni, tracce, zucchero_g, sodio_mg, rischio_listeria, rischio_toxo, lotto, origine_paese, origine_regione, origine_luogo, stato_certificazione, scheda_tecnica, immagine)
      values (${p.id}, ${p.nome}, ${p.marca}, ${p.fornitore_id}, ${p.categoria}, ${JSON.stringify(p.allergeni)}, ${JSON.stringify(p.tracce)}, ${p.zucchero_g}, ${p.sodio_mg}, ${p.rischio_listeria}, ${p.rischio_toxo}, ${p.lotto}, ${p.origine_paese}, ${p.origine_regione}, ${p.origine_luogo}, ${p.stato_certificazione}, ${p.scheda_tecnica}, ${p.immagine})
      on conflict (id) do nothing`;
  }
  const sealed = (await import("./chain-hash")).sealChainNode(chainEvents);
  for (const e of sealed) {
    await sql`insert into chain_events (id, prodotto_id, seq, tipo, attore, luogo, lat, lng, occurred_at, lotto, note, prev_hash, hash)
      values (${e.id}, ${e.prodotto_id}, ${e.seq}, ${e.tipo}, ${e.attore}, ${e.luogo}, ${e.lat}, ${e.lng}, ${e.quando}, ${e.lotto}, ${e.note}, ${e.prev_hash ?? ""}, ${e.hash ?? ""})
      on conflict (id) do nothing`;
  }
  for (const r of restaurants) {
    await sql`insert into restaurants (id, nome, tipo, citta, paese, indirizzo, certificato, hash_certificazione, immagine, vettori)
      values (${r.id}, ${r.nome}, ${r.tipo}, ${r.citta}, ${r.paese}, ${r.indirizzo}, ${r.certificato}, ${r.hash_certificazione}, ${r.immagine}, ${JSON.stringify(r.vettori)})
      on conflict (id) do nothing`;
  }
  for (const d of dishes) {
    await sql`insert into dishes (id, restaurant_id, nome, descrizione, portata, product_ids, allergeni_dichiarati, tracce, zucchero_g, sodio_mg, rischio_listeria, rischio_toxo, stato_certificazione, immagine, prezzo_cent, vettori)
      values (${d.id}, ${d.ristorante_id}, ${d.nome}, ${d.descrizione}, ${d.portata}, ${JSON.stringify(d.prodotti)}, ${JSON.stringify(d.allergeni_dichiarati)}, ${JSON.stringify(d.tracce)}, ${d.zucchero_g}, ${d.sodio_mg}, ${d.rischio_listeria}, ${d.rischio_toxo}, ${d.stato_certificazione}, ${d.immagine}, ${d.prezzo_cent}, ${JSON.stringify(d.vettori)})
      on conflict (id) do nothing`;
  }
  for (const u of demoPassports) {
    await sql`insert into demo_passports (id, etichetta, allergeni, gravidanza, diabete, ipertensione, limite_zucchero_g, limite_sodio_mg, note)
      values (${u.id}, ${u.etichetta}, ${JSON.stringify(u.allergeni)}, ${u.gravidanza}, ${u.diabete}, ${u.ipertensione}, ${u.limite_zucchero_g}, ${u.limite_sodio_mg}, ${u.note})
      on conflict (id) do nothing`;
  }
}

export async function ensureSeeded() {
  globalSeed.__safeplateSeed__ ??= seedCatalog().catch((err) => {
    globalSeed.__safeplateSeed__ = undefined;
    throw err;
  });
  return globalSeed.__safeplateSeed__;
}

function findPassport(publicId: string): Passport | null {
  const demo = demoPassports.find((p) => p.id === publicId);
  if (demo) return demoToPassport(demo);
  return null;
}

type PassportRow = {
  public_id: string;
  allergeni: string;
  gravidanza: boolean;
  diabete: boolean;
  ipertensione: boolean;
  limite_zucchero_g: string | number | null;
  limite_sodio_mg: string | number | null;
};

function rowToPassport(row: PassportRow): Passport {
  let allergens: string[] = [];
  try {
    allergens = JSON.parse(row.allergeni) as string[];
  } catch {
    allergens = [];
  }
  return {
    publicId: row.public_id,
    allergens,
    pregnancy: Boolean(row.gravidanza),
    diabetes: Boolean(row.diabete),
    hypertension: Boolean(row.ipertensione),
    sugarLimitG: row.limite_zucchero_g == null ? null : Number(row.limite_zucchero_g),
    sodiumLimitMg: row.limite_sodio_mg == null ? null : Number(row.limite_sodio_mg),
  };
}

async function resolvePassport(
  publicId: string,
  userId?: string,
): Promise<{ profile: Passport; reveal: boolean } | null> {
  const demo = findPassport(publicId);
  if (demo) return { profile: demo, reveal: true };
  const sql = await getSql();
  const rows = await sql<
    PassportRow & { user_id: string }
  >`select user_id, public_id, allergeni, gravidanza, diabete, ipertensione, limite_zucchero_g, limite_sodio_mg from passports where public_id = ${publicId}`;
  const row = rows[0];
  if (!row) return null;
  return { profile: rowToPassport(row), reveal: Boolean(userId && row.user_id === userId) };
}

async function loadOwnedPassport(userId: string): Promise<Passport> {
  const sql = await getSql();
  const rows = await sql<PassportRow>`select public_id, allergeni, gravidanza, diabete, ipertensione, limite_zucchero_g, limite_sodio_mg from passports where user_id = ${userId}`;
  if (rows[0]) return rowToPassport(rows[0]);
  const publicId = newPublicId();
  await sql`insert into passports (user_id, public_id, allergeni) values (${userId}, ${publicId}, ${"[]"})`;
  return {
    publicId,
    allergens: [],
    pregnancy: false,
    diabetes: false,
    hypertension: false,
    sugarLimitG: null,
    sodiumLimitMg: null,
  };
}

type ChainRow = {
  id: string;
  prodotto_id: string;
  seq: number;
  tipo: string;
  attore: string;
  luogo: string;
  lat: number;
  lng: number;
  occurred_at: string;
  lotto: string;
  note: string;
  prev_hash: string;
  hash: string;
};

export const getBootstrap = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSeeded();
  return {
    restaurants: restaurants.map((r) => ({
      id: r.id,
      nome: r.nome,
      tipo: r.tipo,
      citta: r.citta,
      certificato: r.certificato,
      immagine: r.immagine,
      indirizzo: r.indirizzo,
    })),
    demoPassports: demoPassports.map((p) => ({
      id: p.id,
      etichetta: p.etichetta,
      note: p.note,
      allergeni: p.allergeni,
      gravidanza: p.gravidanza,
      diabete: p.diabete,
      ipertensione: p.ipertensione,
    })),
    counts: {
      fornitori: suppliers.length,
      prodotti: products.length,
      piatti: dishes.length,
      eventi: chainEvents.length,
    },
  };
});

export const getRestaurantMenu = createServerFn({ method: "POST" })
  .validator((input: { restaurantId: string; passportId?: string; kiosk?: boolean }) => input)
  .handler(async ({ data }) => {
    await ensureSeeded();
    const restaurant = restaurantsById[data.restaurantId];
    if (!restaurant) return { ok: false as const, error: "Ristorante non trovato" };
    const menuDishes = dishes.filter((d) => d.ristorante_id === data.restaurantId);
    let profile: Passport | null = null;
    let reveal = false;
    if (data.passportId) {
      const resolved = await resolvePassport(data.passportId);
      if (resolved) {
        profile = resolved.profile;
        reveal = data.kiosk ? false : resolved.reveal;
      }
    }
    const items = menuDishes.map((dish) => {
      const match = profile ? evaluateDish(dish, restaurant, productsById, profile) : null;
      return {
        id: dish.id,
        nome: dish.nome,
        descrizione: dish.descrizione,
        portata: dish.portata,
        immagine: dish.immagine,
        prezzo_cent: dish.prezzo_cent,
        certificato: dish.stato_certificazione === "certified",
        allergeni_dichiarati: dish.allergeni_dichiarati,
        status: match?.status ?? null,
        reasons: reveal && match ? match.reasons : [],
      };
    });
    return {
      ok: true as const,
      restaurant,
      items,
      passportFound: Boolean(profile),
      kiosk: Boolean(data.kiosk),
    };
  });

export const getDishDetail = createServerFn({ method: "POST" })
  .validator((input: { dishId: string; passportId?: string; kiosk?: boolean }) => input)
  .handler(async ({ data }) => {
    await ensureSeeded();
    const dish = dishes.find((d) => d.id === data.dishId);
    if (!dish) return { ok: false as const, error: "Piatto non trovato" };
    const restaurant = restaurantsById[dish.ristorante_id] ?? null;
    const components = dish.prodotti.map((id) => productsById[id]).filter(Boolean);
    let match: { status: TrafficStatus; reasons: string[] } | null = null;
    if (data.passportId) {
      const resolved = await resolvePassport(data.passportId);
      if (resolved) {
        const result = evaluateDish(dish, restaurant, productsById, resolved.profile);
        match = {
          status: result.status,
          reasons: data.kiosk ? [] : resolved.reveal ? result.reasons : [],
        };
      }
    }
    const sql = await getSql();
    const events = await sql<ChainRow>`select id, prodotto_id, seq, tipo, attore, luogo, lat, lng, occurred_at, lotto, note, prev_hash, hash from chain_events order by prodotto_id, seq`;
    const wanted = new Set(dish.prodotti);
    return {
      ok: true as const,
      dish,
      restaurant,
      components,
      match,
      events: events
        .filter((e) => wanted.has(e.prodotto_id))
        .map((e) => ({ ...e, quando: e.occurred_at })),
    };
  });

export const getProductDetail = createServerFn({ method: "POST" })
  .validator((input: { productId: string }) => input)
  .handler(async ({ data }) => {
    await ensureSeeded();
    const product = productsById[data.productId];
    if (!product) return { ok: false as const, error: "Prodotto non trovato" };
    const supplier = suppliers.find((s) => s.id === product.fornitore_id) ?? null;
    const sql = await getSql();
    const events = await sql<ChainRow>`select id, prodotto_id, seq, tipo, attore, luogo, lat, lng, occurred_at, lotto, note, prev_hash, hash from chain_events where prodotto_id = ${product.id} order by seq`;
    const usedIn = dishes
      .filter((d) => d.prodotti.includes(product.id))
      .map((d) => ({ id: d.id, nome: d.nome, ristorante_id: d.ristorante_id }));
    return {
      ok: true as const,
      product,
      supplier,
      events: events.map((e) => ({ ...e, quando: e.occurred_at })),
      usedIn,
    };
  });

export const listCatalog = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSeeded();
  return { products, suppliers, restaurants };
});

export const listFiliera = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSeeded();
  const sql = await getSql();
  const events = await sql<ChainRow>`select id, prodotto_id, seq, tipo, attore, luogo, lat, lng, occurred_at, lotto, note, prev_hash, hash from chain_events order by prodotto_id, seq`;
  return {
    products,
    suppliers,
    events: events.map((e) => ({ ...e, quando: e.occurred_at })),
  };
});

export const getMyPassport = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureSeeded();
    return loadOwnedPassport(context.userId);
  });

export const saveMyPassport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      allergens: string[];
      pregnancy: boolean;
      diabetes: boolean;
      hypertension: boolean;
      sugarLimitG: number | null;
      sodiumLimitMg: number | null;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    await ensureSeeded();
    const sql = await getSql();
    const existing = await sql<{ public_id: string }>`select public_id from passports where user_id = ${context.userId}`;
    const publicId = existing[0]?.public_id ?? newPublicId();
    if (!existing[0]) {
      await sql`insert into passports (user_id, public_id, allergeni, gravidanza, diabete, ipertensione, limite_zucchero_g, limite_sodio_mg)
        values (${context.userId}, ${publicId}, ${JSON.stringify(data.allergens)}, ${data.pregnancy}, ${data.diabetes}, ${data.hypertension}, ${data.sugarLimitG}, ${data.sodiumLimitMg})`;
    } else {
      await sql`update passports set allergeni = ${JSON.stringify(data.allergens)}, gravidanza = ${data.pregnancy}, diabete = ${data.diabetes}, ipertensione = ${data.hypertension}, limite_zucchero_g = ${data.sugarLimitG}, limite_sodio_mg = ${data.sodiumLimitMg}, updated_at = now()
        where user_id = ${context.userId}`;
    }
    return { ok: true as const, publicId };
  });

export const getMyMenuMatch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { restaurantId: string }) => input)
  .handler(async ({ context, data }) => {
    await ensureSeeded();
    const restaurant = restaurantsById[data.restaurantId];
    if (!restaurant) return { ok: false as const, error: "Ristorante non trovato" };
    const owned = await loadOwnedPassport(context.userId);
    const menuDishes = dishes.filter((d) => d.ristorante_id === data.restaurantId);
    const items = menuDishes.map((dish) => {
      const match = evaluateDish(dish, restaurant, productsById, owned);
      return {
        id: dish.id,
        nome: dish.nome,
        descrizione: dish.descrizione,
        portata: dish.portata,
        immagine: dish.immagine,
        prezzo_cent: dish.prezzo_cent,
        certificato: dish.stato_certificazione === "certified",
        allergeni_dichiarati: dish.allergeni_dichiarati,
        status: match.status,
        reasons: match.reasons,
      };
    });
    return { ok: true as const, restaurant, items, publicId: owned.publicId };
  });

export const submitReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; brand: string; notes: string; image?: string }) => input)
  .handler(async ({ context, data }) => {
    await ensureSeeded();
    const name = data.name.trim();
    if (!name) return { ok: false as const, error: "Indica il nome del prodotto" };
    let analysis = "";
    const apiKey = process.env.XAI_API_KEY;
    if (apiKey) {
      const parts: Array<Record<string, unknown>> = [
        {
          type: "text",
          text: "Sei il motore di catalogazione SafePlate. Estrai da etichetta/foto: nome, marca, ingredienti, allergeni EU 14 (glutine, crostacei, uova, pesce, arachidi, soia, latte, frutta a guscio, sedano, senape, sesamo, solfiti, lupini, molluschi), tracce, lotto, origine se visibile. Rispondi in italiano, elenco compatto, max 180 parole. Se l'immagine non è un'etichetta, dillo.",
        },
      ];
      if (data.image && data.image.startsWith("data:image") && data.image.length < 900_000) {
        parts.push({ type: "image_url", image_url: { url: data.image } });
      }
      parts.push({
        type: "text",
        text: `Note utente: ${data.notes}\nNome dichiarato: ${name}\nMarca: ${data.brand}`,
      });
      try {
        const res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4.5",
            max_tokens: 500,
            messages: [{ role: "user", content: parts }],
          }),
        });
        if (res.ok) {
          const body = (await res.json()) as { choices: { message: { content: string } }[] };
          analysis = body.choices[0]?.message.content ?? "";
        } else {
          analysis = `Analisi IA non disponibile (stato ${res.status}).`;
        }
      } catch {
        analysis = "Analisi IA non raggiungibile in questo momento.";
      }
    } else {
      analysis =
        "Analisi IA non configurata in questo ambiente. La segnalazione è comunque registrata.";
    }
    const sql = await getSql();
    const inserted = await sql<{ id: number }>`insert into product_reports (user_id, product_name, brand, notes, ai_analysis)
      values (${context.userId}, ${name}, ${data.brand}, ${data.notes}, ${analysis}) returning id`;
    const text = `Segnalazione SafePlate — prodotto non catalogato\nNome: ${name}\nMarca: ${data.brand || "—"}\nNote: ${data.notes || "—"}\nAnalisi IA: ${analysis || "in attesa"}`;
    return {
      ok: true as const,
      id: inserted[0]?.id,
      analysis,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
      mailto: `mailto:segnalazioni@safeplate.eu?subject=${encodeURIComponent("SafePlate: prodotto non catalogato — " + name)}&body=${encodeURIComponent(text)}`,
    };
  });

export const listMyReports = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{
      id: number;
      product_name: string;
      brand: string | null;
      notes: string | null;
      ai_analysis: string | null;
      status: string;
      created_at: string;
    }>`select id, product_name, brand, notes, ai_analysis, status, created_at from product_reports where user_id = ${context.userId} order by id desc`;
  });

export const signCertification = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      restaurantName: string;
      city: string;
      signatureName: string;
      protocols: string[];
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const restaurantName = data.restaurantName.trim();
    const signatureName = data.signatureName.trim();
    if (!restaurantName || !signatureName) {
      return { ok: false as const, error: "Nome ristorante e firmatario sono obbligatori" };
    }
    const payload = {
      ristorante: restaurantName,
      citta: data.city.trim(),
      firmatario: signatureName,
      protocolli: data.protocols,
      testo: DECLARATION,
      quando: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    };
    const { createHash } = await import("node:crypto");
    const { pythonCanonical } = await import("./chain-hash");
    const digest = createHash("sha256").update(pythonCanonical(payload)).digest("hex");
    const sql = await getSql();
    await sql`insert into certifications (user_id, restaurant_name, city, declaration, protocols, signature_name, content_hash)
      values (${context.userId}, ${restaurantName}, ${data.city.trim()}, ${DECLARATION}, ${JSON.stringify(data.protocols)}, ${signatureName}, ${digest})`;
    return { ok: true as const, hash: digest };
  });

export const listCertifications = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSeeded();
  const sql = await getSql();
  return sql<{
    id: number;
    restaurant_name: string;
    city: string | null;
    signature_name: string;
    content_hash: string;
    protocols: string;
    created_at: string;
  }>`select id, restaurant_name, city, signature_name, content_hash, protocols, created_at from certifications order by id desc limit 40`;
});

export const qrPayloadFor = createServerFn({ method: "POST" })
  .validator((input: { publicId: string; origin: string }) => input)
  .handler(async ({ data }) => ({ payload: encodePayload(data.publicId, data.origin) }));
