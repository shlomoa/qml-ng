# qml-ng Phase 3 Starter

A starter repository for converting a subset of [QML] into Angular standalone components using Angular Material.

## What is included

- QML tokenizer and recursive parser
- QML AST model
- Canonical UI schema
- Phase 3 semantic lowering:
  - expression lowering to Angular `computed(...)`
  - handler support like `onClicked:`
  - first layout resolver for `anchors.*`
- Angular Material HTML / TS / SCSS renderer
- automatic Material imports per generated component
- Angular schematic collection with `qml-component`
- CLI with developer experience features (see [DEVELOPER_EXPERIENCE.md](./DEVELOPER_EXPERIENCE.md))
  - Enhanced diagnostics with severity and source positions
  - Dry-run and diff modes
  - Strict mode for CI/CD integration
  - Batch conversion for directory-scale processing

## Example corpus

The repository now includes three kinds of examples:

- [`examples/login.qml`](./examples/login.qml): the smallest end-to-end smoke sample for the currently supported subset
- [`examples/FigmaVariants`](./examples/FigmaVariants): a larger Qt Design Studio project with composite controls such as `LargeButton`, `MiniButton`, `Slider`, dials, sequencers, shapes, effects, and state-driven variants
- [`examples/WebinarDemo`](./examples/WebinarDemo): a larger multi-file project with popups, menus, stacked views, `QtQuick.Layouts`, `QtQuick.Templates`, drag interactions, and bundle-style component composition

These larger examples are important reference fixtures, not a claim that the converter already supports their full feature set. They act as a roadmap corpus for parser, layout, renderer, and testing work.

### Corpus scale

The current `examples/` snapshot is large enough to shape the roadmap directly:

- about 298 QML or `.ui.qml` files
- about 130 distinct object types and 40 distinct import forms
- heavy use of `property alias`, states, `PropertyChanges`, `Timeline` and `Keyframe`, `Loader`, and `StackLayout`
- supporting design assets such as PNGs, JPGs, fonts, and fragment shaders

In practice, this means the examples are no longer just “nice to have” fixtures. They are a realistic stress corpus for parser coverage, semantic lowering, rendering contracts, bundle resolution, diagnostics, and performance.

## Supported [QML] subset

The current implementation is intentionally small:

- `Column`
- `Row`
- `Item`
- `Rectangle`
- `Window`
- `StackLayout`
- `ColumnLayout`
- `RowLayout`
- `GridLayout`
- `FlexboxLayout`
- `Image`
- `Text`
- `TextField`
- `Button`
- `KeyframeGroup` is recognized and skipped conservatively
- selected properties:
  - `text`
  - `placeholderText`
  - `anchors.fill`
  - `anchors.centerIn`
  - handlers like `onClicked`

Anything beyond that starter subset should currently be treated as unsupported or partially supported unless it is explicitly implemented in code and validated by tests.

The new example corpus shows the next wave of features the project will need to reason about, including:

- primitives like `Item`, `Rectangle`, `Image`, and `CheckBox`
- custom reusable components spread across multiple files
- `QtQuick.Layouts` and `StackLayout`
- property aliases and richer binding patterns
- expression-heavy properties such as `implicitWidth`, `implicitHeight`, `Math.max(...)`, logical operators, and `when:` conditions
- states, `PropertyChanges`, and timeline/keyframe constructs
- graphics and effects such as `SvgPathItem`, `Shape`, `ShaderEffect`, and `FastBlur`
- asset-backed controls, design-system-like component bundles, and Qt Design Studio project layouts

## Typical flow

### Single file conversion

```bash
# Basic conversion
node dist/cli.js examples/login.qml --name login-card

# Preview without writing files
node dist/cli.js examples/login.qml --dry-run

# Write to output directory
node dist/cli.js examples/login.qml --name MyComponent --output-dir src/components
```

### Batch conversion

```bash
# Convert all QML files in a directory
node dist/cli.js examples/test-directory --batch --output-dir output/

# Strict mode for CI/CD (fails on unsupported features)
node dist/cli.js examples/ --batch --strict --verbose
```

For detailed documentation on CLI modes and features, see [DEVELOPER_EXPERIENCE.md](./DEVELOPER_EXPERIENCE.md).

The larger example folders are better treated as regression fixtures and roadmap inputs than as current smoke tests.

For day-to-day validation:

- use `examples/login.qml` for a fast smoke test
- use curated files from `examples/FigmaVariants` and `examples/WebinarDemo` for regression, diagnostics, and feature-planning work

## Main architecture

```text
QML
→ tokenizer
→ recursive parser
→ QML AST
→ canonical UI schema
→ semantic lowering
   - bindings
   - handlers
   - layout
→ Angular Material renderer
→ schematic output
```

[QML]: https://doc.qt.io/qt-6/qmlreference.html
