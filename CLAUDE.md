# CLAUDE.md

Project rules for coding assistants (Claude Code reads this file) and for human
contributors.

## What this is

**Météo Bénélux**, a Gladys Assistant **external integration** of manifest
`type: "weather"`: a Node.js service (Node 22+, ESM, no build step) that runs in
its own sandboxed Docker container and answers the core's weather requests with
IRM/KMI data, through
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js),
its only runtime dependency. It follows the official JavaScript template.

## Commands

```bash
npm install
npm test                                  # node --test, the built-in runner
node --test test/app.test.js              # one file
npm run lint                              # ESLint
npm run format:check                      # Prettier, as the CI runs it
npm run format                            # Prettier, fix in place
npx github:GladysAssistant/integration-store .   # store admission checks
```

The CI (`.github/workflows/ci.yml`) runs `format:check`, `lint` and `test` on
Node 22 and 24, and builds the Docker image: run the three commands before
pushing.

## Architecture

```
index.js                          bootstrap only: new GladysIntegration(), registerHandlers, connect()
src/app.js                        SDK wiring: onWeatherGet, onConfigUpdated, connected, shutdown
src/irm-kmi-api.js                signed HTTPS client of the undocumented IRM/KMI mobile API
src/forecast.js                   IRM/KMI payload -> Gladys pivot weather format (units, hours, days)
src/conditions.js                 IRM/KMI `ww` codes -> WEATHER_CONDITIONS
src/alerts.js                     IRM/KMI warnings -> pivot alerts (severity, type, dates)
src/forecast-cache.js             in-memory cache keyed by position / language / units
src/config.js                     defaults (mirror the manifest) + normalization
gladys-assistant-integration.json manifest
docs/en.md, docs/fr.md            user documentation, re-hosted by Gladys (mandatory)
test/                             node --test; app.test.js runs against the SDK's fake Gladys
.github/scripts/release.mjs       release helpers (manifest bump, changelog), tested in test/
```

## Rules

- **Pivot weather contract (B.18).** Values follow the requested `units`:
  °C, **m/s**, hPa, mm for `metric`; °F, mph, in for `us`. IRM/KMI sends km/h:
  always convert. Use the SDK constants (`WEATHER_CONDITIONS`,
  `WEATHER_ALERT_TYPES`, `WEATHER_ALERT_SEVERITIES`, `MAX_WEATHER_*`), never
  hard-coded strings. Never invent a value the provider does not send.
- **The container rootfs is read-only.** Write only under `/data`. Never log
  tokens or keys.
- **Versions belong to the Release workflow** (Actions → Release). Never edit
  `version` in `package.json` or in the manifest, nor the `docker_image` tag,
  by hand. `test/manifest.test.js` checks they agree.
- **Changelog.** Every user-visible change adds a line under `## [Unreleased]`
  in `CHANGELOG.md` (`### Added`, `Changed`, `Fixed`, `Removed`, `Security`).
  Never write a version heading: the Release workflow moves the section.
- **Manifest.** Texts are multi-language objects `{ "en": ..., "fr": ... }`.
  The catalog `description` holds 10 to 100 characters per language. Config
  keys (`cache_duration`) are stored by users: never rename them.
- **User-facing text** is bilingual (English and French), `docs/en.md` and
  `docs/fr.md` kept in sync.
- **Style.** Prettier formats, ESLint catches mistakes. Tests never touch the
  network.
