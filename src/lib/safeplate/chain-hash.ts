import { createHash } from "node:crypto";
import { GENESIS } from "./engine";
import type { ChainEvent } from "./types";

export function pythonCanonical(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${JSON.stringify(payload[k])}`);
  return `{${parts.join(",")}}`;
}

function nodeSha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function chainHashNode(event: ChainEvent, prevHash: string): string {
  const body: Record<string, unknown> = {
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
  return nodeSha256(pythonCanonical(body));
}

export function sealChainNode(events: ChainEvent[]): ChainEvent[] {
  const ordered = [...events].sort((a, b) => a.seq - b.seq);
  let prev = GENESIS;
  const sealed: ChainEvent[] = [];
  for (const raw of ordered) {
    const event = { ...raw, prev_hash: prev };
    const hash = chainHashNode(event, prev);
    event.hash = hash;
    prev = hash;
    sealed.push(event);
  }
  return sealed;
}
