import {
  fetchLastfmTopTracks,
  fetchLastfmTopArtists,
  fetchLastfmUserInfo,
  calculateListeningEras,
  LastfmError,
  type LastfmPeriod,
} from "@/lib/lastfm";
import type { LastfmCombinedResponse } from "@/types";

const VALID_PERIODS = new Set<LastfmPeriod>([
  "overall", "12month", "3month", "6month", "1month", "7day",
]);

function isValidPeriod(p: unknown): p is LastfmPeriod {
  return typeof p === "string" && VALID_PERIODS.has(p as LastfmPeriod);
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Body debe ser un objeto JSON." }, { status: 400 });
  }

  const { username, period } = body as Record<string, unknown>;

  if (typeof username !== "string" || username.trim().length === 0) {
    return Response.json(
      { error: "El campo 'username' es requerido." },
      { status: 400 }
    );
  }

  const safePeriod: LastfmPeriod = isValidPeriod(period) ? period : "overall";
  const safeUsername = username.trim();

  try {
    // Las 3 primeras llamadas van en paralelo; calculateListeningEras es
    // independiente y también corre en paralelo.
    const [topTracks, topArtists, userInfo, eras] = await Promise.all([
      fetchLastfmTopTracks(safeUsername, safePeriod, 50),
      fetchLastfmTopArtists(safeUsername, safePeriod, 20),
      fetchLastfmUserInfo(safeUsername),
      calculateListeningEras(safeUsername),
    ]);

    const response: LastfmCombinedResponse = {
      topTracks,
      topArtists,
      userInfo,
      eras,
    };

    return Response.json(response);
  } catch (err) {
    if (err instanceof LastfmError) {
      // Código 6 de Last.fm = User not found
      if (err.code === 6) {
        return Response.json(
          { error: `Usuario '${safeUsername}' no encontrado en Last.fm.` },
          { status: 404 }
        );
      }
      return Response.json(
        { error: `Error de Last.fm: ${err.message}` },
        { status: 502 }
      );
    }

    const message = err instanceof Error ? err.message : "Error interno del servidor.";
    console.error("[/api/lastfm/top]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
