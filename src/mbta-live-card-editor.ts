import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DEFAULT_FIELDS, DEFAULT_MAX_TRIPS } from "./const";
import { FIELD_REGISTRY } from "./fields";
import { deviceDisplayName } from "./suggest";
import { CardConfig, HomeAssistant, SourceConfig } from "./types";

interface IndexedTarget extends HTMLElement {
  index: number;
}

// A device selector, scoped to MBTA Live's integration domain (see
// manifest.json: "domain": "mbtalive"). We use <ha-selector> here rather
// than <ha-device-picker> directly because ha-selector lazily imports
// whichever concrete picker it needs itself — <ha-device-picker> isn't
// guaranteed to already be loaded just from opening a dashboard's edit
// mode, and rendering it before its module loads shows up as a blank row.
const DEVICE_SELECTOR = { device: { filter: { integration: "mbtalive" } } };

@customElement("mbta-live-card-editor")
export class MbtaLiveCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: CardConfig;

  public setConfig(config: CardConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;

    const sources = this._config.sources ?? [];
    const fields = this._config.fields ?? DEFAULT_FIELDS;

    return html`
      <div class="section">
        <ha-textfield
          label="Title"
          .value=${this._config.title ?? ""}
          @input=${this._onTitleChanged}
        ></ha-textfield>
        <ha-textfield
          label="Max trips shown"
          type="number"
          min="1"
          .value=${String(this._config.max_trips ?? DEFAULT_MAX_TRIPS)}
          @input=${this._onMaxTripsChanged}
        ></ha-textfield>
        <ha-formfield label="Show alerts">
          <ha-switch .checked=${this._config.show_alerts ?? true} @change=${this._onShowAlertsChanged}></ha-switch>
        </ha-formfield>
      </div>

      <div class="section">
        <div class="section-title">Fields to display</div>
        <div class="hint">Shown in this order on the card.</div>
        <div class="field-list">
          ${fields.map((key, index) => this._renderSelectedField(key, index, fields.length))}
        </div>
        ${this._renderAvailableFields(fields)}
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

  private _renderSelectedField(key: string, index: number, count: number) {
    const field = FIELD_REGISTRY[key];
    if (!field) return nothing;
    return html`
      <div class="field-row">
        <span class="field-label">${field.label}</span>
        <button
          .index=${index}
          @click=${this._onMoveFieldUp}
          ?disabled=${index === 0}
          title="Move up"
        >
          ↑
        </button>
        <button
          .index=${index}
          @click=${this._onMoveFieldDown}
          ?disabled=${index === count - 1}
          title="Move down"
        >
          ↓
        </button>
        <button class="remove-field" .index=${index} @click=${this._onRemoveField} title="Remove field">✕</button>
      </div>
    `;
  }

  private _renderAvailableFields(selected: string[]) {
    const available = Object.values(FIELD_REGISTRY).filter((field) => !selected.includes(field.key));
    if (!available.length) return nothing;
    return html`
      <div class="hint">Add a field:</div>
      <div class="available-fields">
        ${available.map(
          (field) => html`
            <button class="add-field" .fieldKey=${field.key} @click=${this._onAddField}>+ ${field.label}</button>
          `
        )}
      </div>
    `;
  }

  private _renderSource(source: SourceConfig, index: number) {
    return html`
      <div class="source">
        <ha-selector
          class="source-device"
          .hass=${this.hass}
          .selector=${DEVICE_SELECTOR}
          .value=${source.device_id}
          .index=${index}
          label="MBTA Live device"
          @value-changed=${this._onDevicePicked}
        ></ha-selector>
        <ha-textfield
          class="source-label"
          label="Label (optional)"
          .value=${source.label ?? ""}
          .index=${index}
          @input=${this._onSourceLabelChanged}
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

  // Bound to `input` (every keystroke) rather than `change` (blur only):
  // hass updates re-render this editor often (the underlying MBTA sensors
  // poll frequently), and each re-render reapplies `.value` from `_config`.
  // On `change`, that reapplication happens before blur ever fires and
  // wipes whatever the user had typed, making the field look uneditable.
  private _onTitleChanged = (ev: Event): void => {
    const value = (ev.target as HTMLInputElement).value;
    this._updateConfig({ title: value || undefined });
  };

  private _onMaxTripsChanged = (ev: Event): void => {
    const raw = (ev.target as HTMLInputElement).value;
    if (raw === "") return; // let the field stay empty mid-edit instead of snapping back
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) {
      this._updateConfig({ max_trips: value });
    }
  };

  private _onShowAlertsChanged = (ev: Event): void => {
    const checked = (ev.target as HTMLInputElement).checked;
    this._updateConfig({ show_alerts: checked });
  };

  private _onAddField = (ev: Event): void => {
    const target = ev.currentTarget as HTMLElement & { fieldKey: string };
    const current = this._config.fields ?? DEFAULT_FIELDS;
    if (current.includes(target.fieldKey)) return;
    this._updateConfig({ fields: [...current, target.fieldKey] });
  };

  private _onRemoveField = (ev: Event): void => {
    const index = (ev.currentTarget as IndexedTarget).index;
    const current = this._config.fields ?? DEFAULT_FIELDS;
    this._updateConfig({ fields: current.filter((_, i) => i !== index) });
  };

  private _onMoveFieldUp = (ev: Event): void => {
    this._moveField((ev.currentTarget as IndexedTarget).index, -1);
  };

  private _onMoveFieldDown = (ev: Event): void => {
    this._moveField((ev.currentTarget as IndexedTarget).index, 1);
  };

  private _moveField(index: number, delta: number): void {
    const fields = [...(this._config.fields ?? DEFAULT_FIELDS)];
    const target = index + delta;
    if (target < 0 || target >= fields.length) return;
    [fields[index], fields[target]] = [fields[target], fields[index]];
    this._updateConfig({ fields });
  }

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
    // Re-derive the label from the newly picked device every time, rather
    // than keeping whatever was stored: a label carried over from a
    // previously picked device would silently go stale and mismatch the
    // device the trip actually links to when clicked.
    this._updateSource(index, {
      device_id: deviceId || undefined,
      label: deviceId ? deviceDisplayName(deviceId, this.hass) : source?.label,
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
    .field-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .field-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border: 1px solid var(--divider-color);
      border-radius: 6px;
    }
    .field-label {
      flex: 1;
    }
    .field-row button,
    .add-field {
      background: none;
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      color: var(--primary-text-color);
      cursor: pointer;
      font: inherit;
      padding: 2px 8px;
    }
    .field-row button:disabled {
      opacity: 0.3;
      cursor: default;
    }
    .remove-field {
      color: var(--error-color, #db4437);
    }
    .available-fields {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
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
