# Benelux Weather for Gladys Assistant

**Benelux Weather** (_Météo Bénélux_) is a Gladys Assistant external integration of type `weather`. It provides current conditions, hourly and daily forecasts, and weather warnings from the Royal Meteorological Institute of Belgium (IRM/KMI) for locations in Belgium, Luxembourg and the Netherlands.[1] [2] Once installed, it replaces the built-in OpenWeather service for the dashboard weather widget, the chat assistant and weather-alert scenes, with no configuration.

> This integration relies on an undocumented IRM/KMI mobile API. It is not affiliated with, sponsored or endorsed by the Royal Meteorological Institute of Belgium, and the API may change without notice.[2]

| Capability         | Details                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| Current conditions | Temperature, sky condition, pressure, wind, gusts and UV index when available.                        |
| Hourly forecasts   | Up to 24 entries with temperature, precipitation, precipitation probability, wind and pressure.       |
| Daily forecasts    | Up to 8 days with minimum and maximum temperatures, sky condition, precipitation, wind and sun times. |
| Warnings           | Type, severity, validity period and IRM/KMI message, in the user's language.                          |
| Units              | Metric (°C, m/s, hPa, mm) or US (°F, mph, in), following the preference sent by Gladys.               |
| Languages          | English, French, Dutch, German and Spanish (interface, documentation and messages).                   |

## Configuration

No account, API key or personal data is needed: Gladys sends the latitude and longitude of the requested location with every request. The only setting is the cache duration, which limits repeated calls to the remote service.

| Field              |     Default |       Range | Effect                                                                                         |
| ------------------ | ----------: | ----------: | ---------------------------------------------------------------------------------------------- |
| **Cache duration** | 600 seconds | 0 – 3,600 s | Reuses the same response for an identical location, language and unit system. `0` disables it. |

User documentation: [English](docs/en.md) · [Français](docs/fr.md) · [Nederlands](docs/nl.md) · [Deutsch](docs/de.md) · [Español](docs/es.md).

## How it works

For each request, the integration rounds the coordinates to six decimals, computes the daily key expected by the IRM/KMI service and calls `getForecasts`.[4] The response is converted to the Gladys pivot weather format (contract B.18 of the SDK):

- **Units.** IRM/KMI sends metric data with wind in km/h. Wind is converted to m/s for metric users, as the contract requires, and temperatures, wind and precipitation are converted when Gladys asks for US units.
- **Conditions.** IRM/KMI condition codes are mapped explicitly to the SDK `WEATHER_CONDITIONS` (codes 0–1 clear, 11–12 and 22–23 snow, 24–27 fog…). The day/night marker is carried by `is_day`, so a rainy night stays `rain`.
- **Warnings.** IRM/KMI levels 1, 2 and 3 become the `minor`, `moderate` and `severe` severities, with a phenomenon type from `WEATHER_ALERT_TYPES`. At most 10 warnings are sent, the number Gladys keeps.
- **Languages.** The language sent by Gladys is normalized (`nl-BE` → `nl`); unsupported languages fall back to English. IRM/KMI publishes its texts in French, Dutch, English and German only, so Spanish users get the provider's warning texts in English, while the integration's own texts exist in all five languages.
- **Cache.** Responses are cached in memory per location, language and unit system; the cache is cleared whenever the configuration changes.

The architecture is described in [ARCHITECTURE.md](ARCHITECTURE.md) (in French).

## Known limitations

The API does not provide humidity or dew point, so the integration does not invent these values. A daily forecast may hold two conditions for the same day; only the first is published, as the Gladys model allows one. Rain-radar animation and pollen are out of scope for now.[1] [2]

## Development

The project follows the [official Gladys JavaScript integration template][3] and uses [`@gladysassistant/integration-sdk`][5] 0.16, its only runtime dependency. Node.js 22 or later is required; the Docker image ships Node.js 24.

```bash
npm ci
npm test              # node --test, the built-in runner
npm run lint          # ESLint
npm run format:check  # Prettier
```

| Path                                 | Role                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `index.js`                           | Bootstrap: creates the SDK client, registers the handlers, connects.    |
| `src/app.js`                         | SDK wiring: weather requests, configuration updates, connection status. |
| `src/irm-kmi-api.js`                 | Signed HTTPS client of the IRM/KMI mobile API.                          |
| `src/forecast.js`                    | IRM/KMI payload → Gladys pivot weather format.                          |
| `src/conditions.js`, `src/alerts.js` | Condition codes and warnings mapping.                                   |
| `src/i18n.js`                        | Supported languages and the integration's own messages.                 |
| `src/forecast-cache.js`              | In-memory forecast cache.                                               |
| `gladys-assistant-integration.json`  | Integration manifest.                                                   |

Tests never touch the network. They cover the SDK wiring against the SDK's fake Gladys (`@gladysassistant/integration-sdk/testing`), manifest consistency, translations, the release scripts, a sample IRM/KMI response, unit conversions, request signing, warnings, the cache and configuration validation.

## Releasing

Run **Actions → Release** on GitHub and pick `patch`, `minor` or `major`. The workflow bumps `package.json` and the manifest (`version` and `docker_image`), moves the `## [Unreleased]` section of [CHANGELOG.md](CHANGELOG.md) under the new version, tags the commit, publishes the multi-architecture image (`linux/amd64`, `linux/arm64`) to GitHub Container Registry and creates the GitHub Release. Never edit versions by hand; record every user-visible change under `## [Unreleased]`.

The `gladys-assistant-integration` GitHub topic lets Gladys index the integration.[3]

## License

Apache-2.0, like the Gladys template this project starts from.

## References

[1]: https://github.com/jdejaegh/irm-kmi-ha 'IRM/KMI integration for Home Assistant'
[2]: https://github.com/jdejaegh/irm-kmi-api 'IRM/KMI Python client'
[3]: https://github.com/GladysAssistant/integration-template-js 'Official Gladys JavaScript integration template'
[4]: https://github.com/jdejaegh/irm-kmi-api/blob/main/irm_kmi_api/api.py 'IRM/KMI protocol implementation'
[5]: https://github.com/GladysAssistant/integration-sdk-js 'Gladys integration SDK for JavaScript'
