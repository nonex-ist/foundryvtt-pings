# Pings — Foundry VTT module

Click-and-hold map pings for Foundry VTT v14.

A clean-room MIT reimplementation inspired by
[Azzurite's pings module](https://gitlab.com/foundry-azzurite/pings) for
older Foundry versions. No upstream code is included.

> **Status:** scaffold only. The lifecycle hooks load cleanly but no ping
> behaviour is wired yet.

## Requirements

- Foundry VTT **v14**
- Node **≥ 24** and pnpm **10** for development

## Development

```bash
pnpm install      # also wires husky git hooks
pnpm run build    # bundle src/module/pings.ts -> src/module/pings.js
pnpm run watch    # esbuild watch mode
pnpm run check    # lint + typecheck + tests (CI gate)
```

The bundled output lands **inside `src/`** (`src/module/pings.js`) — Foundry
loads the contents of `src/` as the module root, so the manifest references
relative paths like `module/pings.js` and `lang/en.json`. Do not delete
`src/module/pings.js` between builds; use `pnpm run clean` for a full reset.

## Layout

```
src/
  module.json        # Foundry v14 module manifest
  module/pings.ts    # entrypoint (bundled to pings.js)
  lang/en.json       # i18n strings
  css/pings.css      # styles
types/foundry.d.ts   # minimal Foundry ambient stubs
```

## Commits

Conventional Commits are enforced by a `commit-msg` hook. AI-assistant
`Co-Authored-By` / "Generated with" trailers are rejected — strip them
before committing.

## License

[MIT](./LICENSE)
