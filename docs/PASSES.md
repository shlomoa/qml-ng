# Semantic Lowering Pass Architecture

This document describes the multi-pass semantic lowering architecture for converting QML AST to Angular-compatible UI schema.

## Overview

The semantic lowering process is split into **six explicit passes**, each with clearly defined responsibilities. This architecture provides three key advantages:

1. **Testability**: Each pass can be tested in isolation
2. **Clear boundaries**: Unsupported features are flagged at the appropriate stage
3. **Maintainability**: Renderer changes don't force parser changes

## Pass Pipeline

The passes execute in the following order:

```
QML AST → Initial UiNode → Pass Pipeline → Final UiNode
                           │
                           ├─ 1. Structural Normalization
                           ├─ 2. Binding Lowering
                           ├─ 3. Handler Lowering
                           ├─ 4. Layout Lowering
                           ├─ 5. Control Mapping
                           └─ 6. Diagnostics Enrichment
```

## Pass Descriptions

### 1. Structural Normalization Pass

**Location**: `src/lib/passes/structural-normalization.ts`

**Responsibilities**:
- Classify QML types into UiNode kinds (container, text, input, button, image, animation, unknown)
- Set up basic node structure with name and kind
- Initialize empty children arrays
- Detect and flag unsupported QML types (State, animations, graphics effects, etc.)
- Preserve source location information

**Does NOT handle**:
- Bindings or expressions
- Event handlers
- Layout properties
- Control-specific properties

**Example**:
```typescript
// Classifies 'Button' → kind: 'button'
// Classifies 'State' → kind: 'unknown' + warning diagnostic
```

### 2. Binding Lowering Pass

**Location**: `src/lib/passes/binding-lowering.ts`

**Responsibilities**:
- Process text bindings (for Text nodes)
- Process placeholder bindings (for TextField nodes)
- Process source bindings (for Image nodes)
- Process button text bindings (for Button nodes)
- Extract dependency identifiers from expressions
- Ensure proper UiBinding structure with dependency tracking

**Does NOT handle**:
- Event handlers
- Layout properties
- Control classification

**Example**:
```typescript
// Input: text: "Hello " + userName
// Output: { kind: 'expression', expression: "Hello " + userName, dependencies: ['userName'] }
```

### 3. Handler Lowering Pass

**Location**: `src/lib/passes/handler-lowering.ts`

**Responsibilities**:
- Map QML event handler names to Angular event names
  - `onClicked` → `(click)`
  - `onTextChanged` → `(input)`
  - `onPressed` → `(mousedown)`
- Preserve handler bodies for Angular event binding
- Ensure all events have proper Angular event name mappings

**Does NOT handle**:
- Bindings
- Layout
- Control classification

**Example**:
```typescript
// Input: { name: 'onClicked', handler: 'doSomething()' }
// Output: { name: 'onClicked', angularEvent: 'click', handler: 'doSomething()' }
```

### 4. Layout Lowering Pass

**Location**: `src/lib/passes/layout-lowering.ts`

**Responsibilities**:
- Process anchor properties (`anchors.fill`, `anchors.centerIn`)
- Convert QML layout properties to UiLayout structure
- Handle `fillParent` and `centerInParent` patterns
- Ensure layout information is properly structured

**Does NOT handle**:
- Bindings
- Event handlers
- Control classification

**Example**:
```typescript
// Input: anchors.fill: parent
// Output: layout: { fillParent: true }
```

### 5. Control Mapping Pass

**Location**: `src/lib/passes/control-mapping.ts`

**Responsibilities**:
- Map QML control types to Angular Material equivalents
- Add control-specific metadata
- Flag unsupported control-specific features
- Add info diagnostics for partially supported controls (e.g., ShapePath)

**Does NOT handle**:
- Initial type classification (done by Structural Normalization)
- Bindings or event handlers

**Example**:
```typescript
// Input: ShapePath node
// Output: Same node + info diagnostic about partial support
```

### 6. Diagnostics Enrichment Pass

**Location**: `src/lib/passes/diagnostics-enrichment.ts`

**Responsibilities**:
- Add warnings for unknown types not caught by earlier passes
- Validate node structure and flag inconsistencies
- Add helpful info messages for edge cases
- Collect and aggregate diagnostic information
- Final cross-cutting validation

**Does NOT handle**:
- Node transformation (read-only validation pass)

**Example**:
```typescript
// Input: unknown node kind without diagnostic
// Output: Same node + warning diagnostic for unknown type
```

## Pass Interface

All passes implement the `LoweringPass` interface:

```typescript
export interface LoweringPass {
  readonly name: string;
  transform(node: UiNode, context: PassContext): UiNode;
}
```

The `PassContext` contains:
- `diagnostics`: Array that passes can append to
- `filePath`: Optional file path for diagnostic reporting

## Usage Example

```typescript
import {
  PassPipeline,
  StructuralNormalizationPass,
  BindingLoweringPass,
  HandlerLoweringPass,
  LayoutLoweringPass,
  ControlMappingPass,
  DiagnosticsEnrichmentPass,
  PassContext
} from './lib/passes';

// Create the pipeline
const pipeline = new PassPipeline()
  .add(new StructuralNormalizationPass())
  .add(new BindingLoweringPass())
  .add(new HandlerLoweringPass())
  .add(new LayoutLoweringPass())
  .add(new ControlMappingPass())
  .add(new DiagnosticsEnrichmentPass());

// Execute on a node
const context: PassContext = {
  diagnostics: [],
  filePath: 'example.qml'
};

const result = pipeline.execute(initialNode, context);
console.log(`Executed passes: ${pipeline.getPassNames().join(', ')}`);
console.log(`Diagnostics: ${context.diagnostics.length}`);
```

## Backward Compatibility

The `qml-to-ui.ts` module maintains backward compatibility by:

1. Exporting legacy functions that delegate to the appropriate pass:
   - `lowerBinding()` → `BindingLoweringPass.lowerBinding()`
   - `isQmlHandlerName()` → `HandlerLoweringPass.isQmlHandlerName()`
   - `mapQmlHandler()` → `HandlerLoweringPass.mapQmlHandler()`

2. The `qmlNodeToUi()` function internally uses the pass pipeline but maintains the same external API.

## Future Extensions

The pass architecture makes it easy to add new capabilities:

### Potential New Passes

1. **Component Resolution Pass**: Resolve multi-file custom component references
2. **Asset Classification Pass**: Classify and validate asset references
3. **Shell Handling Pass**: Handle Window/Item/Rectangle root-shell patterns
4. **Unsupported Feature Reporting Pass**: Generate detailed reports for advanced constructs
5. **Type Checking Pass**: Validate typed properties and property aliases
6. **Optimization Pass**: Tree-shaking and simplification of the UI schema

### Adding a New Pass

1. Create a new file in `src/lib/passes/`
2. Implement the `LoweringPass` interface
3. Add it to the pipeline in `qml-to-ui.ts`
4. Export it from `src/lib/passes/index.ts`
5. Add documentation to this file

Example:

```typescript
export class MyNewPass implements LoweringPass {
  readonly name = 'my-new-pass';

  transform(node: UiNode, context: PassContext): UiNode {
    // Transform logic here
    return processedNode;
  }
}
```

## Testing Strategy

Each pass should have:

1. **Unit tests**: Test the pass in isolation with mock UiNode inputs
2. **Integration tests**: Test the pass within the full pipeline
3. **Regression tests**: Test against real QML examples

The pass architecture makes it easy to test specific transformations without running the entire conversion pipeline.

## Design Principles

1. **Single Responsibility**: Each pass does one thing well
2. **Immutability**: Passes return new nodes rather than mutating input
3. **Composability**: Passes can be added, removed, or reordered
4. **Diagnostics**: Passes append to a shared diagnostics array
5. **Location Preservation**: Source locations flow through all passes
6. **No Side Effects**: Passes are pure functions (except for diagnostics)

## Performance Considerations

- Passes execute sequentially, not in parallel
- Each pass recursively processes the entire tree
- For large files with deep nesting, this can be O(n × p) where n is nodes and p is passes
- Future optimization: Consider a single-pass visitor pattern for hot paths
- Current corpus (300 files): Performance is acceptable with 6 passes

## Related Documentation

- `GRAMMAR.md`: Formal grammar specification for QML parsing
- `SCOPE.md`: Product scope and supported QML subset
- `src/lib/passes/`: Pass implementation source code
- `src/lib/schema/ui-schema.ts`: UI schema type definitions
