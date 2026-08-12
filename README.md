# MBTA Live Card

A [Home Assistant](https://www.home-assistant.io/) Lovelace card for the
[MBTA Live](https://github.com/chiabre/MBTALive) integration.

MBTA Live creates a separate device (with its own sensors) for every
depart→arrive stop pair you configure. If you use more than one nearby
station — e.g. two stops you could walk to on your way to work — there's no
single view showing "the next trains I can actually catch." This card fixes
that: point it at the sensors from two or more MBTA Live devices, and it
merges them into one list, sorted by actual departure time, showing however
many trips you want.

## Installation

### HACS

1. In HACS, add this repository as a custom repository (category:
   *Dashboard*): `https://github.com/kbirger/mbta-live-card`.
2. Install "MBTA Live Card".
3. Add `/hacsfiles/mbta-live-card/mbta-live-card.js` as a Lovelace resource
   (HACS does this automatically for most setups).

### Manual

1. Download `mbta-live-card.js` from the
   [latest release](https://github.com/kbirger/mbta-live-card/releases).
2. Copy it into your `config/www/` folder.
3. Add it as a Lovelace resource:
   ```yaml
   url: /local/mbta-live-card.js
   type: module
   ```

## Configuration

The card has a GUI editor — add it from the card picker (or add a manual
card with `type: custom:mbta-live-card`), then for each source use the
**MBTA Live device** picker to pick one of your depart→arrive stop pairs.
That's it — MBTA Live already creates an entity for every field the card
knows how to show, so a source is just a device reference; the card resolves
that device's "Upcoming"/"Following" sensors (the two that carry a full
trip's times, delay, platform, and status) itself, every time it renders.

Editing YAML directly uses the same schema:

```yaml
type: custom:mbta-live-card
title: My Commute
max_trips: 2
fields:
  - line
  - to
  - departure_time_to
  - departure_delay
sources:
  - label: Station A
    device_id: 3f6e8a1c9b2d4e5f6a7b8c9d0e1f2a3b
  - label: Station B
    device_id: 7a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d
show_alerts: true
```

Find a device's id in its URL under Settings → Devices & Services → MBTA
Live → your device (`/config/devices/device/<device_id>`) — or just use the
GUI editor's device picker, which fills it in for you.

### Options

| Name          | Type    | Default                                             | Description                                                                 |
| ------------- | ------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| `title`       | string  | none                                                  | Card header.                                                                   |
| `max_trips`   | number  | `2`                                                    | How many combined, soonest-first trips to show.                              |
| `fields`      | list    | `[line, to, departure_time_to, departure_delay]`      | Ordered list of fields to render per trip (see below).                       |
| `sources`     | list    | `[]`                                                    | One entry per MBTA Live device: `label` (optional) and `device_id` (the MBTA Live device to pull trips from). |
| `show_alerts` | boolean | `true`                                                 | Show a trip's alerts, if any.                                                |

### Available `fields`

`state` (departure countdown headline), `from`, `to`, `line`, `type`,
`headsign`, `duration`, `train`, `status`, `departure_platform`,
`departure_time`, `departure_time_to`, `departure_delay`,
`arrival_countdown`, `arrival_platform`, `arrival_time`, `arrival_time_to`,
`arrival_delay`.

## How trips are combined

For every source's `device_id`, the card looks up that device's
"Upcoming"/"Following" sensor entities in the entity registry, reads their
current state and attributes, skips anything `unavailable`/`unknown`, and
sorts everything that's left by the trip's actual `departure_time` (not the
pre-formatted countdown text) — so trips from different stations interleave
correctly. The soonest `max_trips` trips are then rendered.

This does mean the card needs those two sensors to exist with their default
entity IDs (ending in `_upcoming`/`_following`) — if you've manually renamed
one of them in Home Assistant, rename its entity ID back (or disable/re-add
it) so the card can find it again.

## Development

```sh
npm install
npm run typecheck
npm run build   # outputs dist/mbta-live-card.js
npm run watch   # rebuild on change
```

Releases are built and attached to GitHub Releases automatically by
`.github/workflows/release.yml` whenever a `v*` tag is pushed.

## License

MIT
