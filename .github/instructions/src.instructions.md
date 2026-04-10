---
applyTo: "src/**/*.ts,src/**/*.template,scripts/**/*.mjs"
---

# Source File Instructions

- Keep core logic in small, composable functions. This repo is a pipeline, so each layer should stay easy to reason about on its own.
- Prefer extending canonical types in `src/lib/schema/ui-schema.ts` before changing renderer or schematic behavior.
- Preserve explicit unsupported-state handling. Warnings and TODO placeholders are better than silent fallbacks for unimplemented QML constructs.
- Renderer changes should keep HTML escaped and imports deterministic.
- If you change generated Angular imports, verify whether `src/schematics/qml-component/files/__name@dasherize__/*.template` must also change.
- Keep example-driven smoke testing in mind. The `examples/login.qml` path should remain a simple end-to-end sanity check.
