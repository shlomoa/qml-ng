# Gemini Project Context

This repository is a TypeScript generator that converts a limited QML subset into Angular standalone components with Angular Material.

## Core Pipeline

1. Parse QML with `src/lib/qml/qml-parser.ts`.
2. Normalize to `UiDocument` in `src/lib/schema/ui-schema.ts` through `src/lib/converter/qml-to-schema.ts`.
3. Render Angular Material HTML and SCSS in `src/lib/angular/material-renderer.ts`.
4. Expose the pipeline through `src/lib/converter/converter.ts`, `src/cli.ts`, and `src/schematics/qml-component/index.ts`.

## Working Rules

- Prefer schema-first changes instead of embedding one-off HTML in the schematic layer.
- Keep parser support explicit and conservative. Unsupported QML should surface as diagnostics or unsupported placeholders.
- Preserve deterministic generated output, including stable imports and escaped markup.
- If you add a new node kind, update schema types, the QML mapper, the renderer, and any Angular template imports that need to stay consistent.

## Verification

- Run `npm install` first if dependencies are not present.
- Run `npm run build`.
- Smoke-test with `node dist/cli.js examples/login.qml login-form`.

## Current Limits

- Supported starter controls are `Column`, `Row`, `Text`, `TextField`, and `Button`.
- `npm test` is currently a placeholder, not a real automated test suite.
