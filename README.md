# Pings — Foundry VTT module

Click-and-hold map pings for Foundry VTT v14.

A clean-room MIT reimplementation inspired by
[Azzurite's pings module](https://gitlab.com/foundry-azzurite/pings) for
older Foundry versions. No upstream code is included.

## Features

- **5 ping kinds** via a radial menu: here, rally, alert, text, token-attach
- **Hold-and-drag gesture** — tap-and-release commits "here"; drag in 4
  directions selects rally / alert / text / token-attach. Spatial
  discrimination only, no precision-timed release window
- **Per-kind visuals**: contracting rings (here), expanding rings (rally),
  rotating red chevrons (alert), pinned text tag (text), corner brackets
  that follow the token (token-attach)
- **Bundled sounds** by Nathan Gibson (CC BY 4.0) play on every kind
- **v14 bug fix** — listener binds to `canvas.app.view`, so pointer events
  inside sheets no longer leak into a phantom ping
- **Networking** with per-sender rate limiting (3/5s, GM-exempt), scene
  filtering, and a defensive parser against malformed peer payloads
- **Public API** at `game.modules.get('pings').api`: `here / showHere /
  sendHere` plus generic `ping / showPing / sendPing(kind, position, opts)`
  and `remove`
- **Integration hooks**: `pings.preDisplay(payload)` (cancelable) and
  `pings.display(handle, payload)` for systems and modules to intercept
- **Per-scene disable** via API or scene flag for cutscenes
- **Zero runtime dependencies** — no lib-wrapper, no settings-extender

## Requirements

- Foundry VTT **v14**
- Node **≥ 24** and pnpm **10** for development

## Install

In Foundry's Module Management, paste the manifest URL:

```
https://github.com/nonex-ist/foundryvtt-pings/releases/latest/download/module.json
```

## Usage

The hold-and-drag gesture has three phases. With the default
`LeftClick` binding:

1. **Press and hold** for 350ms. If you move more than **5px** during
   this initial hold, the gesture cancels — so a normal click-drag for
   selection or panning won't trigger a ping.
2. After 350ms, a local-only **preview** ping appears at the press
   point. From here, release time is irrelevant — no precision needed.
3. **Release without dragging** → "here" ping commits and broadcasts.
   **Drag ≥25px in a cardinal direction** → the radial menu opens.
   Drag direction selects the segment; release commits the highlighted
   kind. Drag back into the deadzone before releasing to commit "here"
   instead.

Radial layout:

```
                    Rally           (north — gather everyone here)
                      |
        Token ───── [Here] ───── Alert
                      |
                     Text          (south — opens a text prompt)
```

| Gesture | Result |
|---|---|
| Tap (no drag, release after 350ms) | here ping at the spot |
| Hold → drag up → release | rally — broadcasts + pans recipients' viewports if they're Trusted+ |
| Hold → drag right → release | alert — red, larger, 10s duration. **Requires Assistant+ to send** |
| Hold → drag down → release | text — prompts for a message, then displays as a tag |
| Hold → drag left → release | token-attach — must be over a token; the ping follows it |
| Hold → drag past 25px → drag back to center → release | here (deadzone fallback) |

## Behaviour reference

### Per-kind defaults

| Kind | Color | Duration | Special |
|---|---|---|---|
| here | sender's user color | 6s | — |
| rally | sender's user color | 6s | recipients with role ≥ Trusted auto-pan to it |
| alert | red (`0xff3333`, overrides user color) | 10s | **sender** must be ≥ Assistant or the ping is refused with a notification |
| text | sender's user color (background) | 6s | prompts for text input on commit |
| token-attach | sender's user color | 4s | follows `token.center` each frame |

Color, duration, and `moveCanvas` can be overridden per-call via the
options object (see [Integration](#integration)).

### Rate limiting

Every user (except GMs) is limited to **3 pings per rolling 5-second
window** by default. The limit is enforced on both sides of the socket —
your client refuses to broadcast over the limit, and your client also
ignores inbound peers exceeding it. Removals (`api.remove`) are not
counted. Limits are world settings (capacity + window).

### Scene filter

Pings are broadcast on the `module.pings` socket scoped by scene id.
Players on different scenes never see each other's pings.

### Per-scene disable

A GM can suppress pings for the current scene:

```js
game.modules.get('pings').api.setSceneDisabled(true);   // suppress
game.modules.get('pings').api.setSceneDisabled(false);  // re-enable
game.modules.get('pings').api.isSceneDisabled();        // → boolean
```

Writes the scene flag `flags.pings.disabled`. While true, **both** local
trigger commits and inbound peer pings are silently dropped on that
scene. Switching to a scene without the flag resumes normal behaviour.

### Audio

A short ogg plays whenever a ping is displayed locally — fires for both
your own pings and pings received from peers. Wired via the
`pings.display` hook, so any third-party listener can also react.
Toggle and volume live in client settings; defaults are **on** at
**0.5 volume**. Browsers block audio until the user has interacted with
the page; pre-interaction failures are silently swallowed.

### Sheet pointer-bleed (the bug this module fixes)

Azzurite's `pings` v1.4.3 tracks "is the cursor over the canvas?" via
mouseenter/mouseleave on `#interface`, plus a window-level `mousedown`
listener. In Foundry v14, ApplicationV2 mounts sheets directly to
`document.body` as siblings of `#interface` — so cursor movement onto a
sheet never triggers `#interface.mouseleave` and the "over canvas" flag
stays true. A click inside the sheet then bubbles up to window and
fires a phantom ping.

This module binds its pointer listener to `canvas.app.view` instead.
Sheets are stacked above the canvas DOM element, so pointer events
inside a sheet never reach the trigger by construction. No workaround
needed downstream.

## Settings

All settings live under Module Configuration → Pings.

### World (GM-only)

| Setting | Default | Reactive | Notes |
|---|---|---|---|
| Rate limit — max pings per window | 3 | requires reload | per-sender capacity, GMs exempt |
| Rate limit — window (ms) | 5000 | requires reload | sliding window |
| Rally — minimum receiver role for viewport pan | Trusted | live | role threshold for the auto-pan; below this, the ping still shows but the camera doesn't move |
| Alert — minimum sender role | Assistant | live | role threshold for **sending** alert pings |

### Client (per-user)

| Setting | Default | Reactive | Notes |
|---|---|---|---|
| Trigger binding | `LeftClick` | live | examples: `LeftClick`, `Shift + LeftClick`, `MiddleClick`, `Alt + RightClick` |
| Hold duration (ms) | 350 | live | how long before the preview appears |
| Hold cancel tolerance (px) | 5 | live | drag larger than this during the initial hold cancels |
| Menu summon distance (px) | 25 | live | drag larger than this opens the radial menu; also the deadzone radius |
| Enable ping sounds | on | live | toggle the bundled audio |
| Ping sound volume | 0.5 | live | 0 = muted, 1 = full |

"Live" settings rebind without a reload. "Requires reload" settings are
snapshot into long-lived state (the rate limiter's bucket, the
role-check baked into providers) — Foundry prompts for a reload when
you change them.

Trigger binding parser accepts case-insensitive tokens separated by
`+`. Supported modifiers: `Shift`, `Ctrl`/`Control`, `Alt`/`Option`,
`Meta`/`Cmd`/`Command`/`Super`. Supported buttons: `LeftClick`,
`MiddleClick`, `RightClick`. An unparseable string falls back to
`LeftClick` with a console warning.

## Integration

```js
const api = game.modules.get('pings').api;

// Trigger pings (returns the ping id, or null if rate-limited / canceled):
api.here({ x: 1000, y: 1000 });                            // here, default
api.ping('alert', { x: 1000, y: 1000 });                   // alert (GM/Assistant)
api.ping('text', { x: 1000, y: 1000 }, { text: 'Trap' });  // text
api.ping('token-attach', { x: 1000, y: 1000 }, {
    tokenId: 't_abc'
});

// Variants:
api.showHere(pos);    // local-only, no broadcast
api.sendHere(pos);    // broadcast only, no local display
api.remove(id);       // dispose + broadcast removal
api.remove(id, { broadcast: false });  // local only

// Options for every kind:
//   color: 0xRRGGBB (integer 0..0xffffff). Defaults to user color, or red for alert
//   durationMs: positive integer. Defaults to the kind's spec value
//   moveCanvas: boolean. Defaults true for rally, false otherwise
//   text: required for kind 'text'
//   tokenId: required for kind 'token-attach'

// Suppress pings (e.g. during a cutscene):
Hooks.on('pings.preDisplay', (payload) => myCutsceneActive ? false : true);

// React to every displayed ping (local + inbound):
Hooks.on('pings.display', (handle, payload) => {
    console.log('Ping displayed', payload.kind, payload.senderId);
});

// Discover when the API is ready (fires once at game ready):
Hooks.on('pingsReady', (api) => { /* ... */ });
```

### Payload shape

Both hooks receive the wire payload:

```ts
type DisplayPingPayload = {
    id: string;            // foundry.utils.randomID()
    sceneId: string;       // scene this ping belongs to
    senderId: string;      // user id of the original sender
    kind: 'here' | 'rally' | 'alert' | 'text' | 'token-attach';
    position: { x: number; y: number };  // world coords
    color: number;         // hex int
    durationMs?: number;   // overrides per-kind default if set
    moveCanvas: boolean;
    text?: string;         // set for 'text'
    tokenId?: string;      // set for 'token-attach'
};
```

`pings.preDisplay` is **cancelable** — return `false` from any handler
to drop the ping entirely (no local render, no broadcast for
locally-initiated; no local render for inbound). `pings.display` is
fire-and-forget.

## Development

```bash
pnpm install        # also wires husky git hooks
pnpm run build      # bundle src/module/pings.ts -> src/module/pings.js
pnpm run watch      # esbuild watch mode
pnpm run check      # lint + typecheck + tests (CI gate)
task foundry:start  # boot a containerized v14 instance
```

The bundled output lands **inside `src/`** (`src/module/pings.js`) — Foundry
loads the contents of `src/` as the module root, so the manifest references
relative paths like `module/pings.js` and `lang/en.json`. Do not delete
`src/module/pings.js` between builds; use `pnpm run clean` for a full reset.

## Layout

```
src/
  module.json        # Foundry v14 module manifest
  module/            # TypeScript source, bundled to module/pings.js
  lang/en.json       # i18n strings
  css/pings.css      # radial menu styles
  sounds/            # bundled audio (CC BY 4.0)
types/foundry.d.ts   # minimal Foundry + PIXI ambient stubs
```

## Commits

Conventional Commits are enforced by a `commit-msg` hook. AI-assistant
`Co-Authored-By` / "Generated with" trailers are rejected — strip them
before committing.

## Attribution

See [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) for the bundled sound credits.

## License

[MIT](./LICENSE) (code). Sound assets retain their own licenses — see
ATTRIBUTIONS.md.
