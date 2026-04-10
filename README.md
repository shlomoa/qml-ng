# qml-ng Phase 1

This project provides a conversion solution from QML into Angular standalone components with Angular Material.

## What is included

- A starter `qml-component` schematic
- A canonical UI schema in TypeScript
- A first-pass QML parser skeleton
- A schema normalizer
- A basic Angular Material HTML renderer
- A tiny CLI helper for local experimentation

## Install

```bash
npm install
npm run build
```

## Run the schematic

Inside an Angular workspace:

```bash
ng generate ./node_modules/@qml-ng/schematics:qml-component \
  --name login-form \
  --path src/app/generated \
  --qml examples/login.qml
```

Or with the long form:

```bash
ng g @qml-ng/schematics:qml-component --name login-form --path src/app/generated --qml examples/login.qml
```

## Current scope

Supported in the starter:

- `Column`
- `Row`
- `Text`
- `TextField`
- `Button`

Unsupported QML features are intentionally emitted as TODO markers or diagnostics.

---

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
