# qml-ng Agent Guide

## Project Purpose

This repository is a TypeScript QML-to-Angular generator. It parses a conservative QML subset, lowers it into a canonical UI schema, renders Angular standalone component files, and exposes that flow through both a CLI and Angular schematics.

The repo is no longer just a tiny single-file starter. It now includes:

- a tokenizer and parser for a broad practical subset of the example corpus
- a multi-pass semantic lowering pipeline
- a registry-driven Angular/Angular Material renderer
- batch conversion helpers and a richer CLI
- Angular workspace schematics for generation, migration, route updates, and validation
- parser-oriented validation against the larger `examples/` corpus

## Current Status

Treat the current implementation as a conservative converter with explicit diagnostics, not a full QML runtime.

- Single-file conversion works through the CLI and `qml-component`.
- Directory and bundle generation work through the CLI batch flow and the `qml-batch` / `qml-feature` schematics.
- Local `.qml` / `.ui.qml` component resolution is used for bundle generation and validation.
- Bindings lower into Angular expressions and `computed(...)` fields.
- Typed QML properties can lower into Angular `signal(...)` declarations.
- Assignment-style handlers can lower into generated component methods.
- Layout handling is approximate by design and emits diagnostics when Qt semantics cannot be preserved exactly.
- Unsupported or risky constructs should stay visible as diagnostics or placeholders instead of being guessed.

## Architecture

Keep work aligned with this pipeline:

1. `src/lib/qml/tokenizer.ts` tokenizes QML source.
2. `src/lib/qml/parser.ts` parses QML into the AST in `src/lib/qml/ast.ts`.
3. `src/lib/qml/qml-resolution.ts` resolves project-local component references for multi-file bundles.
4. `src/lib/converter/qml-to-ui.ts` builds the initial `UiDocument` and runs the semantic lowering pipeline.
5. `src/lib/passes/*.ts` perform structural normalization, binding lowering, handler lowering, layout lowering, control mapping, and diagnostics enrichment.
6. `src/lib/angular/material-renderer.ts` renders Angular HTML, SCSS, and TypeScript using:
   - `src/lib/angular/node-render-registry.ts`
   - `src/lib/angular/scss-renderer.ts`
   - `src/lib/angular/typescript-renderer.ts`
   - `src/lib/angular/imports-resolver.ts`
7. `src/lib/batch/batch-converter.ts` composes deterministic single-file and batch CLI conversion results.
8. `src/cli.ts` exposes single-file and directory conversion, `--dry-run`, `--diff`, `--strict`, and `--verbose`.
9. `src/schematics/` exposes Angular workspace integration:
   - `qml-component`
   - `qml-batch`
   - `qml-feature`
   - `update-routes`
   - `migrate-generated`
   - `validate-generated`

## Working Rules

- Prefer schema-first and pass-first changes. Extend the parser, schema, passes, and renderer rather than embedding one-off HTML or behavior in schematic entrypoints.
- Keep the parser conservative. If a QML construct is unclear or unsupported, emit diagnostics or preserve a visible placeholder instead of inventing semantics.
- Keep generated output deterministic. Preserve stable ordering for imports, diagnostics, generated files, and emitted markup.
- Keep CLI and schematic behavior aligned where they share concepts such as diagnostics formatting, component naming, bundle traversal, and output layout.
- Reuse shared helpers instead of duplicating logic:
  - diagnostics formatting in `src/lib/diagnostics/formatter.ts`
  - naming in `src/lib/naming.ts`
  - batch conversion in `src/lib/batch/batch-converter.ts`
  - bundle and workspace generation in `src/schematics/bundle-generation.ts` and `src/schematics/workspace-generation.ts`
- When changing layout behavior, route it through `src/lib/converter/layout-resolver.ts`, `src/lib/layout/layout-utils.ts`, and `src/lib/passes/layout-lowering.ts` so precedence and diagnostics stay consistent.
- When changing renderer coverage, update both the classification side and the render side:
  - `src/lib/passes/structural-normalization.ts`
  - `src/lib/converter/qml-to-ui.ts`
  - `src/lib/angular/node-render-registry.ts`
  - `src/lib/angular/material-imports.ts` / `src/lib/angular/imports-resolver.ts` if imports change
- When changing workspace generation conventions, keep these in sync:
  - `collection.json`
  - `src/schematics/*`
  - `README.md`
  - `docs/VALIDATION.md`

## Important Files

- `src/lib/qml/parser.ts`: main conservative QML parser
- `src/lib/qml/qml-resolution.ts`: local component dependency resolution for bundles
- `src/lib/converter/qml-to-ui.ts`: AST to `UiDocument` conversion entrypoint
- `src/lib/converter/layout-resolver.ts`: layout capture and CSS declaration generation
- `src/lib/passes/structural-normalization.ts`: QML type classification
- `src/lib/passes/layout-lowering.ts`: layout diagnostics and precedence handling
- `src/lib/angular/node-render-registry.ts`: central mapping registry for emitted `UiNode.kind`
- `src/lib/angular/material-renderer.ts`: top-level Angular render orchestration
- `src/lib/batch/batch-converter.ts`: CLI batch conversion and summary logic
- `src/schematics/bundle-generation.ts`: shared multi-file schematic generation flow
- `src/schematics/workspace-generation.ts`: workspace-aware destination planning, barrel updates, and route updates
- `docs/conversion-coverage.md`: current mapping summary
- `docs/VALIDATION.md`: repository validation contract
- `docs/SCOPE.md`: versioned product-scope document
- `examples/login.qml`: fastest smoke test
- `examples/FigmaVariants` and `examples/WebinarDemo`: larger regression and roadmap corpus

## Current Scope

The current renderer surface is broader than the original starter subset, but still intentionally selective.

### Directly rendered node kinds

- `Text` -> Angular text interpolation
- `TextField` -> `mat-form-field` + `input[matInput]`
- `Button` -> `button[mat-raised-button]`
- `Image` -> `<img>` with a bound `src`

### Container and structural mappings

These lower primarily into `<div>` wrappers with metadata-driven classes and approximate layout behavior:

- `Window`
- `QtObject`
- `Component`
- `Item`
- `Rectangle`
- `Column`
- `Row`
- `ColumnLayout`
- `RowLayout`
- `StackLayout`
- `GridLayout`
- `FlexboxLayout`
- `ScrollView`
- `ShapePath`

### Conservatively recognized non-visual nodes

These are recognized so traversal and diagnostics stay stable, but they do not become rich Angular widgets:

- `KeyframeGroup`
- `PathArc`
- `PathLine`
- `PathMove`
- `PathSvg`
- `PathText`

### Explicitly unsupported or still diagnostic-first

Examples include:

- state systems such as `State`, `StateGroup`, `PropertyChanges`, and `Transition`
- advanced timelines and animations
- graphics/effects such as `SvgPathItem`, `ShaderEffect`, `FastBlur`, and shadow effects
- advanced interaction handlers such as `DragHandler`, `TapHandler`, and `PinchArea`
- model/view controls such as `ListView`, `GridView`, `PathView`, and `Repeater`
- unsupported layout constraints beyond the implemented subset

For the fuller product boundary, use `docs/SCOPE.md` as the source-of-truth scope document.

## How To Work

Install dependencies when needed:

```bash
npm install
```

Main day-to-day verification:

```bash
npm run build
npm run validate
node dist/cli.js examples/login.qml --name login-form
```

Useful CLI patterns:

```bash
node dist/cli.js examples/login.qml --name login-form
node dist/cli.js examples/WebinarDemo --output-dir .tmp/qml-ng-out --dry-run --verbose
node dist/cli.js examples/WebinarDemo --output-dir .tmp/qml-ng-out --diff
node dist/cli.js examples/WebinarDemo --output-dir .tmp/qml-ng-out --strict
```

Notes:

- Single-file CLI runs print generated output to stdout unless `--output-dir` is supplied.
- Directory inputs are treated as batch conversions automatically.
- `npm run validate` is broader than the smoke test: it builds, parses the large example corpus, checks `.qmlproject` entrypoints, and verifies parser-based local component resolution.
- There is no meaningful `npm test` workflow wired up today. Do not claim coverage from `npm test`.

## Requirements For Changes

- If you change parser syntax support, run `npm run validate`.
- If you change CLI flags, output conventions, or diagnostics formatting, update `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `README.md`, and any affected schema/help text.
- If you change renderer node coverage, update `docs/conversion-coverage.md`.
- If you change schematic capabilities or options, update `collection.json`, the relevant schematic `schema.json`, and the docs that describe the workflow.
- Keep unsupported behavior explicit. Silent semantic drift is worse than a warning or placeholder in this codebase.
