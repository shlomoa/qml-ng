# GitHub Copilot Instructions for qml-ng

- Treat this repository as a TypeScript schematic and code-generation project, not as a browser Angular application.
- Keep changes aligned with the existing pipeline: `qml-parser` -> `qml-to-schema` -> `material-renderer` -> `converter` -> schematic templates.
- Prefer schema-first feature work. Add or adjust `UiNode` types and renderer behavior instead of injecting one-off markup in `src/schematics`.
- Keep QML parsing conservative. Unsupported QML should produce diagnostics or `unsupported` placeholders rather than silent guesses.
- Preserve Angular standalone component output and Angular Material mappings.
- Keep generated output deterministic and escaped. Stable import ordering and safe HTML or attribute escaping matter here.
- When adding support for a new control, update all affected layers together: schema, mapper, renderer, and template imports.
- Validate with `npm run build` and, when possible, `node dist/cli.js examples/login.qml login-form`.
- Do not rely on `npm test` for verification yet; it currently prints a placeholder message.
