# Validation

Run validation from the repository root with:

```bash
npm run validate
```

That command performs the repository checks in order:

1. Build the TypeScript sources with `npm run build`.
2. Run the built parser and renderer against `examples/login.qml` as the baseline smoke test.
3. Validate the staged example coverage in this order:
   - `examples/FigmaVariants/Dependencies/Components/imports/compat/Extras/StaticText.qml`
   - `examples/FigmaVariants/FigmaVariantsContent/ScreenDesign.ui.qml`
   - `examples/FigmaVariants/FigmaVariantsContent/App.qml`
   - `examples/WebinarDemo/Dependencies/Components/imports/compat/Extras/StaticText.qml`
   - `examples/WebinarDemo/WebinarDemoContent/MainApp.ui.qml`
   - `examples/WebinarDemo/WebinarDemoContent/App.qml`
4. Verify each rendered result has the `TS`, `HTML`, `SCSS`, and `DIAGNOSTICS` sections, and check that the smaller leaf files stay supported while the larger app shells report the expected unsupported QML types instead of crashing.
5. Keep the login smoke test strict enough to catch the existing placeholder-binding mismatch without freezing in the broken placeholder string as the desired output.

If the validator fails, fix the build or the rendered output before merging. The smoke test is intentionally strict so it catches changes in the end-to-end generator behavior, not just command exit codes.
