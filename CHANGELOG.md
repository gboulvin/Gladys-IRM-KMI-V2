# Changelog

All notable changes to this integration are documented in this file. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project uses [semantic versioning](https://semver.org/).

## [Unreleased]

## [1.1.0] - 2026-10-14

### Added

- Dutch, German and Spanish translations of the catalog card, the
  configuration screen, the integration messages and the user documentation
  (`docs/nl.md`, `docs/de.md`, `docs/es.md`).

### Changed

- The README is now written in English.
- Upgrade to `@gladysassistant/integration-sdk` 0.15: weather conditions, alert
  types, severities and pivot bounds now come from the SDK constants.
- Node.js 22 or later is required (the Docker image ships Node 24).
- Project tooling realigned on the official JavaScript template: CI on Node 22
  and 24 with a Docker build check, Dependabot, a `CHANGELOG.md`-driven release
  and automatic GitHub Releases.

### Fixed

- Wind speed and gusts are now sent in m/s for metric users, as the Gladys
  weather contract requires (they were sent in km/h, 3.6 times too high).
- Spanish and other languages IRM/KMI does not publish now fall back to English
  instead of French, and regional codes such as `nl-BE` are recognized.
- The fallback name of an unnamed warning is translated.
- At most 10 weather alerts are sent, the number Gladys keeps.
- The `/data` volume is now owned by the unprivileged `node` user in the image.

## [1.0.3] - 2026-08-14

### Changed

- Update the integration for Gladys 4.86 (catalog `categories`).

[Unreleased]: https://github.com/gboulvin/Gladys-IRM-KMI-V2/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/gboulvin/Gladys-IRM-KMI-V2/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/gboulvin/Gladys-IRM-KMI-V2/compare/v1.0.2...v1.0.3
