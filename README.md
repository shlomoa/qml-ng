# qml-ng

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
