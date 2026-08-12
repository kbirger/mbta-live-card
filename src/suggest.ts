import { HomeAssistant } from "./types";

// MBTA Live's "Upcoming"/"Following" sensors are the only two per device
// that carry a full trip's attributes (times, delay, platform, status...).
// The other ~28 sensors it creates are single-scalar and disabled by
// default, so they're deliberately not suggested here.
const TRIP_SENSOR_SUFFIXES = ["_upcoming", "_following"];

/**
 * Given an MBTA Live device id, returns that device's "Upcoming"/"Following"
 * sensor entity IDs (in that order), read from the entity registry.
 */
export function suggestEntitiesForDevice(deviceId: string, hass: HomeAssistant): string[] {
  const registry = hass.entities ?? {};
  return Object.values(registry)
    .filter((entry) => entry.device_id === deviceId && entry.entity_id.startsWith("sensor."))
    .map((entry) => entry.entity_id)
    .filter((entityId) => TRIP_SENSOR_SUFFIXES.some((suffix) => entityId.endsWith(suffix)))
    .sort((a, b) => suffixRank(a) - suffixRank(b));
}

function suffixRank(entityId: string): number {
  const index = TRIP_SENSOR_SUFFIXES.findIndex((suffix) => entityId.endsWith(suffix));
  return index === -1 ? TRIP_SENSOR_SUFFIXES.length : index;
}

export function deviceDisplayName(deviceId: string, hass: HomeAssistant): string | undefined {
  const device = hass.devices?.[deviceId];
  return device?.name_by_user ?? device?.name ?? undefined;
}

// MBTA Live entity IDs are always generated as `sensor.mbta_<...>` (see
// generate_entity_id("sensor.{}", f"mbta_{entity_id}", ...) in sensor.py),
// so this is a reliable way to scope device/entity pickers to just this
// integration without needing a config-entry lookup.
export function isMbtaLiveEntityId(entityId: string): boolean {
  return entityId.startsWith("sensor.mbta_");
}
