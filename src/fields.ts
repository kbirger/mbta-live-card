import { NormalizedTrip } from "./types";

export interface FieldDef {
  key: string;
  label: string;
  get: (trip: NormalizedTrip) => string | undefined;
}

const field = (
  key: string,
  label: string,
  get: (trip: NormalizedTrip) => string | undefined
): FieldDef => ({ key, label, get });

export const FIELD_REGISTRY: Record<string, FieldDef> = Object.fromEntries(
  [
    field("state", "Departs in", (t) => t.state),
    field("from", "From", (t) => t.from),
    field("to", "To", (t) => t.to),
    field("line", "Line", (t) => t.line),
    field("type", "Type", (t) => t.type),
    field("headsign", "Headsign", (t) => t.headsign),
    field("duration", "Duration", (t) => t.duration),
    field("train", "Train", (t) => t.train),
    field("status", "Status", (t) => t.status),
    field("departure_platform", "Departure platform", (t) => t.departure_platform),
    field("departure_time", "Departure time", (t) => formatTime(t.departure_time)),
    field("departure_time_to", "Time to departure", (t) => t.departure_time_to),
    field("departure_delay", "Departure delay", (t) => t.departure_delay),
    field("arrival_countdown", "Arrives in", (t) => t.arrival_countdown),
    field("arrival_platform", "Arrival platform", (t) => t.arrival_platform),
    field("arrival_time", "Arrival time", (t) => formatTime(t.arrival_time)),
    field("arrival_time_to", "Time to arrival", (t) => t.arrival_time_to),
    field("arrival_delay", "Arrival delay", (t) => t.arrival_delay),
  ].map((f) => [f.key, f])
);

function formatTime(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
