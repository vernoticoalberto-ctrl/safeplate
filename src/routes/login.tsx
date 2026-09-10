import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { SignedIn, UserButton } from "@/lib/auth/gates";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
        });
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message);
      }
      window.location.href = "/wallet";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accesso non riuscito");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[70dvh] max-w-md place-items-center px-4 py-12">
      <div className="w-full rounded-2xl bg-cream p-6 ring-1 ring-line sm:p-8">
        <p className="font-mono text-[11px] tracking-[0.22em] text-subtle uppercase">SafePlate ID</p>
        <h1 className="mt-2 font-display text-3xl tracking-tight">Entra nel passaporto</h1>
        <p className="mt-2 text-sm text-muted">
          I dati sanitari restano nel tuo account. Il ristorante vede solo il semaforo.
        </p>
        <SignedIn>
          <div className="mt-6 rounded-xl bg-paper p-4">
            <p className="text-sm">Sei già autenticato.</p>
            <div className="mt-3">
              <UserButton />
            </div>
            <Button asChild className="mt-4 w-full">
              <Link to="/wallet">Apri il wallet</Link>
            </Button>
          </div>
        </SignedIn>
        {authEnabled ? (
          <div className="mt-6 space-y-3">
            {GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/wallet" })}
              >
                Continua con {p.label}
              </Button>
            ))}
            <div className="relative py-2 text-center text-xs text-subtle">
              <span className="bg-cream px-2">oppure email</span>
            </div>
            <form onSubmit={onEmail} className="space-y-3">
              {mode === "up" ? (
                <label className="block text-sm">
                  Nome
                  <input
                    className="mt-1 h-11 w-full rounded-lg border border-line bg-paper px-3"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </label>
              ) : null}
              <label className="block text-sm">
                Email
                <input
                  type="email"
                  required
                  className="mt-1 h-11 w-full rounded-lg border border-line bg-paper px-3"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>
              <label className="block text-sm">
                Password
                <input
                  type="password"
                  required
                  minLength={8}
                  className="mt-1 h-11 w-full rounded-lg border border-line bg-paper px-3"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                />
              </label>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Un attimo…" : mode === "up" ? "Crea passaporto" : "Accedi"}
              </Button>
            </form>
            <button
              type="button"
              className="w-full text-sm text-muted underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "up" ? "in" : "up")}
            >
              {mode === "up" ? "Hai già un account? Accedi" : "Prima volta? Registrati"}
            </button>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">Accesso disabilitato in questo ambiente.</p>
        )}
      </div>
    </main>
  );
}
