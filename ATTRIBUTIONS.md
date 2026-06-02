# Attributions

## Bundled sounds (`src/sounds/`)

The five short Ogg Vorbis clips that ship with the module are placeholder
sounds synthesized from sine and square waves with ffmpeg (`libvorbis`,
quality 2). They are original output and covered by the project's MIT
license — no third-party audio is included.

| File | Source | Notes |
|---|---|---|
| `here.ogg` | 600 Hz sine, ~180ms, soft envelope | quiet blip |
| `rally.ogg` | 500 Hz → 750 Hz sine pair, ~320ms | ascending call |
| `alert.ogg` | 900 Hz square, ~220ms | harsh attention-grabber |
| `text.ogg` | 820 Hz sine, ~300ms with long decay | gentle notification |
| `token-attach.ogg` | 450 Hz sine, ~100ms | subtle tap |

These are placeholders for v0.1 — they read as functional but utilitarian.
A future release may replace them with curated CC0 audio (e.g. from
[Kenney](https://kenney.nl/assets/category:Audio)). Any swap-in must
remain CC0 / MIT-compatible.

## Inspiration

The user-facing concept (click-and-hold map pings) is inspired by
[Azzurite's `pings` module](https://gitlab.com/foundry-azzurite/pings)
for older Foundry versions. This is a clean-room reimplementation — no
upstream code is reused.
