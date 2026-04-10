# Angular Renderer Architecture

## Overview

The Angular renderer has been refactored from a monolithic structure into a modular contract-based architecture. This separation of concerns enables independent testing, swappable implementations, and clearer extension points.

## Architecture

The renderer is organized into the following sub-renderers:

### 1. Renderer Contract (`renderer-contract.ts`)

Defines the core interfaces for all sub-renderers:

- **`ImportsResolver`**: Manages Angular core and Material module imports
- **`NamingService`**: Generates consistent identifiers (class names, selectors, etc.)
- **`TypeScriptRenderer`**: Generates component class source
- **`HtmlRenderer`**: Generates Angular template markup
- **`ScssRenderer`**: Generates component styles
- **`DiagnosticsEmitter`**: Handles warnings and code comments
- **`RenderContext`**: Shared state across rendering operations

### 2. Sub-Renderer Implementations

#### Naming Service (`naming-service.ts`)

Follows Angular style guide conventions:

- Component names: `kebab-case` → `PascalCase` + `Component` suffix
  - Example: `login-form` → `LoginFormComponent`
- Selectors: `kebab-case` with `app-` prefix
  - Example: `LoginForm` → `app-login-form`
- Computed properties: `{prefix}Expr{counter}` pattern

#### Imports Resolver (`imports-resolver.ts`)

- Collects required Angular core imports based on context
  - Always includes `Component`
  - Adds `computed` if computed declarations exist
  - Adds `signal` if signal declarations exist
- Walks the UI tree to collect Material module imports
- Groups Material imports by package for cleaner output
- Supports extensible Material import registry

#### HTML Renderer (`html-renderer.ts`)

- Renders Angular Material template markup
- Handles containers, text, inputs, buttons, images
- Generates computed properties for expression bindings
- Emits HTML comments for unsupported constructs
- Properly escapes attribute values

#### SCSS Renderer (`scss-renderer.ts`)

- Generates host styles
- Provides layout classes (row, column, grid, etc.)
- Applies per-node layout rules from schema
- Maintains consistent spacing and display rules

#### TypeScript Renderer (`typescript-renderer.ts`)

- Generates `@Component` decorator with metadata
- Emits signal declarations for reactive dependencies
- Emits computed property declarations
- Includes diagnostics as TypeScript comments

#### Diagnostics Emitter (`diagnostics-emitter.ts`)

- Collects warnings about unsupported features
- Adds comments for approximations or intentional omissions
- Renders diagnostics as JSDoc-style comments in generated code

### 3. Main Renderer (`material-renderer.ts`)

Orchestrates all sub-renderers:

```typescript
const renderer = new AngularMaterialRenderer();
const result = renderer.render(uiDocument);
// result: { ts: string, html: string, scss: string }
```

## Extension Points

### Custom Naming Conventions

Implement `NamingService` to use different naming patterns:

```typescript
class CustomNamingService implements NamingService {
  generateClassName(componentName: string): string {
    return `${componentName}Cmp`;
  }
  // ...
}

const renderer = new AngularMaterialRenderer(
  undefined, // use default imports resolver
  new CustomNamingService()
);
```

### Custom Material Mapping

Extend `DefaultImportsResolver` to support additional Material modules:

```typescript
class ExtendedImportsResolver extends DefaultImportsResolver {
  collectMaterialImports(root: UiNode): string[] {
    const base = super.collectMaterialImports(root);
    // Add custom logic
    return base;
  }
}
```

### Alternative Render Targets

Implement the renderer interfaces to target different frameworks:

- Bootstrap instead of Material
- Tailwind CSS for styling
- Custom component libraries

### Custom Diagnostics

Replace `DiagnosticsEmitter` to integrate with external linting or reporting tools.

## Supported Controls

### Current Support

- **Containers**: `Window`, `Item`, `Rectangle`, `Column`, `Row`, `ColumnLayout`, `RowLayout`, `StackLayout`, `GridLayout`, `FlexboxLayout`, `ScrollView`
- **Controls**: `Text`, `TextField`, `Button`, `Image`
- **Layout**: `anchors.fill`, `anchors.centerIn`
- **Events**: `onClicked` and other QML handlers

### Unsupported (Emit Diagnostics)

- **Graphics**: `SvgPathItem`, `ShapePath`, `PathArc`, `PathLine`
- **State Management**: `State`, `PropertyChanges`, `Timeline`
- **Animation**: `KeyframeGroup`, `Transition`, `Behavior`
- **Effects**: `FastBlur`, `ShaderEffect`
- **Custom Types**: Unknown QML types emit HTML comments and diagnostics

## Testing

### Fixtures

Test fixtures are located in `test/fixtures/renderer/`:

- `login-form.qml`: Basic form with bindings
- `window-shell.qml`: Window container with nested content
- `complex-layout.qml`: Multiple layout types
- `with-images.qml`: Asset references
- `with-unsupported.qml`: Intentionally unsupported constructs

### Running Tests

```bash
npm run build
node dist/cli.js test/fixtures/renderer/login-form.qml login-form
node dist/cli.js test/fixtures/renderer/window-shell.qml window-shell
node dist/cli.js test/fixtures/renderer/with-unsupported.qml with-unsupported
```

Expected behavior:

- Supported controls render to Angular Material markup
- Unsupported constructs emit warnings in TypeScript comments
- Unsupported constructs emit HTML comments in templates
- Diagnostics section shows all warnings

## Backward Compatibility

The legacy `renderAngularMaterial(doc, className)` function remains available and delegates to the new modular renderer:

```typescript
// Legacy usage (still works)
import { renderAngularMaterial } from './angular/material-renderer';
const result = renderAngularMaterial(doc, 'LoginComponent');

// New usage (recommended)
import { AngularMaterialRenderer } from './angular/material-renderer';
const renderer = new AngularMaterialRenderer();
const result = renderer.render(doc);
```

## Future Enhancements

### Planned Improvements

1. **Dynamic Material Registry**: Load Material mapping rules from external configuration
2. **Theming Support**: Generate theme-aware styles based on QML properties
3. **Accessibility Annotations**: Emit ARIA attributes based on control semantics
4. **Layout Subsystem**: Dedicated constraint solver for complex anchor patterns
5. **Asset Resolution**: Proper handling of relative paths and asset bundles
6. **Component Composition**: Support for reusable QML components as Angular components

### Extension Scenarios

- **Alternative Component Libraries**: Replace Material with Bootstrap, PrimeNG, etc.
- **Different Output Formats**: Generate Web Components or React components
- **Custom Renderer Pipelines**: Add post-processing steps for optimization
- **Bundle-Level Generation**: Handle multi-file QML projects as feature modules

## References

- PLAN.md Step 8: Build a real Angular renderer contract
- renderer-contract.ts: Core interface definitions
- SCOPE.md: Supported QML subset for v1.0
