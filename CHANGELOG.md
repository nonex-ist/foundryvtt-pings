# Changelog

All notable changes to this module are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] — 2026-07-03

### Changed

- Verified against Foundry VTT v14 build 364 — `compatibility.verified`
  bumped from `14` to `14.364`. `minimum` / `maximum` are unchanged, so
  the module still installs on any v14 build.
- Updated development tooling within existing version ranges (eslint,
  typescript-eslint, vitest, esbuild, commitlint, lint-staged). No
  runtime impact — the module still ships with zero runtime dependencies.

## [1.0.0] — 2026-06-02

First stable release.

### Changed

- **BREAKING: Module id renamed from `pings` to `nonex-ist-pings`.**
  Foundry treated this module and Azzurite's pre-v14 `pings` as the
  same package because they shared an id, prompting users to "update"
  from ours to Azzurite's (which then breaks under v14's ApplicationV2
  DOM). The new id sidesteps the collision entirely. **Existing
  installs need to be uninstalled and reinstalled** under the new id.
  The manifest URL is unchanged:
  `https://github.com/nonex-ist/foundryvtt-pings/releases/latest/download/module.json`
- API access path changed accordingly:
  `game.modules.get('nonex-ist-pings').api`. The `window.NonexIst.Pings`
  global mirror is unchanged.
- Socket channel is now `module.nonex-ist-pings` (was `module.pings`).
  v0.x ↔ v1.x clients cannot exchange pings — that's intentional, the
  whole point of the rename is to cleanly separate the two namespaces.
- Settings are stored under the new module id namespace, so v0.x
  settings will not carry over. Players will see defaults on first
  run after upgrading.
- **Integration hooks renamed** to track the new module id:
  - `pings.preDisplay` → `nonex-ist-pings.preDisplay`
  - `pings.display` → `nonex-ist-pings.display`
  - `pingsReady` → `nonex-ist-pings.ready`

  Any downstream module that subscribed via the old hook names must
  update its `Hooks.on(...)` call.
- **i18n key root renamed** from `pings.*` / `PINGS.*` to
  `nonex-ist-pings.*` / `NONEX_IST_PINGS.*`. Translators of an
  unofficial language pack need to update their key paths.
- **CSS class / variable / SVG ID prefix renamed** from `pings-*` /
  `--pings-*` to `nonex-ist-pings-*` / `--nonex-ist-pings-*`. No
  effect unless a downstream module was targeting our DOM via these
  selectors, in which case its CSS needs the same migration.
- Scene flag namespace follows the module id, so the scene-disable
  flag now lives at `flags.nonex-ist-pings.disabled` (was
  `flags.pings.disabled`).

## [0.2.1] — 2026-06-02

### Fixed

- Foundry v14's built-in long-press canvas ping (`ControlsLayer._onLongPress`,
  500ms on the token layer) is now suppressed at module init, so it no
  longer fires alongside our gesture. Symptoms before the fix: pings
  appeared twice on hold-release and the radial menu felt unresponsive
  because the native handler consumed the interaction. There is no
  built-in setting to disable the native ping, so we override the
  prototype method with a no-op before any `ControlsLayer` instance
  is constructed.

### Changed

- **Token movement is blocked while a token-attach ping is active.** A
  new `preUpdateToken` hook returns false for any `x` / `y` / `rotation`
  update targeting a token currently marked by a token-attach ping —
  the attempted move is rejected and the user (typically a GM moving
  the token themselves, or another player owner) sees a notification
  explaining why. The lock is reference-counted, so multiple
  concurrent attach pings on the same token release the lock only
  when the last marker fades.
- Preview-to-commit no longer double-renders for the "here" gesture. The
  trigger now hands the preview disposer to the commit callback, which
  keeps the preview alive when the commit is semantically the preview
  ("here" from preview-state release) and broadcasts via `sendHere`
  instead of re-rendering. Visible result: one continuous ping per
  gesture instead of a preview-then-flash sequence. Non-here kinds and
  menu-deadzone "here" still render fresh (preview was already disposed
  or is being replaced by a different visual).
- Preview is now silent. It used to fire the `pings.display` hook on
  appearance (audio played at the 350ms preview-show mark), which
  contradicted the "preview = preparing, release = ping" mental model.
  The preview now bypasses the API entirely (visual-only `createPing`,
  no hooks, no registry). Audio + display hook fire on commit. Net
  effect: hold = silent visual feedback; release = sound + broadcast.

## [0.2.0] — 2026-06-02

First release published through the signed CI pipeline. v0.1.0 was
tagged before the release workflow landed, so no GitHub Release artifact
exists for it — install URLs and integrators should target v0.2.0+.

### Added

- Release workflow (`.github/workflows/release.yml`) — on tag push,
  builds the module, stamps manifest/download URLs into `module.json`,
  generates a CycloneDX SBOM, cosign-keyless-signs every artifact,
  extracts the matching CHANGELOG section into the release notes, and
  publishes a GitHub Release with everything attached
- PR-preview workflow (`.github/workflows/pr-preview.yml`) — on every
  PR open/sync, builds a stamped preview zip, uploads it as a 14-day
  workflow artifact, and posts a sticky install-instructions comment

### Changed

- README / ATTRIBUTIONS / CHANGELOG framing tightened so it's
  unambiguous that this module is **for** Foundry v14 (Azzurite's older
  module is the inspiration, not the target). Behaviour reference
  section now cross-links from the intro

## [0.1.0] — 2026-06-02

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

- Built for Foundry v14 specifically (not a backport / not for older
  versions). Inspired by Azzurite's pre-v14 `pings` module but
  clean-room — no upstream code is reused.
