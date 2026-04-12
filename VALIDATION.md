# Validation

Run validation from the repository root with:

```bash
npm run validate
```

That command performs the repository checks in order:

1. Build the TypeScript sources with `npm run build`.
2. Run the Node.js test suite with `npm test`, covering tokenizer, parser, semantic lowering, renderer snapshots and goldens, diagnostics, real-example regression cases, schematic integration, and generated Angular component compile checks.
3. Recursively parse every `.qml` and `.ui.qml` file under `examples/FigmaVariants` and `examples/WebinarDemo`.
4. Treat `examples/FigmaVariants/FigmaVariants.qmlproject` and `examples/WebinarDemo/WebinarDemo.qmlproject` as the project anchors so the validator always covers the declared app entrypoints.
5. Follow parser-resolved child component source paths from the entrypoints so the validator proves the parser can map local component names such as `MainApp` to their backing `.ui.qml` files.

The recursive pass is intentionally parser-focused. It checks that the current QML grammar can walk the full example trees without crashing on comments, import preambles, qualified type names, property declarations, signal/function declarations, multiline expressions, and project-local component resolution.

If the validator fails, fix the parser or the example coverage before merging. The goal is to keep this check broad enough to catch real grammar regressions in the example trees, not to freeze in a narrow smoke case.
