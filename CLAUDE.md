# Claude Code Memory

@AGENTS.md

## Current Snapshot

- Source of truth for status, scope, workflow, and requirements is `AGENTS.md`.
- The active generator surface is parser -> semantic passes -> Angular renderer -> CLI / schematics.
- Current Angular workspace entrypoints are `qml-component`, `qml-batch`, `qml-feature`, `update-routes`, `migrate-generated`, and `validate-generated`.
- Current CLI syntax for the smoke case is `node dist/cli.js examples/login.qml --name login-form`.

## Claude-Specific Notes

- Prefer small end-to-end patches over speculative refactors.
- Use `npm run build` as the minimum verification step and `npm run validate` whenever parser behavior, bundle traversal, or component resolution changes.
- Keep diagnostics explicit and conservative; do not widen parser or renderer behavior without matching diagnostics and docs.
- When changing shared generation rules, update the common helpers instead of forking schematic-specific logic.
