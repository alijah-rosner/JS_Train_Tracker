// Browser side of get_train_info.py: asks the Node server (server.js) for
// arrivals, since the MTA feeds are protobuf with no CORS headers.

/** Next arrival times (Unix seconds) at `stop` on `route`, soonest first. */
export async function upcomingArrivals(route, stop) {
  const res = await fetch(`/api/arrivals/${route}/${stop}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`arrivals ${route}/${stop}: HTTP ${res.status}`);
  const { arrivals } = await res.json();
  return arrivals;
}

export function minutesUntil(timestamp, now = Date.now() / 1000) {
  return Math.max(Math.floor((timestamp - now) / 60), 0);
}
