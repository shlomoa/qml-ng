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
