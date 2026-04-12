# Conversion Coverage

This repository keeps the QML parser conservative and lets the converter decide which
QML types become visible Angular output.

## Newly Covered Types

- `ScrollView` converts to a scrollable container and preserves its child content.
- `QtObject` and inline `Component` wrappers are treated as transparent structural containers
  so nested UI can still be reached.
- `ShapePath` is preserved as a structural container so path primitives remain traversable.
- `PathArc`, `PathLine`, `PathMove`, `PathSvg`, and `PathText` are recognized as
  non-visual path primitives and skipped conservatively instead of being reported as
  unsupported nodes.

## Notes

- The shape-path primitives are intentionally not guessed into SVG semantics yet.
- This keeps the converter conservative while still allowing the example projects to parse
  and traverse the full tree without unsupported-type noise from these nodes.

## Mapping Categories

The Angular renderer now resolves every emitted `UiNode.kind` through a central registry.
That registry records:

- the template renderer used for the node kind
- required Angular component imports
- required Angular Material imports
- optional theme hooks
- accessibility rules
- a mapping category

Current categories are:

### Supported mappings

- `text` → escaped Angular text interpolation
- `button` → Angular Material raised button
- `image` → plain Angular `<img>` binding

### Approximated mappings

- `container` → `<div>`-based structural and layout wrappers such as `Window`, `Item`,
  `Rectangle`, `Column`, `Row`, `StackLayout`, `GridLayout`, `FlexboxLayout`, `ScrollView`,
  and `ShapePath`
- `input` → Angular Material form field plus `matInput`; this currently preserves
  placeholder-driven behavior, not the full QML `TextField` model

### Unsupported mappings

- `unknown` → explicit placeholder output so unsupported controls such as `CheckBox`,
  `SvgPathItem`, `ShaderEffect`, and `FastBlur` stay visible in generated HTML and diagnostics
- `animation` → skipped markup with an optional HTML comment marker for non-visual nodes that
  are recognized but not yet represented in Angular output
