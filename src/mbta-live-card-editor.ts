import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DEFAULT_FIELDS, DEFAULT_MAX_TRIPS } from "./const";
import { FIELD_REGISTRY } from "./fields";
import { deviceDisplayName, isMbtaLiveEntityId, suggestEntitiesForDevice } from "./suggest";
import { CardConfig, HomeAssistant, SourceConfig } from "./types";

interface IndexedTarget extends HTMLElement {
  index: number;
}

// HA's picker components (ha-device-picker, ha-entity-picker, ...) call this
// with either a full state object or a bare entity id depending on frontend
// version — handle both so filtering keeps working either way.
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
          One source per MBTA Live device (each of your depart→arrive stop pairs). Pick a device and its trip
          sensors are added automatically.
        </div>
        ${sources.map((source, index) => this._renderSource(source, index))}
        <ha-button @click=${this._addSource}>+ Add source</ha-button>
      </div>
    `;
  }

  private _renderSource(source: SourceConfig, index: number) {
    const entities = source.entities ?? [];
    return html`
      <div class="source">
        <div class="source-row">
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
        <ha-device-picker
          .hass=${this.hass}
          .value=${source.device_id ?? ""}
          .index=${index}
          .entityFilter=${this._entityFilter}
          label="MBTA Live device"
          @value-changed=${this._onDevicePicked}
        ></ha-device-picker>

        ${entities.length > 0
          ? html`
              <div class="entity-chips">
                ${entities.map(
                  (entityId, entityIndex) => html`
                    <span class="chip">
                      ${this._entityLabel(entityId)}
                      <button
                        class="chip-remove"
                        .index=${index}
                        .entityIndex=${entityIndex}
                        @click=${this._removeEntity}
                        title="Remove entity"
                      >
                        ✕
                      </button>
                    </span>
                  `
                )}
              </div>
            `
          : html`<div class="hint">No entities yet — pick a device above, or add one manually below.</div>`}

        <ha-entity-picker
          .hass=${this.hass}
          .index=${index}
          .entityFilter=${this._entityFilter}
          label="Add entity manually"
          @value-changed=${this._onEntityAdded}
        ></ha-entity-picker>
      </div>
    `;
  }

  private _entityLabel(entityId: string): string {
    return this.hass?.states?.[entityId]?.attributes?.friendly_name ?? entityId;
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
    const sources = [...(this._config.sources ?? []), { entities: [] }];
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
    if (!deviceId) {
      this._updateSource(index, { device_id: undefined });
      return;
    }
    const suggested = suggestEntitiesForDevice(deviceId, this.hass);
    const source = (this._config.sources ?? [])[index];
    this._updateSource(index, {
      device_id: deviceId,
      entities: suggested,
      label: source?.label ?? deviceDisplayName(deviceId, this.hass),
    });
  };

  private _onEntityAdded = (ev: CustomEvent<{ value: string }>): void => {
    const target = ev.currentTarget as IndexedTarget & { value?: string };
    const entityId = ev.detail.value;
    if (!entityId) return;
    const source = (this._config.sources ?? [])[target.index];
    if (!source || (source.entities ?? []).includes(entityId)) return;
    this._updateSource(target.index, { entities: [...(source.entities ?? []), entityId] });
    target.value = "";
  };

  private _removeEntity = (ev: Event): void => {
    const target = ev.currentTarget as IndexedTarget & { entityIndex: number };
    const source = (this._config.sources ?? [])[target.index];
    if (!source) return;
    const entities = source.entities.filter((_, i) => i !== target.entityIndex);
    this._updateSource(target.index, { entities });
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
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      margin-bottom: 8px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
    }
    .source-row {
      display: flex;
      align-items: center;
      gap: 8px;
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
    .entity-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--secondary-background-color, #eee);
      border-radius: 12px;
      padding: 2px 4px 2px 10px;
      font-size: 0.85em;
    }
    .chip-remove {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--secondary-text-color);
      font: inherit;
      line-height: 1;
      padding: 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mbta-live-card-editor": MbtaLiveCardEditor;
  }
}
