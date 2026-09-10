import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppConsole } from "@/components/app-console";
import { Page } from "@/components/app-shell";
import { getBootstrap, getRestaurantMenu } from "@/lib/safeplate/server";
import { parseVista, type VistaId } from "@/lib/safeplate/vistas";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { vista?: VistaId } => {
    if (typeof s.vista === "string") return { vista: parseVista(s.vista) };
    return {};
  },
  loaderDeps: ({ search }) => ({ vista: parseVista(search.vista) }),
  loader: async ({ deps }) => {
    const boot = await getBootstrap();
    const restaurantId =
      deps.vista === "totem" ? "rst-mcsafe-termini" : "rst-osteria-borgo";
    const passportId = "SP-DEMO-CELIA";
    const menu = await getRestaurantMenu({
      data: {
        restaurantId,
        passportId,
        kiosk: deps.vista === "totem",
      },
    });
    return { boot, menu, restaurantId, passportId };
  },
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const vista = parseVista(search.vista);
  const loaded = Route.useLoaderData();
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <Page>
      <AppConsole
        key={vista}
        vista={vista}
        boot={loaded.boot}
        pid={loaded.passportId}
        rid={loaded.restaurantId}
        menu={loaded.menu}
        origin={origin}
      />
    </Page>
  );
}
