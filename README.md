# qml-ng Phase 3 Starter

A starter repository for converting a subset of QML into Angular standalone components using Angular Material.

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

## Supported QML subset

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

## Typical flow

```bash
node dist/cli.js examples/login.qml --name login-card
```

This prints generated component files to stdout in the current skeleton.

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
