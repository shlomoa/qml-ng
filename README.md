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
- simple CLI for local experimentation

## Example corpus

The repository now includes three kinds of examples:

- [`examples/login.qml`](./examples/login.qml): the smallest end-to-end smoke sample for the currently supported subset
- [`examples/FigmaVariants`](./examples/FigmaVariants): a larger Qt Design Studio project with composite controls such as `LargeButton`, `MiniButton`, `Slider`, dials, sequencers, shapes, effects, and state-driven variants
- [`examples/WebinarDemo`](./examples/WebinarDemo): a larger multi-file project with popups, menus, stacked views, `QtQuick.Layouts`, `QtQuick.Templates`, drag interactions, and bundle-style component composition

These larger examples are important reference fixtures, not a claim that the converter already supports their full feature set. They act as a roadmap corpus for parser, layout, renderer, and testing work.

## Supported [QML] subset

The current implementation is intentionally small:

- `Column`
- `Row`
- `Text`
- `TextField`
- `Button`
- selected properties:
  - `text`
  - `placeholderText`
  - `anchors.fill`
  - `anchors.centerIn`
  - handlers like `onClicked`

The new example corpus shows the next wave of features the project will need to reason about, including:

- primitives like `Item`, `Rectangle`, `Image`, and `CheckBox`
- custom reusable components spread across multiple files
- `QtQuick.Layouts` and `StackLayout`
- property aliases and richer binding patterns
- states, `PropertyChanges`, and timeline/keyframe constructs
- graphics and effects such as `SvgPathItem`, `Shape`, `ShaderEffect`, and `FastBlur`

## Typical flow

```bash
node dist/cli.js examples/login.qml --name login-card
```

This prints generated component files to stdout for the small supported subset. The larger example folders are better treated as regression fixtures and roadmap inputs than as current smoke tests.

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
