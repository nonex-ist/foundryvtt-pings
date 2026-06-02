# Changelog

All notable changes to this module are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0]

First release. Click-and-hold map pings for Foundry VTT v14, fixing the
sheet pointer-bleed bug that Azzurite's older `pings` module exhibits
under v14 ApplicationV2.

### Added

- **5 ping kinds** via radial menu: here, rally, alert, text, token-attach.
  Each has its own visual and behavior.
  - here: contracting concentric rings, ambient
  - rally: expanding rings + receiver-side viewport pan (role-gated)
  - alert: rotating red chevrons, 10s duration, Assistant+ sender gate
  - text: rounded tag holding arbitrary message
  - token-attach: corner brackets that follow a token's center
- **Hold-and-drag gesture**: 350ms hold → preview; release commits "here",
  drag ≥25px opens the radial menu. Spatial discrimination only (no
  release-time window) — accessibility-friendly.
- **Public API** at `game.modules.get('pings').api` and
  `window.NonexIst.Pings`: `here / showHere / sendHere`, generic
  `ping / showPing / sendPing(kind, position, opts)`, `remove(id)`,
  `setSceneDisabled(value)`, `isSceneDisabled()`.
- **Integration hooks**: `pings.preDisplay(payload)` (cancelable via
  return false) and `pings.display(handle, payload)`. `pingsReady` fires
  once at ready with the api object.
- **Networking**: `module.pings` socket, scene-filtered, per-sender
  sliding-window rate limit (3/5s, GM bypass), defensive payload parser.
- **Audio**: 5 bundled sounds by Nathan Gibson (CC BY 4.0) play on
  `pings.display`. Toggle + volume in client settings.
- **Game settings** (10): rate-limit capacity + window (world), role
  thresholds for rally and alert (world), trigger binding + hold/menu
  thresholds (client), audio enable + volume (client). Trigger and audio
  reconfigure live on change; rate-limit and roles require reload.
- **Per-scene disable** via `api.setSceneDisabled(true)` or the scene
  flag `flags.pings.disabled`. Suppresses both local-initiated and
  inbound pings while the flag is set.
- **v14 bug fix**: input listener binds to `canvas.app.view` rather than
  `window`, so pointer events that originate inside sheets never reach
  the trigger. This is the original motivation for the rewrite.
- **Zero runtime dependencies** — no lib-wrapper, no settings-extender.

### Notes

- Built clean-room. Inspired by Azzurite's `pings` module (older Foundry
  versions); no upstream code is reused.
- Compatible with Foundry v14 only.
