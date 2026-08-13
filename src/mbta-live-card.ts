import { LitElement, html, css, PropertyValues, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { collectTrips, iconForTrip } from "./aggregate";
import { CARD_VERSION, DEFAULT_FIELDS, DEFAULT_MAX_TRIPS } from "./const";
import { FIELD_REGISTRY } from "./fields";
import { CardConfig, HomeAssistant, NormalizedTrip } from "./types";
import "./mbta-live-card-editor";

// eslint-disable-next-line no-console
console.info(`%c MBTA-LIVE-CARD %c v${CARD_VERSION} `, "color: white; background: #165c31; font-weight: 700;", "color: #165c31; background: white; font-weight: 700;");

@customElement("mbta-live-card")
export class MbtaLiveCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: CardConfig;

  public static getStubConfig(): CardConfig {
    return {
      type: "custom:mbta-live-card",
      title: "My Commute",
      max_trips: DEFAULT_MAX_TRIPS,
      fields: DEFAULT_FIELDS,
      sources: [],
    };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("mbta-live-card-editor");
  }

  public setConfig(config: CardConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    if (config.sources !== undefined && !Array.isArray(config.sources)) {
      throw new Error("mbta-live-card: `sources` must be a list of { device_id }");
    }
    // Sources with no device_id yet (e.g. mid-edit in the GUI editor, before
    // a device has been picked) are tolerated here and simply contribute no
    // trips at render time, rather than breaking the whole card.
    const sources = config.sources ?? [];
    if (config.fields) {
      const unknown = config.fields.filter((f) => !FIELD_REGISTRY[f]);
      if (unknown.length) {
        throw new Error(`mbta-live-card: unknown field(s) in \`fields\`: ${unknown.join(", ")}`);
      }
    }
    this._config = { ...config, sources };
  }

  public getCardSize(): number {
    const maxTrips = this._config?.max_trips ?? DEFAULT_MAX_TRIPS;
    return 1 + maxTrips;
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    return changed.has("_config") || changed.has("hass");
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const maxTrips = this._config.max_trips ?? DEFAULT_MAX_TRIPS;
    const fieldKeys = this._config.fields ?? DEFAULT_FIELDS;
    const showAlerts = this._config.show_alerts ?? true;
    const trips = collectTrips(this._config.sources, this.hass).slice(0, maxTrips);

    return html`
      <ha-card .header=${this._config.title}>
        <div class="content">
          ${trips.length === 0
            ? html`<div class="empty">No upcoming trips</div>`
            : trips.map((trip) => this._renderTrip(trip, fieldKeys, showAlerts))}
        </div>
      </ha-card>
    `;
  }

  private _navigateToDevice(deviceId?: string): void {
    if (!deviceId) return;
    history.pushState(null, "", `/config/devices/device/${deviceId}`);
    window.dispatchEvent(new CustomEvent("location-changed", { bubbles: false, composed: true }));
  }

  private _renderTrip(trip: NormalizedTrip, fieldKeys: string[], showAlerts: boolean) {
    const clickable = Boolean(trip.deviceId);
    return html`
      <div
        class="trip ${clickable ? "clickable" : ""}"
        role=${clickable ? "button" : nothing}
        tabindex=${clickable ? "0" : nothing}
        @click=${() => this._navigateToDevice(trip.deviceId)}
        @keydown=${(ev: KeyboardEvent) => {
          if (clickable && (ev.key === "Enter" || ev.key === " ")) {
            ev.preventDefault();
            this._navigateToDevice(trip.deviceId);
          }
        }}
      >
        <ha-icon class="icon" .icon=${iconForTrip(trip)} style=${trip.color ? `color: #${trip.color}` : ""}></ha-icon>
        <div class="trip-body">
          ${trip.sourceLabel ? html`<div class="source">${trip.sourceLabel}</div>` : nothing}
          <div class="fields">
            ${fieldKeys.map((key) => this._renderField(trip, key))}
          </div>
          ${showAlerts && trip.alerts ? html`<div class="alerts">${trip.alerts}</div>` : nothing}
        </div>
      </div>
    `;
  }

  private _renderField(trip: NormalizedTrip, key: string) {
    const field = FIELD_REGISTRY[key];
    if (!field) return nothing;
    const value = field.get(trip);
    if (value === undefined || value === "") return nothing;
    return html`<span class="field" title=${field.label}>${value}</span>`;
  }

  static styles = css`
    .content {
      display: flex;
      flex-direction: column;
      padding: 0 16px 16px;
    }
    .empty {
      color: var(--secondary-text-color);
      padding: 8px 0;
    }
    .trip {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 0;
      border-top: 1px solid var(--divider-color);
    }
    .trip:first-child {
      border-top: none;
    }
    .trip.clickable {
      cursor: pointer;
      border-radius: 4px;
    }
    .trip.clickable:hover,
    .trip.clickable:focus-visible {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      outline: none;
    }
    .icon {
      margin-top: 2px;
      color: var(--state-icon-color, var(--primary-text-color));
      flex-shrink: 0;
    }
    .trip-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .source {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .fields {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 10px;
      font-size: 0.95em;
      color: var(--primary-text-color);
    }
    .field:not(:last-child)::after {
      content: "\\2022";
      margin-left: 10px;
      color: var(--secondary-text-color);
    }
    .alerts {
      font-size: 0.85em;
      color: var(--error-color, #db4437);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mbta-live-card": MbtaLiveCard;
  }
}

(window as unknown as { customCards: unknown[] }).customCards = (window as unknown as { customCards: unknown[] }).customCards || [];
(window as unknown as { customCards: Record<string, unknown>[] }).customCards.push({
  type: "mbta-live-card",
  name: "MBTA Live Card",
  description: "Combines one or more MBTA Live integration devices into a single, sorted list of upcoming trips.",
});
