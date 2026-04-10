# qml-ng Version 1.0 Scope Definition

This document freezes the supported QML subset for version 1.0 of qml-ng, based on the expanded example corpus analysis. The corpus includes approximately 300 QML files from FigmaVariants and WebinarDemo projects, containing around 130 distinct QML object types.

## Purpose and Philosophy

qml-ng v1.0 targets a **practical subset** of QML that can be converted to Angular standalone components with Angular Material. This is not a comprehensive QML implementation. Rather, it focuses on:

1. **Common UI patterns**: Forms, layouts, basic interaction
2. **Clear semantics**: Constructs with well-defined Angular mappings
3. **Diagnostic clarity**: Explicit errors for unsupported features rather than silent failures

The goal is predictable, maintainable Angular output for a constrained but useful QML subset.

---

## Supported Constructs (v1.0 Target)

### 1. App Shells and Root Nodes

**Status**: Limited support with explicit classification

- **`Window`**: Recognized as application root
  - v1.0 classification: Maps to Angular component root with viewport-level styling
  - Supported properties: `width`, `height`, `visible`, `title`
  - Limitation: Does not map to native window APIs; treated as component container

- **`Item`**: Generic container
  - Status: Supported as generic container (`<div>` equivalent)
  - Used for composition and layout grouping

- **`Rectangle`**: Basic visual primitive
  - Status: Supported as styled container
  - Supported properties: `width`, `height`, `color`, `border.width`, `border.color`, `radius`
  - Maps to: `<div>` with CSS border and background styling

### 2. Layout and Composition Primitives

**Target support**: Core layout types only

- **`Row`**: Horizontal layout ✅
  - Supported properties: `spacing`, standard geometry
  - Maps to: Flexbox row layout (CSS `display: flex; flex-direction: row`)

- **`Column`**: Vertical layout ✅
  - Supported properties: `spacing`, standard geometry
  - Maps to: Flexbox column layout (CSS `display: flex; flex-direction: column`)

- **`StackLayout`**: Layered content with one visible child ⚠️
  - Status: Planned for v1.0
  - Maps to: Angular structural directive with single visible child (`*ngIf` pattern)

- **`RowLayout`**: Qt Quick Layouts horizontal ⚠️
  - Status: Evaluate for v1.0 (similar to Row but with different sizing semantics)

- **`ColumnLayout`**: Qt Quick Layouts vertical ⚠️
  - Status: Evaluate for v1.0 (similar to Column but with different sizing semantics)

- **`Loader`**: Dynamic component loading ❌
  - Status: Out of scope for v1.0 (requires advanced runtime component instantiation)

### 3. Text, Input, and Action Controls

**Target support**: Basic Material form controls

- **`Text`**: Static text display ✅
  - Supported properties: `text`, `color`, `font.family`, `font.pixelSize`, `font.weight`, alignment properties
  - Maps to: `<span>` or `<p>` with inline styles

- **`TextField`**: Text input ✅
  - Supported properties: `text`, `placeholderText`
  - Maps to: `<mat-form-field>` with `<input matInput>`
  - Event: `onTextChanged` → `(input)` or `(ngModelChange)`

- **`Button`**: Action button ✅
  - Supported properties: `text`
  - Maps to: `<button mat-raised-button>`
  - Event: `onClicked` → `(click)`

- **`CheckBox`**: Boolean input ⚠️
  - Status: Planned for v1.0
  - Maps to: `<mat-checkbox>`

### 4. Visual and Media Primitives

**Target support**: Basic image display only

- **`Image`**: Image display ⚠️
  - Status: Planned for v1.0
  - Supported properties: `source`, `width`, `height`
  - Maps to: `<img>` or Angular Material image component
  - Asset resolution: Local project assets only (relative paths)

### 5. Interaction Primitives

**Target support**: Basic event handlers only

- **`MouseArea`**: Mouse/touch interaction ⚠️
  - Status: Limited support planned for v1.0
  - Supported events: `onClicked`, `onPressed`, `onReleased`
  - Maps to: Angular event bindings on host element
  - Limitation: Advanced mouse tracking, hover, drag not supported in v1.0

- **`Connections`**: Signal/slot connections ❌
  - Status: Out of scope for v1.0
  - Reason: Requires sophisticated reactive binding system beyond initial target

### 6. Anchors and Geometry

**Target support**: Common layout anchors and explicit sizing

Supported anchor patterns:
- **`anchors.fill: parent`** ✅ → CSS positioning (width: 100%, height: 100%)
- **`anchors.centerIn: parent`** ✅ → Flexbox centering or CSS centering
- **Edge anchors** ⚠️ (v1.0 limited):
  - `anchors.left`, `anchors.right`, `anchors.top`, `anchors.bottom`
  - Status: Simple cases only (parent edge alignment)
  - Complex: Sibling anchoring and margins require advanced conflict resolution

Supported geometry properties:
- **`x`, `y`** ⚠️: Absolute positioning (limited; diagnostic for complex cases)
- **`width`, `height`** ✅: Direct size specification
- **`implicitWidth`, `implicitHeight`** ⚠️: Minimum size hints (map to CSS min-width/min-height)

### 7. Event Handlers

**Target support**: Simple assignment-style handlers

Supported handler patterns:
- **`onClicked: handler()`** ✅ → `(click)="handler()"`
- **`onTextChanged: handler()`** ✅ → `(input)="handler($event)"`
- **`onPressed: handler()`** ⚠️ → `(mousedown)="handler()"`

Handler body support:
- **Single function call**: ✅ Fully supported
- **Simple assignment**: ⚠️ Limited (e.g., `property = value`)
- **Complex imperative JS**: ❌ Out of scope for v1.0

Diagnostic: Multi-statement handlers produce warning with placeholder

### 8. Binding Patterns and Expressions

**Target support**: Declarative reactive bindings

Supported expression forms:
- **Identifiers**: ✅ `text: userName` → Signal reads in Angular
- **Dotted paths**: ✅ `text: user.name` → Chained signal access
- **Arithmetic**: ✅ `width: parent.width * 0.5` → Computed expressions
- **Boolean expressions**: ✅ `visible: isLoggedIn && hasPermission`
- **Conditional (ternary)**: ⚠️ `color: enabled ? "blue" : "gray"`
- **`when:` guards**: ⚠️ Conditional binding activation (evaluate for v1.0)
- **Function calls**: ⚠️ Limited whitelist
  - `Math.max(...)`, `Math.min(...)`: Supported
  - `Math.floor(...)`, `Math.ceil(...)`, `Math.round(...)`: Supported
  - Custom QML functions: ❌ Out of scope

Binding lowering strategy:
- Generate Angular `computed(...)` for complex expressions
- Extract dependencies for reactive tracking
- Diagnostic for unsupported expression forms

### 9. Property Declarations

**Target support**: Typed properties and aliases

Supported forms:
- **`property alias aliasName: target.property`** ⚠️
  - Status: Evaluate for v1.0 (requires component I/O mapping)
  - Maps to: Angular `@Input()` or `@Output()` aliasing pattern

- **Typed properties**: ⚠️
  - `property int value: 42`
  - `property string label: "Default"`
  - `property bool enabled: true`
  - Maps to: Angular Signal declarations (`value = signal<number>(42)`)

- **`property Window windowRef`**: ❌
  - Status: Out of scope for v1.0
  - Reason: Type reference requires type system beyond basic converter

- **`readonly property`**: ⚠️
  - Maps to: `readonly` signal or constant

### 10. Multi-File Components and Assets

**Target support**: Local project components only

- **Project-local `.qml` components**: ⚠️
  - Status: Evaluate for v1.0
  - Example: `CustomButton.qml` → `CustomButtonComponent`
  - Limitation: Single project scope; no cross-module imports

- **`.ui.qml` files**: ⚠️
  - Status: Same as `.qml` (Qt Design Studio convention, no semantic difference in v1.0)

- **Asset resolution**: ⚠️
  - Local images, fonts: Evaluate path resolution strategy
  - External URLs: Supported (pass-through)
  - Bundled assets: Diagnostic for complex asset management

---

## Explicitly Out of Scope (v1.0)

The following constructs are **not supported** in v1.0 and must produce clear diagnostics.

### 1. State Systems

**Status**: ❌ Out of scope (except limited experimental support if feasible)

- **`State`**: Named UI states
- **`PropertyChanges`**: State-dependent property changes
- **`when:` conditions in State**: State activation logic
- **`StateGroup`**: Nested state machines

**Reason**: QML state systems are powerful but require sophisticated state management that goes beyond Angular component patterns. Future versions may support a narrow subset via Angular state management libraries.

**Diagnostic**: "State system not supported in v1.0. Use Angular component state patterns instead."

### 2. Animations, Transitions, and Behaviors

**Status**: ❌ Out of scope for v1.0

- **`Transition`**: State change animations
- **`Behavior`**: Property change animations
- **`Animation`** types: NumberAnimation, ColorAnimation, etc.
- **Timeline** and **Keyframe** systems

**Reason**: QML's animation model is declarative and tightly coupled to its property system. Angular uses imperative animations via Angular Animations API. Bridging these models requires substantial work.

**Diagnostic**: "Animation and transition systems not supported in v1.0. Implement animations using Angular Animations API."

### 3. Graphics-Heavy Constructs

**Status**: ❌ Out of scope for v1.0

- **`SvgPathItem`**: Custom SVG paths (present in 15+ files in corpus)
- **`Shape`**, **`ShapePath`**: Declarative vector graphics (22 instances in corpus)
- **`Canvas`**: Imperative 2D drawing
- **`ShaderEffect`**: Custom GPU shaders
- **Graphics effects**: FastBlur, DropShadow, Glow, ColorOverlay, etc. (33+ instances in corpus)
- **`PieItem`**, **`StarItem`**, **`RegularPolygonItem`**: Qt Quick Studio custom shapes

**Reason**: These constructs rely on Qt's graphics engine. Web equivalents (SVG, Canvas, CSS filters) exist but require case-by-case mapping that's beyond v1.0 scope.

**Diagnostic**: "Graphics effect '{effectType}' not supported. Replace with CSS or SVG alternatives in Angular."

### 4. Complex Design Studio Plugins

**Status**: ❌ Out of scope for v1.0

- **`FlowEffect`**, **`FlowDecision`**, **`FlowWildcard`**: Flow-based logic system
- **`EventSystem`**, **`EventListener`**: Qt Design Studio event bus
- **`EventSimulator`**: Design-time event testing
- **`JsonListModel`**, **`JsonBackend`**: JSON data binding helpers
- **Custom Studio Components**: `BorderItem`, `ArcItem`, `FlipableItem`, etc.

**Reason**: These are Qt Design Studio-specific abstractions with no direct Angular equivalents. They're useful in Qt but don't map to standard web UI patterns.

**Diagnostic**: "Qt Design Studio component '{componentType}' not supported. Implement equivalent functionality using Angular services and components."

### 5. Delegates and Models (Advanced)

**Status**: ❌ Out of scope for v1.0 (basic list model may be evaluated)

- **`ListView`** with complex delegates
- **`GridView`**, **`PathView`**
- **`Repeater`** with model binding
- **`ListModel`**, **`XmlListModel`**
- **Delegate lifecycle**: attached properties, model roles

**Reason**: QML's model/view architecture is sophisticated. Angular has `*ngFor` but with different semantics. A basic `Repeater` with array binding might be feasible, but full model/delegate support is v2+ scope.

**Diagnostic**: "Model/view component '{componentType}' not supported. Use Angular *ngFor for simple lists."

### 6. Imperative JavaScript Blocks

**Status**: ❌ Out of scope beyond minimal handler bodies

- **Function declarations**: `function myFunc() { ... }`
- **Complex logic**: Multi-line imperative code
- **Qt APIs**: `Qt.createComponent()`, `Qt.binding()`, etc.
- **Console/debugging**: `console.log()` (can pass through with warning)

**Reason**: JavaScript semantics differ between QML runtime and Angular. Safe conversion requires sandboxing and rewriting, which is not feasible for v1.0.

**Diagnostic**: "Complex JavaScript function '{functionName}' not supported. Implement logic in Angular component class."

### 7. Advanced Imports and Modules

**Status**: ❌ Out of scope for v1.0

- **Custom QML modules**: `import MyModule 1.0`
- **C++ plugin imports**: `import MyPlugin 1.0`
- **Version-specific imports**: Semantic version handling
- **Conditional imports**: Platform-specific modules

**Allowed imports** (v1.0):
- `import QtQuick` (ignored; assumed baseline)
- `import QtQuick.Controls` (maps to Angular Material)
- `import QtQuick.Layouts` (maps to CSS layout)

**Diagnostic**: "Custom module import '{moduleName}' not supported. Use standard Angular modules and libraries."

---

## Example Corpus Classification

Based on analysis of the FigmaVariants and WebinarDemo example directories:

### Reference-Only Examples (Not v1.0 Targets)

These examples contain **unsupported advanced constructs** and serve as reference corpus for future work:

1. **WebinarDemo/Dependencies/Components**:
   - Uses: `SvgPathItem`, `Shape`, `ShapePath`, graphics effects
   - Uses: `EventSystem`, `EventListener`, custom Studio components
   - Uses: `JsonListModel`, `ListModel`
   - **Status**: Reference corpus; demonstrates advanced Design Studio patterns
   - **Diagnostic**: Files using these constructs will produce unsupported-feature warnings

2. **FigmaVariants with State/Effects**:
   - Example: `LargeButton.ui.qml` (uses `State`, `PropertyChanges`, `SvgPathItem`)
   - **Status**: Reference corpus; demonstrates state-based UI
   - **Diagnostic**: State constructs will produce "not supported" messages

### Potential v1.0 Targets (After Construct Filtering)

These examples **could** be converted if advanced constructs are filtered out:

1. **Simple login.qml**: ✅
   - Uses: `Column`, `Text`, `TextField`, `Button`, `onClicked`, simple binding
   - **Status**: Ideal v1.0 target; already in corpus

2. **Simplified FigmaVariants components** (hypothetical):
   - Strip `State`, `SvgPathItem` → basic `Item`, `Rectangle`, `Text`, `MouseArea`
   - **Status**: Create simplified reference versions for v1.0 validation

3. **Form-like patterns**:
   - Multi-field forms with layout, text, input, buttons
   - **Status**: Primary v1.0 use case

### Diagnostic Strategy for Corpus

When processing the full example corpus:

1. **Parse all files**: Even those with unsupported constructs
2. **Collect diagnostics**: List unsupported object types, properties, handlers
3. **Categorize files**:
   - ✅ **Fully supported**: No unsupported constructs
   - ⚠️ **Partially supported**: Some unsupported features; can generate with warnings
   - ❌ **Unsupported**: Core constructs unsupported; cannot generate meaningful output
4. **Report summary**: "25 files fully supported, 100 files partially supported (with warnings), 173 files unsupported"

This approach validates the converter against real-world corpus while maintaining clear boundaries.

---

## Decision on Shell Types (Window, Item, Rectangle)

### `Window`

**v1.0 Classification**: Recognized root container with limited semantics

- **Input**: QML file with `Window` root
- **Output**: Angular standalone component with viewport-level container
- **Mapping**:
  - `Window.width`, `Window.height` → Component host element styling or viewport meta tags
  - `Window.title` → Could map to document title (via Angular Title service) or ignored
  - `Window.visible` → Ignored (Angular components are visible by default)
- **Limitation**: Does not create actual browser window or modal; purely presentational container

**Example**:

```qml
Window {
    width: 800
    height: 600
    title: "My App"

    Column {
        Text { text: "Hello" }
    }
}
```

→

```typescript
@Component({
  selector: 'app-my-app',
  standalone: true,
  template: `
    <div class="window-root" style="width: 800px; height: 600px;">
      <div class="column">
        <span>Hello</span>
      </div>
    </div>
  `
})
export class MyAppComponent { }
```

### `Item`

**v1.0 Classification**: Generic container (like `<div>`)

- **Input**: QML `Item` node
- **Output**: `<div>` with layout classes
- **Mapping**: Direct pass-through; useful for composition and layout grouping
- **Properties**: Geometry, layout, children
- **Special case**: Root `Item` (instead of `Window`) also maps to component root

### `Rectangle`

**v1.0 Classification**: Styled visual container

- **Input**: QML `Rectangle` node
- **Output**: `<div>` with CSS border and background
- **Mapping**:
  - `color` → CSS `background-color`
  - `border.width`, `border.color` → CSS `border`
  - `radius` → CSS `border-radius`
- **Children**: Can contain other elements (like HTML `<div>`)

---

## Summary

qml-ng v1.0 targets a **small, predictable subset** of QML focused on:

- Basic layout (Row, Column)
- Common form controls (Text, TextField, Button, CheckBox)
- Simple bindings and event handlers
- Explicit geometry and limited anchor patterns

The 298-file example corpus demonstrates that real Qt Design Studio projects contain far more advanced constructs. v1.0 **does not aim to support** the full corpus. Instead:

1. **v1.0 targets**: Simple form-like UIs (login screens, settings panels, basic dashboards)
2. **Corpus examples**: Serve as reference and validation data
3. **Diagnostics**: Clear error messages for unsupported constructs
4. **Future versions**: Expand support incrementally based on user demand

This approach ensures **production quality** for the supported subset while maintaining honest boundaries about what qml-ng cannot yet convert.

---

## Implementation Checklist

To enforce this scope in the codebase:

- [ ] Update `ui-schema.ts` to include diagnostic fields for unsupported constructs
- [ ] Extend `qml-parser.ts` to recognize (but warn about) unsupported object types
- [ ] Update `qml-to-schema.ts` to emit diagnostics for out-of-scope constructs
- [ ] Extend `material-renderer.ts` to handle Window/Item/Rectangle as defined above
- [ ] Add validation pass that categorizes input files as fully/partially/unsupported
- [ ] Update CLI and schematic to show diagnostic summary
- [ ] Add example files showcasing supported v1.0 patterns
- [ ] Document mapping decisions in generated code comments

This scope definition is the foundation for all v1.0 development.
