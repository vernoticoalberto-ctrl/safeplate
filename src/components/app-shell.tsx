import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { parseVista, VISTAS } from "@/lib/safeplate/vistas";
import { cn } from "@/lib/utils";

function LogoMark() {
  return (
    <Link to="/" search={{ vista: "wallet" }} className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-full bg-ink text-paper">
        <span className="size-4 rounded-full ring-2 ring-paper" />
      </span>
      <span className="font-display text-lg tracking-tight">SafePlate</span>
    </Link>
  );
}

function AuthSlot({
  sessionUser,
}: {
  sessionUser: { id: string; email: string | null } | null;
}) {
  const { user, isPending } = useCurrentUserState();
  if (user) return <UserButton />;
  if (isPending && sessionUser) {
    const label = sessionUser.email ?? "Account";
    return (
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-mist text-sm font-medium">
          {label.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-28 truncate text-sm font-medium">{label}</span>
      </div>
    );
  }
  if (!isPending || sessionUser === null) {
    return (
      <Link
        to="/login"
        className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium hover:bg-mist"
      >
        Entra
      </Link>
    );
  }
  return <div className="h-8 w-24 animate-pulse rounded-full bg-mist" />;
}

function useActiveVista() {
  return useRouterState({
    select: (s) => {
      const pathname = s.location.pathname;
      const search = s.location.search as { vista?: string; pid?: string };
      if (pathname === "/") return parseVista(search.vista);
      const hit = VISTAS.find((v) => pathname === v.match || pathname.startsWith(`${v.match}/`));
      return hit?.id ?? null;
    },
  });
}

export function AppShell({
  children,
  sessionUser,
}: {
  children: ReactNode;
  sessionUser: { id: string; email: string | null } | null;
}) {
  const active = useActiveVista();
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <LogoMark />
          <AuthSlot sessionUser={sessionUser} />
        </div>
        <nav className="border-t border-line/70">
          <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 py-1.5">
            {VISTAS.map((link) => {
              const isActive = active === link.id;
              return (
                <li key={link.id} className="shrink-0">
                  <Link
                    to="/"
                    search={{ vista: link.id }}
                    className={cn(
                      "inline-flex h-11 items-center rounded-lg px-3 text-sm whitespace-nowrap",
                      isActive ? "bg-mist font-medium" : "text-muted hover:bg-mist hover:text-ink",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <div>
        {children}
      </div>
    </div>
  );
}

export function Page({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:py-12", className)}>{children}</main>
  );
}
