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
- **Public API** at `game.modules.get('pings').api`: `here / rally / alert /
  text / attachToToken / remove` plus generic `ping(kind, position, opts)`
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

- **Tap and release** on the canvas → "here" ping
- **Hold + drag up** → rally (recipients with Trusted+ role get a viewport pan)
- **Hold + drag right** → alert (Assistant+ only, red, longer duration)
- **Hold + drag down** → text (prompts for a message)
- **Hold + drag left** → token-attach (must be over a token; follows it)
- All defaults are configurable in Module Configuration

## Integration

```js
// Trigger pings from your own module / macro:
const api = game.modules.get('pings').api;
api.here({ x: 1000, y: 1000 });
api.ping('alert', { x: 1000, y: 1000 });
api.ping('text', { x: 1000, y: 1000 }, { text: 'Trap here' });

// Suppress pings during a cutscene:
Hooks.on('pings.preDisplay', (payload) => myCutsceneActive ? false : true);

// React to every displayed ping (local + inbound):
Hooks.on('pings.display', (handle, payload) => {
  console.log('Ping displayed', payload.kind, payload.senderId);
});
```

## Development

```bash
pnpm install      # also wires husky git hooks
pnpm run build    # bundle src/module/pings.ts -> src/module/pings.js
pnpm run watch    # esbuild watch mode
pnpm run check    # lint + typecheck + tests (CI gate)
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
