// Port of weather.py. Open-Meteo allows CORS, so the browser calls it directly.

const QUEENS_LAT = 40.7282;
const QUEENS_LON = -73.7949;

// WMO weather codes -> short description
const CONDITIONS = {
  0: "Clear", 1: "Mostly Clear", 2: "Partly Cloudy", 3: "Cloudy",
  45: "Fog", 48: "Fog",
  51: "Drizzle", 53: "Drizzle", 55: "Drizzle", 56: "Freezing Drizzle", 57: "Freezing Drizzle",
  61: "Light Rain", 63: "Rain", 65: "Heavy Rain", 66: "Freezing Rain", 67: "Freezing Rain",
  71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 77: "Snow",
  80: "Showers", 81: "Showers", 82: "Heavy Showers",
  85: "Snow Showers", 86: "Snow Showers",
  95: "Thunderstorms", 96: "Thunderstorms", 99: "Thunderstorms",
};

/** Returns { temp: 58, condition: "Partly Cloudy" } in °F. */
export async function currentWeather() {
  const params = new URLSearchParams({
    latitude: QUEENS_LAT,
    longitude: QUEENS_LON,
    current: "temperature_2m,weather_code",
    temperature_unit: "fahrenheit",
    timezone: "America/New_York",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`weather: HTTP ${res.status}`);
  const { current } = await res.json();
  return {
    temp: Math.round(current.temperature_2m),
    condition: CONDITIONS[current.weather_code] ?? "",
  };
}
