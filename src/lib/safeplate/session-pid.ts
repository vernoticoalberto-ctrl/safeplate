const KEY = "safeplate.pid";

export function readPid(): string {
  if (typeof window === "undefined") return "SP-DEMO-CELIA";
  return window.localStorage.getItem(KEY) || "SP-DEMO-CELIA";
}

export function writePid(id: string) {
  window.localStorage.setItem(KEY, id);
}
