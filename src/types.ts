export interface SourceConfig {
  label?: string;
  /**
   * Bookkeeping only, written by the GUI editor: which MBTA Live device
   * `entities` was last suggested from, so re-opening the editor shows the
   * right picker selection. The card itself only ever reads `entities` —
   * hand-written YAML can omit this entirely.
   */
  device_id?: string;
  entities: string[];
}

export interface CardConfig {
  type: string;
  title?: string;
  max_trips?: number;
  fields?: string[];
  sources: SourceConfig[];
  show_alerts?: boolean;
}

export interface HassEntityAttributes {
  from?: string;
  to?: string;
  type?: string;
  line?: string;
  color?: string;
  headsign?: string;
  duration?: string;
  train?: string;
  status?: string;
  latitude?: number;
  longitude?: number;
  departure_platform?: string;
  departure_time?: string;
  departure_time_to?: string;
  departure_delay?: string;
  arrival_countdown?: string;
  arrival_platform?: string;
  arrival_time?: string;
  arrival_time_to?: string;
  arrival_delay?: string;
  alerts?: string | string[];
  next?: string[];
  friendly_name?: string;
  [key: string]: unknown;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: HassEntityAttributes;
}

export interface HassEntityRegistryEntry {
  entity_id: string;
  device_id?: string | null;
}

export interface HassDeviceRegistryEntry {
  id: string;
  name?: string | null;
  name_by_user?: string | null;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  /** Entity registry, keyed by entity_id (present in the real dashboard `hass`). */
  entities?: Record<string, HassEntityRegistryEntry>;
  /** Device registry, keyed by device id (present in the real dashboard `hass`). */
  devices?: Record<string, HassDeviceRegistryEntry>;
  [key: string]: unknown;
}

export interface NormalizedTrip {
  entityId: string;
  sourceLabel?: string;
  state: string;
  from?: string;
  to?: string;
  line?: string;
  type?: string;
  color?: string;
  headsign?: string;
  duration?: string;
  train?: string;
  status?: string;
  departure_platform?: string;
  departure_time?: string;
  departure_time_to?: string;
  departure_delay?: string;
  arrival_countdown?: string;
  arrival_platform?: string;
  arrival_time?: string;
  arrival_time_to?: string;
  arrival_delay?: string;
  alerts?: string;
}
