# Benelux Weather

## Overview

This integration brings Royal Meteorological Institute of Belgium (IRM/KMI) weather data to Gladys for supported locations in Belgium, Luxembourg and the Netherlands.[1] Gladys supplies the requested location, so you do not need to configure a town, station or API key.

> IRM/KMI does not publish official documentation for the mobile API used here. Its behaviour may change without notice; if the provider becomes unavailable, the integration records a clear error in its logs.[2]

| Available data     | Display in Gladys                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Current conditions | Temperature, sky condition, pressure, wind, gust and UV index whenever the provider sends them. |
| Hourly forecasts   | Up to 24 temperature, precipitation, precipitation-probability, wind and pressure entries.      |
| Daily forecasts    | Up to 8 full days with minimum and maximum temperatures, precipitation, wind and solar times.   |
| Warnings           | Wind, rain, snow/ice, thunderstorm, fog, cold, heat and coastal warnings when available.        |

## Installation

Install the integration from the Gladys catalog once its Docker image has been published. If you install the repository manually, first build an image compatible with your server architecture, then reference that image in the integration manifest.

The project is based on Gladys’ official integration template. If you publish your own copy, point both `docker_image` and `cover_image` of `gladys-assistant-integration.json` at your GitHub repository. The supplied release workflow builds a multi-architecture image for every version.[3]

## Configuration

No personal information is needed. The optional **Cache duration** setting defaults to 600 seconds. It controls how long a downloaded forecast can be reused for the same location and unit system. Set it to `0` to disable the cache; doing so increases calls to the IRM/KMI service.

|          Value | Recommended use                                                                   |
| -------------: | --------------------------------------------------------------------------------- |
|            `0` | Occasional troubleshooting or an exceptional need to force every network request. |
| `300` to `900` | Normal use; reduces calls without making forecasts stale.                         |
|         `3600` | Only for installations that request the same location very frequently.            |

## How it works and units

Gladys sends a request with latitude, longitude, language and the user’s preferred units. The integration rounds the coordinates, queries the IRM/KMI API and returns the result in Gladys’ standard weather format. Source data is metric; wind is returned in metres per second for metric users, and values are converted to Fahrenheit, miles per hour and inches whenever Gladys requests US units.[4]

Warnings are shown in the user’s language when IRM/KMI provides it (English, French, Dutch or German), otherwise in English. IRM/KMI warning levels 1, 2 and 3 are represented by `minor`, `moderate` and `severe` severities. Warnings lacking a dependable type or severity are deliberately omitted to avoid ambiguous notifications.

## Limitations

The reference API does not expose humidity or dew-point data, so those values are not displayed. A daily forecast can contain two conditions; only the first is retained. Rain-radar animation and pollen information are outside this version because Gladys’ main weather interface does not convey them in an appropriate form.[1] [2]

## Troubleshooting

If no forecast is displayed, first confirm that the Gladys location falls within the supported Benelux area. Then check the integration logs: an unsuccessful HTTP response, invalid response or timeout is explicitly recorded. A temporary provider outage can be addressed by retrying later; increasing the cache duration can also reduce failures from repeated requests.

## References

[1]: https://github.com/jdejaegh/irm-kmi-ha 'IRM/KMI integration for Home Assistant'
[2]: https://github.com/jdejaegh/irm-kmi-api 'IRM/KMI Python client'
[3]: https://github.com/GladysAssistant/integration-template-js 'Official Gladys JavaScript integration template'
[4]: https://github.com/jdejaegh/irm-kmi-api/blob/main/irm_kmi_api/api.py 'IRM/KMI protocol implementation'
