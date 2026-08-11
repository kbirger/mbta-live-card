import { DEFAULT_ICON, ROUTE_TYPE_ICON_RULES } from "./const";
import { HomeAssistant, NormalizedTrip, SourceConfig } from "./types";

export function iconForTrip(trip: NormalizedTrip): string {
  const haystack = trip.type ?? "";
  for (const [pattern, icon] of ROUTE_TYPE_ICON_RULES) {
    if (pattern.test(haystack)) return icon;
  }
  return DEFAULT_ICON;
}

function normalizeAlerts(alerts: unknown): string | undefined {
  if (!alerts) return undefined;
  if (Array.isArray(alerts)) {
    return alerts.length ? alerts.join(" # ") : undefined;
  }
  const text = String(alerts).trim();
  return text.length ? text : undefined;
}

function toTrip(entityId: string, sourceLabel: string | undefined, hass: HomeAssistant): NormalizedTrip | undefined {
  const entity = hass.states[entityId];
  if (!entity || entity.state === "unavailable" || entity.state === "unknown") {
    return undefined;
  }
  const a = entity.attributes ?? {};
  return {
    entityId,
    sourceLabel: sourceLabel ?? a.friendly_name,
    state: entity.state,
    from: a.from,
    to: a.to,
    line: a.line,
    type: a.type,
    color: a.color,
    headsign: a.headsign,
    duration: a.duration,
    train: a.train,
    status: a.status,
    departure_platform: a.departure_platform,
    departure_time: a.departure_time,
    departure_time_to: a.departure_time_to,
    departure_delay: a.departure_delay,
    arrival_countdown: a.arrival_countdown,
    arrival_platform: a.arrival_platform,
    arrival_time: a.arrival_time,
    arrival_time_to: a.arrival_time_to,
    arrival_delay: a.arrival_delay,
    alerts: normalizeAlerts(a.alerts),
  };
}

/**
 * Reads every configured source entity out of hass.states, normalizes each
 * into a NormalizedTrip, and returns them sorted by actual departure time
 * (trips with no parseable departure_time sort last, stable by input order).
 */
export function collectTrips(sources: SourceConfig[], hass: HomeAssistant): NormalizedTrip[] {
  const trips: NormalizedTrip[] = [];
  for (const source of sources) {
    for (const entityId of source.entities ?? []) {
      const trip = toTrip(entityId, source.label, hass);
      if (trip) trips.push(trip);
    }
  }

  const withIndex = trips.map((trip, index) => ({ trip, index, time: parseTime(trip.departure_time) }));
  withIndex.sort((a, b) => {
    if (a.time === undefined && b.time === undefined) return a.index - b.index;
    if (a.time === undefined) return 1;
    if (b.time === undefined) return -1;
    if (a.time !== b.time) return a.time - b.time;
    return a.index - b.index;
  });
  return withIndex.map((entry) => entry.trip);
}

function parseTime(value?: string): number | undefined {
  if (!value) return undefined;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
}
