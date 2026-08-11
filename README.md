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

Each `sources` entry corresponds to one MBTA Live device (one depart→arrive
pair). Point it at that device's **Upcoming** and **Following** sensors —
those two carry the full set of trip attributes (times, delay, platform,
status, etc.) for trip 1 and trip 2 at that stop pair. Find their entity IDs
under Settings → Devices & Services → MBTA Live → your device.

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
    entities:
      - sensor.mbta_station_a_to_downtown_upcoming
      - sensor.mbta_station_a_to_downtown_following
  - label: Station B
    entities:
      - sensor.mbta_station_b_to_downtown_upcoming
      - sensor.mbta_station_b_to_downtown_following
show_alerts: true
```

### Options

| Name          | Type    | Default                                             | Description                                                                 |
| ------------- | ------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| `title`       | string  | none                                                  | Card header.                                                                   |
| `max_trips`   | number  | `2`                                                    | How many combined, soonest-first trips to show.                              |
| `fields`      | list    | `[line, to, departure_time_to, departure_delay]`      | Ordered list of fields to render per trip (see below).                       |
| `sources`     | list    | *required*                                             | One entry per MBTA Live device. Each has `label` (optional) and `entities` (required list of entity IDs). |
| `show_alerts` | boolean | `true`                                                 | Show a trip's alerts, if any.                                                |

### Available `fields`

`state` (departure countdown headline), `from`, `to`, `line`, `type`,
`headsign`, `duration`, `train`, `status`, `departure_platform`,
`departure_time`, `departure_time_to`, `departure_delay`,
`arrival_countdown`, `arrival_platform`, `arrival_time`, `arrival_time_to`,
`arrival_delay`.

## How trips are combined

For every entity listed under every source, the card reads its current state
and attributes, skips anything `unavailable`/`unknown`, and sorts everything
that's left by the trip's actual `departure_time` (not the pre-formatted
countdown text) — so trips from different stations interleave correctly.
The soonest `max_trips` trips are then rendered.

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
