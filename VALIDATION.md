# Validation

Run validation from the repository root with:

```bash
npm run validate
```

That command performs the repository checks in order:

1. Build the TypeScript sources with `npm run build`.
2. Run the CLI against `examples/login.qml` using `--name login-form`.
3. Verify the CLI output is structurally complete by checking for the `TS`, `HTML`, `SCSS`, and `DIAGNOSTICS` sections.
4. Verify the smoke test output contains the expected Angular Material and renderer snippets for the sample:
   - the generated component selector and class name
   - the `MatButtonModule`, `MatFormFieldModule`, and `MatInputModule` imports
   - the `qml-column` layout markup and host layout CSS
   - the `mat-form-field`, `matInput`, and `mat-raised-button` renderings
   - the placeholder binding for `"Email"`
   - a `None` diagnostics section

If the validator fails, fix the build or the rendered output before merging. The smoke test is intentionally strict so it catches changes in the end-to-end generator behavior, not just command exit codes.
