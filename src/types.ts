export interface SourceConfig {
  label?: string;
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

export interface HomeAssistant {
  states: Record<string, HassEntity>;
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
