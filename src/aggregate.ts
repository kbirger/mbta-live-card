import { DEFAULT_ICON, ROUTE_TYPE_ICON_RULES } from "./const";
import { deviceDisplayName, suggestEntitiesForDevice } from "./suggest";
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

function toTrip(
  entityId: string,
  deviceId: string,
  sourceLabel: string | undefined,
  hass: HomeAssistant
): NormalizedTrip | undefined {
  const entity = hass.states[entityId];
  if (!entity || entity.state === "unavailable" || entity.state === "unknown") {
    return undefined;
  }
  const a = entity.attributes ?? {};
  return {
    entityId,
    deviceId,
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
 * For every configured source device, resolves its "Upcoming"/"Following"
 * sensor entities from the entity registry, reads them out of hass.states,
 * normalizes each into a NormalizedTrip, and returns them all sorted by
 * actual departure time (trips with no parseable departure_time sort last,
 * stable by input order), deduplicated by train number. Sources with no (or
 * an unresolvable) device_id simply contribute no trips.
 *
 * Deduplication matters because a single physical train often stops at more
 * than one of the user's configured stations, so the same train can show up
 * as an "Upcoming"/"Following" trip from two different source devices. Left
 * undeduplicated, that train could fill every slot up to max_trips by
 * itself, crowding out the next distinct train.
 */
export function collectTrips(sources: SourceConfig[], hass: HomeAssistant): NormalizedTrip[] {
  const trips: NormalizedTrip[] = [];
  for (const source of sources) {
    if (!source.device_id) continue;
    const label = source.label ?? deviceDisplayName(source.device_id, hass);
    for (const entityId of suggestEntitiesForDevice(source.device_id, hass)) {
      const trip = toTrip(entityId, source.device_id, label, hass);
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
  return dedupeByTrain(withIndex.map((entry) => entry.trip));
}

function dedupeByTrain(trips: NormalizedTrip[]): NormalizedTrip[] {
  const seen = new Set<string>();
  const result: NormalizedTrip[] = [];
  for (const trip of trips) {
    // Trips with no train number (uncommon, but the field is optional
    // upstream) are never deduplicated against each other.
    const key = trip.train ? `train:${trip.train}` : `entity:${trip.entityId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trip);
  }
  return result;
}

function parseTime(value?: string): number | undefined {
  if (!value) return undefined;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
}
