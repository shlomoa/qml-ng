# Gemini Project Context

Use `AGENTS.md` as the main source of truth for repository status, scope, workflow, and requirements.

## Repo Snapshot

- This repo converts a conservative QML subset into Angular standalone components with Angular Material.
- The current flow is:
  1. tokenize and parse QML
  2. lower into `UiDocument` through semantic passes
  3. render Angular HTML / SCSS / TypeScript
  4. expose the result through the CLI and Angular schematics
- Current schematic surface:
  - `qml-component`
  - `qml-batch`
  - `qml-feature`
  - `update-routes`
  - `migrate-generated`
  - `validate-generated`

## Working Rules

- Prefer shared converter, pass, renderer, batch, and schematic helpers over one-off logic.
- Keep parser support conservative and diagnostic-first.
- Keep CLI, schematics, and docs aligned when commands, options, output layout, or diagnostic formatting change.
- Update `src/docs/conversion-coverage.md` when node coverage meaningfully changes.

## Verification

```bash
npm install
npm run build
npm run validate
node dist/cli.js examples/login.qml --name login-form
```

## Scope Reminder

- Direct rendered controls currently include `Text`, `TextField`, `Button`, and `Image`.
- Container/layout mappings currently include `Window`, `QtObject`, `Component`, `Item`, `Rectangle`, `Column`, `Row`, `ColumnLayout`, `RowLayout`, `StackLayout`, `GridLayout`, `FlexboxLayout`, `ScrollView`, and `ShapePath`.
- Advanced states, effects, model/view controls, and many interaction primitives remain unsupported or diagnostic-first.
