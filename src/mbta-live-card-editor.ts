import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DEFAULT_FIELDS, DEFAULT_MAX_TRIPS } from "./const";
import { FIELD_REGISTRY } from "./fields";
import { deviceDisplayName, isMbtaLiveEntityId } from "./suggest";
import { CardConfig, HomeAssistant, SourceConfig } from "./types";

interface IndexedTarget extends HTMLElement {
  index: number;
}

// ha-device-picker's entityFilter is called with a full state object (or,
// on some frontend versions, a bare entity id) — handle both so this keeps
// scoping the picker to MBTA Live devices either way.
function mbtaEntityFilter(entityOrId: string | { entity_id: string }): boolean {
  const entityId = typeof entityOrId === "string" ? entityOrId : entityOrId.entity_id;
  return isMbtaLiveEntityId(entityId);
}

@customElement("mbta-live-card-editor")
export class MbtaLiveCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: CardConfig;

  public setConfig(config: CardConfig): void {
    this._config = config;
  }

  private _entityFilter = mbtaEntityFilter;

  protected render() {
    if (!this._config || !this.hass) return nothing;

    const sources = this._config.sources ?? [];
    const fields = this._config.fields ?? DEFAULT_FIELDS;

    return html`
      <div class="section">
        <ha-textfield
          label="Title"
          .value=${this._config.title ?? ""}
          @change=${this._onTitleChanged}
        ></ha-textfield>
        <ha-textfield
          label="Max trips shown"
          type="number"
          min="1"
          .value=${String(this._config.max_trips ?? DEFAULT_MAX_TRIPS)}
          @change=${this._onMaxTripsChanged}
        ></ha-textfield>
        <ha-formfield label="Show alerts">
          <ha-switch .checked=${this._config.show_alerts ?? true} @change=${this._onShowAlertsChanged}></ha-switch>
        </ha-formfield>
      </div>

      <div class="section">
        <div class="section-title">Fields to display</div>
        <div class="fields-grid">
          ${Object.values(FIELD_REGISTRY).map(
            (field) => html`
              <ha-formfield label=${field.label}>
                <ha-checkbox
                  .checked=${fields.includes(field.key)}
                  .fieldKey=${field.key}
                  @change=${this._onFieldToggled}
                ></ha-checkbox>
              </ha-formfield>
            `
          )}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Sources</div>
        <div class="hint">
          One source per MBTA Live device (each of your depart→arrive stop pairs). MBTA Live already creates an
          entity for every field above, so picking a device is all that's needed here.
        </div>
        ${sources.map((source, index) => this._renderSource(source, index))}
        <ha-button @click=${this._addSource}>+ Add source</ha-button>
      </div>
    `;
  }

  private _renderSource(source: SourceConfig, index: number) {
    return html`
      <div class="source">
        <ha-device-picker
          class="source-device"
          .hass=${this.hass}
          .value=${source.device_id ?? ""}
          .index=${index}
          .entityFilter=${this._entityFilter}
          label="MBTA Live device"
          @value-changed=${this._onDevicePicked}
        ></ha-device-picker>
        <ha-textfield
          class="source-label"
          label="Label (optional)"
          .value=${source.label ?? ""}
          .index=${index}
          @change=${this._onSourceLabelChanged}
        ></ha-textfield>
        <button class="remove-source" .index=${index} @click=${this._removeSource} title="Remove source">
          Remove
        </button>
      </div>
    `;
  }

  private _updateConfig(patch: Partial<CardConfig>): void {
    this._config = { ...this._config, ...patch };
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })
    );
  }

  private _updateSource(index: number, patch: Partial<SourceConfig>): void {
    const sources = [...(this._config.sources ?? [])];
    sources[index] = { ...sources[index], ...patch };
    this._updateConfig({ sources });
  }

  private _onTitleChanged = (ev: Event): void => {
    const value = (ev.target as HTMLInputElement).value;
    this._updateConfig({ title: value || undefined });
  };

  private _onMaxTripsChanged = (ev: Event): void => {
    const value = Number((ev.target as HTMLInputElement).value);
    this._updateConfig({ max_trips: Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_TRIPS });
  };

  private _onShowAlertsChanged = (ev: Event): void => {
    const checked = (ev.target as HTMLInputElement).checked;
    this._updateConfig({ show_alerts: checked });
  };

  private _onFieldToggled = (ev: Event): void => {
    const target = ev.target as HTMLInputElement & { fieldKey: string };
    const current = this._config.fields ?? DEFAULT_FIELDS;
    const fields = target.checked
      ? [...current.filter((f) => f !== target.fieldKey), target.fieldKey]
      : current.filter((f) => f !== target.fieldKey);
    this._updateConfig({ fields });
  };

  private _addSource = (): void => {
    const sources = [...(this._config.sources ?? []), {}];
    this._updateConfig({ sources });
  };

  private _removeSource = (ev: Event): void => {
    const index = (ev.currentTarget as IndexedTarget).index;
    const sources = (this._config.sources ?? []).filter((_, i) => i !== index);
    this._updateConfig({ sources });
  };

  private _onSourceLabelChanged = (ev: Event): void => {
    const index = (ev.currentTarget as IndexedTarget).index;
    const value = (ev.target as HTMLInputElement).value;
    this._updateSource(index, { label: value || undefined });
  };

  private _onDevicePicked = (ev: CustomEvent<{ value: string }>): void => {
    const index = (ev.currentTarget as IndexedTarget).index;
    const deviceId = ev.detail.value;
    const source = (this._config.sources ?? [])[index];
    this._updateSource(index, {
      device_id: deviceId || undefined,
      label: source?.label ?? (deviceId ? deviceDisplayName(deviceId, this.hass) : undefined),
    });
  };

  static styles = css`
    :host {
      display: block;
    }
    .section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 0;
      border-top: 1px solid var(--divider-color);
    }
    .section:first-child {
      border-top: none;
    }
    .section-title {
      font-weight: 500;
      color: var(--primary-text-color);
    }
    .hint {
      font-size: 0.85em;
      color: var(--secondary-text-color);
    }
    .fields-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    }
    .source {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      margin-bottom: 8px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
    }
    .source-device {
      flex: 2;
    }
    .source-label {
      flex: 1;
    }
    .remove-source {
      background: none;
      border: none;
      color: var(--error-color, #db4437);
      cursor: pointer;
      font: inherit;
      padding: 4px 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mbta-live-card-editor": MbtaLiveCardEditor;
  }
}
