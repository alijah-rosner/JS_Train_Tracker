// Real-time arrival data from the MTA's GTFS-realtime feeds (no API key needed).
//
// The feeds are binary protobuf and the MTA doesn't send CORS headers, so the
// browser can't read them directly. This small server decodes them and hands
// the React app plain JSON. In production it also serves the built app.

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const { FeedMessage } = GtfsRealtimeBindings.transit_realtime;

const BASE = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2F";
export const FEEDS = {
  M: BASE + "gtfs-bdfm", // B, D, F, M
  L: BASE + "gtfs-l",
};

// Stop IDs: the trailing N/S is the direction. Per the MTA station list,
//   M05N = Forest Av, Inbound (toward Manhattan)
//   L17N = Myrtle-Wyckoff Avs, toward 8 Av (Manhattan)

const PORT = process.env.PORT || 3001;
const CACHE_MS = 15_000; // several stops can share one feed; don't refetch it every call
const cache = new Map(); // url -> { at, feed }

async function getFeed(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.feed;

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`MTA feed returned ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  // longs: Number turns the protobuf int64 timestamps into plain JS numbers
  const feed = FeedMessage.toObject(FeedMessage.decode(buf), { longs: Number });

  cache.set(url, { at: Date.now(), feed });
  return feed;
}

/** Next `limit` arrival times (Unix seconds) at `stopId`, soonest first. */
export async function upcomingArrivals(feedUrl, stopId, routeId = null, limit = 3) {
  const now = Math.floor(Date.now() / 1000);
  const feed = await getFeed(feedUrl);
  const times = [];

  for (const entity of feed.entity ?? []) {
    const tu = entity.tripUpdate;
    if (!tu) continue;
    if (routeId && tu.trip?.routeId !== routeId) continue;

    for (const st of tu.stopTimeUpdate ?? []) {
      if (st.stopId !== stopId) continue; // exact match, not substring
      const t = st.arrival?.time || st.departure?.time;
      if (t && t >= now - 30) times.push(t); // drop trains that already left
    }
  }

  times.sort((a, b) => a - b);
  return times.slice(0, limit);
}

const app = express();

app.get("/api/arrivals/:route/:stop", async (req, res) => {
  const { route, stop } = req.params;
  const feedUrl = FEEDS[route];
  if (!feedUrl || !/^[A-Z0-9]{2,5}[NS]$/.test(stop)) {
    return res.status(400).json({ error: "unknown route or stop" });
  }
  try {
    res.json({ arrivals: await upcomingArrivals(feedUrl, stop, route) });
  } catch (err) {
    console.error(`${route} feed error: ${err.message}`);
    res.status(502).json({ error: err.message });
  }
});

// Serve the built React app (after `npm run build`).
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
app.use(express.static(dist));
app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));

app.listen(PORT, () => console.log(`Train board on http://localhost:${PORT}`));
