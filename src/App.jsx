// NYC-subway-countdown-clock style board for the M (Forest Av) and L (Myrtle-Wyckoff).
//
// Keys:  F = toggle fullscreen   Esc = leave fullscreen (browser default)   Q = quit

import { useEffect, useState } from "react";
import { LINES, TRAIN_REFRESH_MS, WEATHER_REFRESH_MS } from "./lines.js";
import { minutesUntil, upcomingArrivals } from "./trains.js";
import { currentWeather } from "./weather.js";

function useInterval(fn, ms, runNow = true) {
  useEffect(() => {
    if (runNow) fn();
    const id = setInterval(fn, ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]);
}

export default function App() {
  const [arrivals, setArrivals] = useState(() => LINES.map(() => null));
  const [weather, setWeather] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  // Re-render every second so minutes count down between feed refreshes.
  useInterval(() => setNow(Date.now()), 1000, false);

  useInterval(async () => {
    const results = await Promise.allSettled(
      LINES.map((l) => upcomingArrivals(l.route, l.stop))
    );
    setArrivals((prev) =>
      results.map((r, i) => {
        if (r.status === "fulfilled") return r.value;
        console.error(`${LINES[i].route} feed error:`, r.reason);
        return prev[i]; // keep last good data if a fetch fails
      })
    );
  }, TRAIN_REFRESH_MS);

  useInterval(async () => {
    try {
      setWeather(await currentWeather());
    } catch (err) {
      console.error("weather error:", err);
    }
  }, WEATHER_REFRESH_MS);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "f") {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
      } else if (key === "q") {
        // Browsers only let a script close a window it opened itself.
        window.close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="board">
      {LINES.map((line, i) => (
        <Row key={line.route} line={line} arrivals={arrivals[i]} now={now / 1000} />
      ))}
      <BottomBar now={new Date(now)} weather={weather} />
    </div>
  );
}

function Row({ line, arrivals, now }) {
  const mins = (arrivals ?? []).map((t) => minutesUntil(t, now));

  let big;
  if (mins.length === 0) {
    big = <span className="empty">{arrivals == null ? "—" : "No trains"}</span>;
  } else if (mins[0] === 0) {
    big = <span className="now">Now</span>;
  } else {
    big = (
      <>
        <span className="num">{mins[0]}</span>
        <span className="unit">&nbsp;min</span>
      </>
    );
  }

  return (
    <div className="row">
      <div className="bullet" style={{ background: line.color }}>
        {line.route}
      </div>
      <div className="where">
        <div className="dest">{line.dest}</div>
        <div className="station">{line.station}</div>
      </div>
      <div className="when">
        <div className="first">{big}</div>
        <div className="then">
          {mins.length > 1 ? `then ${mins.slice(1).join(", ")} min` : " "}
        </div>
      </div>
    </div>
  );
}

function BottomBar({ now, weather }) {
  const clock = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    .replace(",", ""); // "Mon, Oct 26" -> "Mon Oct 26"

  const temp = weather ? `${weather.temp}°F` : "--°F";
  const desc = weather?.condition ? `Queens · ${weather.condition}` : "Queens";

  return (
    <div className="bar">
      <div className="clock">
        <span className="time">{clock}</span>
        <span className="sub">{date}</span>
      </div>
      <div className="weather">
        <span className="sub">{desc}</span>
        <span className="temp">{temp}</span>
      </div>
    </div>
  );
}
