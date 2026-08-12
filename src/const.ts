export const CARD_VERSION = "0.3.0";

export const DEFAULT_MAX_TRIPS = 2;

export const DEFAULT_FIELDS = ["line", "to", "departure_time_to", "departure_delay"];

// The numeric GTFS route_type MBTALive uses internally isn't exposed in
// entity attributes — only the human-readable route description (`type`,
// e.g. "Commuter Rail", "Local Bus", "Rapid Transit", "Ferry"). Match on
// that instead.
export const ROUTE_TYPE_ICON_RULES: [RegExp, string][] = [
  [/bus/i, "mdi:bus"],
  [/ferry/i, "mdi:ferry"],
  [/commuter/i, "mdi:train"],
  [/(subway|rapid|light rail|trolley)/i, "mdi:subway-variant"],
];

export const DEFAULT_ICON = "mdi:train";
