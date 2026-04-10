# qml-ng Agent Guide

## Project Purpose

This repository is a TypeScript code generator that converts a small QML subset into Angular standalone components and Angular Material markup.

## Architecture

Keep work aligned with this pipeline:

1. `src/lib/qml/qml-parser.ts` parses a limited QML subset into `QmlNode`.
2. `src/lib/converter/qml-to-schema.ts` normalizes QML AST nodes into the canonical `UiDocument` schema in `src/lib/schema/ui-schema.ts`.
3. `src/lib/angular/material-renderer.ts` renders Angular HTML, SCSS, and Material module imports from that schema.
4. `src/lib/converter/converter.ts` composes the end-to-end conversion for both the CLI and schematics.
5. `src/schematics/qml-component/index.ts` writes the generated Angular files into an Angular workspace.

## Working Rules

- Prefer schema-first changes. Extend the schema, converter, and renderer instead of inserting ad-hoc HTML directly in the schematic.
- Keep `src/lib/qml/qml-parser.ts` intentionally conservative. If a QML feature is unsupported, emit diagnostics or an unsupported placeholder instead of guessing.
- Preserve Angular standalone component output and Angular Material mappings.
- When adding a new control, update the affected layers together: schema types, QML-to-schema mapping, renderer output, and any schematic template imports that must stay in sync.
- Preserve deterministic generated output where practical. Stable import ordering, escaping, and predictable markup matter in generator code.
- Keep unsupported features such as anchors, states, and transitions explicit with TODO-style output or diagnostics.

## Important Files

- `src/lib/qml/qml-parser.ts`: starter tokenizer and parser for a narrow QML subset.
- `src/lib/schema/ui-schema.ts`: canonical intermediate UI schema.
- `src/lib/converter/qml-to-schema.ts`: QML AST to schema mapping.
- `src/lib/angular/material-renderer.ts`: schema to Angular Material HTML and SCSS.
- `src/schematics/qml-component/files/__name@dasherize__/*.template`: generated Angular component templates.
- `examples/login.qml`: smallest end-to-end sample for smoke testing.

## Validation

- Install dependencies with `npm install` when `node_modules` is missing.
- Run `npm run build` after code changes.
- Use `node dist/cli.js examples/login.qml login-form` as a smoke test once the build succeeds.
- The current `npm test` script is only a placeholder, so do not treat it as real coverage.

## Current Scope

- Supported starter controls today: `Column`, `Row`, `Text`, `TextField`, and `Button`.
- The generated component TypeScript template currently hardcodes `CommonModule`, `MatButtonModule`, `MatFormFieldModule`, and `MatInputModule`. If renderer imports become dynamic, keep that template aligned.
