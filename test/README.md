# Testing Strategy for qml-ng

This directory contains comprehensive tests for the qml-ng QML to Angular Material converter.

## Test Structure

The test suite is organized into multiple layers, following the production roadmap outlined in PLAN.md:

### 1. Tokenizer Tests (`tokenizer/`)
- Tests for all token types (identifiers, strings, numbers, braces, etc.)
- Comment handling (single-line and multi-line)
- Whitespace and position tracking
- Edge cases and error conditions

### 2. Parser Tests (`parser/`)
- Basic QML object parsing
- Property parsing (strings, numbers, identifiers, expressions)
- Typed properties (property declarations, readonly, alias)
- Embedded objects
- Component declarations
- Import and pragma handling
- Function and signal declarations

### 3. Semantic Lowering Tests (`converter/`)
- QML AST to UI schema conversion (qml-to-ui)
- Type mapping (Text, Button, TextField, Image, etc.)
- Layout container mapping (Column, Row, layouts)
- Shell type mapping (Window, Item, Rectangle)
- Property lowering (literals vs expressions)
- Event handling
- Layout resolution (anchors)

### 4. Renderer Tests (`renderer/`)
- Golden file tests for generated TypeScript, HTML, and SCSS
- Tests for all control types
- Layout generation
- Binding and expression handling
- Import generation (Angular Material modules)
- Signal and computed generation
- Deterministic output verification

### 5. Diagnostics Tests (`diagnostics/`)
- Unsupported QML type detection
- Graphics and effects types (SvgPathItem, FastBlur, ShaderEffect)
- State and animation types
- Diagnostic message clarity
- Boundary between supported and unsupported types

### 6. Regression Tests (`regression/`)
- Tests using real examples from the examples/ directory
- login.qml smoke test (current supported subset)
- FigmaVariants and WebinarDemo sample tests
- Simple form patterns
- Binding patterns
- Handler patterns
- Output stability

### 7. Schematic Integration Tests (`schematic/`)
- End-to-end pipeline tests (parse → convert → render)
- Component naming conventions
- Standalone component structure
- Import generation
- Template and style generation

## Test Fixtures

The `fixtures/` directory contains curated QML examples for testing:
- `login.qml` - Simple login form (fast smoke test)
- `button-grid.qml` - Calculator-style layout
- `complex-layout.qml` - Nested layouts with multiple controls
- `unsupported-features.qml` - Mix of supported and unsupported types

## Golden Files

The `golden/` directory (gitignored) contains reference outputs for renderer tests:
- Generated TypeScript component files (`.component.ts`)
- Generated HTML templates (`.component.html`)
- Generated SCSS styles (`.component.scss`)

To update golden files after intentional changes: `UPDATE_GOLDEN=true npm test`

## Running Tests

```bash
# Run all tests
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

## Test Framework

Tests use Node.js built-in test runner (available in Node 18+):
- `describe()` for test suites
- `test()` for individual tests
- `assert` from `node:assert` for assertions
- No external test framework dependencies

## Test Coverage Goals

According to PLAN.md Step 13, production quality requires:
- ✅ Tokenizer tests
- ✅ Parser tests
- ✅ Semantic lowering tests
- ✅ Renderer golden-file tests
- ✅ Schematic integration tests
- ✅ Snapshot tests for generated TS, HTML, and SCSS
- ✅ Diagnostics tests for unsupported features
- ✅ Regression tests from real QML samples

## Known Limitations

- Simple identifier bindings (e.g., `text: name`) are currently treated as literals, not expressions
- This is a known limitation documented in test comments
- Expression detection needs enhancement to handle all identifier forms

## Future Enhancements

Per PLAN.md, future test additions should include:
- Compile checks of generated Angular components
- Integration tests against real Angular workspaces
- Performance and scale tests for batch conversion
- Memory-bounded processing tests
