// Same config as LINES in the Python version.
export const LINES = [
  { route: "M", color: "#FF6319", dest: "Manhattan", station: "Forest Av", stop: "M05N" },
  { route: "L", color: "#A7A9AC", dest: "Manhattan", station: "Myrtle-Wyckoff Avs", stop: "L17N" },
];

export const TRAIN_REFRESH_MS = 30_000; // MTA feeds update roughly every 30 s
export const WEATHER_REFRESH_MS = 600_000; // every 10 min
