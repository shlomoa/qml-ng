# QML → Angular Material Converter
## Architecture Document — Phase 3

## 1. Purpose

This repository implements a starter compiler pipeline that converts a practical subset of QML into Angular standalone components using Angular Material.

The design goal is not pixel-perfect Qt reproduction. The design goal is semantic preservation of:

- UI structure
- reactive intent
- user interaction handlers
- basic layout intent

The repository now also carries a much larger example corpus under [`examples/FigmaVariants`](./examples/FigmaVariants) and [`examples/WebinarDemo`](./examples/WebinarDemo). Those projects introduce hundreds of QML files and a much wider set of building blocks, including custom controls, `QtQuick.Layouts`, `QtQuick.Templates`, state machines, timeline/keyframe constructs, graphics primitives, effects, and multi-file component bundles. They should be treated as architectural pressure tests and regression fixtures rather than as a statement of already-supported output.

At the current snapshot, the example corpus is already large enough to act as a design constraint:

- about 298 QML or `.ui.qml` files
- about 130 object types and 40 import forms
- hundreds of `property alias` declarations and typed properties
- substantial use of `Loader`, `StackLayout`, states, `PropertyChanges`, `Timeline`, and `Keyframe`
- supporting design assets such as images, fonts, and shader fragments

That scale changes the architecture conversation. The system is no longer only about converting a tiny hand-written subset; it also needs a credible strategy for diagnostics, bundle resolution, unsupported feature handling, and regression testing against real project-shaped inputs.

That leads to a layered compiler architecture:

```text
QML source
→ tokenizer
→ recursive parser
→ QML AST
→ canonical UI schema
→ semantic lowering
→ Angular Material renderer
→ Angular schematic output
```

## 2. Evolution

### Phase 1
Basic structure mapping only.

### Phase 2
Introduced:
- tokenizer
- recursive AST parser
- property classification
- Signals-oriented binding support
- automatic Material imports

### Phase 3
Introduced:
- expression lowering to `computed(...)`
- handler support like `onClicked: submit()`
- first real layout resolver for `anchors.*`
- schema enrichment for bindings, events, and layout

## 3. Core Design

The architecture is deliberately split into four concerns.

The larger example corpus also exposes cross-cutting concerns around:

- file graph resolution across many reusable QML components
- asset resolution for images, fonts, and shader-backed visuals
- diagnostics that stay actionable when many unsupported constructs appear in one bundle

### 3.1 Parsing
Parsing turns text into a structured QML AST.

Responsibilities:
- tokenize identifiers, literals, punctuation
- parse nested object declarations
- parse property assignments
- keep handlers and ordinary properties distinguishable
- leave room for example-driven constructs such as property aliases, state blocks, `PropertyChanges`, arrays, and richer import usage to be modeled explicitly rather than guessed

### 3.2 Normalization
Normalization converts QML-specific nodes into a canonical schema that is independent of Angular.

Responsibilities:
- map `Column`, `Row`, `Text`, `TextField`, `Button`
- represent text and placeholder values as bindings rather than plain strings
- collect handlers such as `onClicked`
- collect anchor properties into layout metadata

The larger examples make it clear that future normalization work will need to absorb a broader primitive set such as `Item`, `Rectangle`, `Image`, `CheckBox`, layout containers from `QtQuick.Layouts`, and custom component references spanning multiple source files.

### 3.3 Semantic lowering
This is the Phase 3 compiler layer.

Responsibilities:
- classify expressions into literal vs reactive
- lower reactive expressions to Angular Signals concepts
- map QML handlers into Angular template event bindings
- map selected anchor semantics into CSS/flex behavior

The example corpus adds direct pressure on this layer because it leans on property aliases, typed properties, stateful variants, timeline data, drag interactions, `when:` guards, `Math.max(...)`, logical expressions, and component-to-component bindings that do not fit comfortably in the current string-heuristic lowering model.

### 3.4 Rendering
Rendering generates Angular source files.

Responsibilities:
- per-component Material imports
- standalone component TypeScript
- Angular template
- SCSS layout rules
- placeholder diagnostics for unsupported features

The renderer is still Angular Material-first, but the examples show that longer-term rendering will need a more formal contract for non-Material primitives, image-backed and graphics-heavy widgets, bundle-level composition, asset references, and explicit unsupported markers when fidelity would otherwise be misleading.

## 4. Parser Architecture

## 4.1 Tokenizer

The tokenizer emits a small stream of tokens:

- identifier
- string
- number
- `{` `}` `[` `]` `:` `,` `.`
- newline
- eof

This is enough for a practical QML subset because QML object declarations are tree-shaped and property assignments are colon-based.

## 4.2 Recursive parser

The parser understands object declarations of the form:

```qml
Button {
  text: "Save"
  onClicked: submit()
}
```

Each object becomes:

- a `typeName`
- a list of `properties`
- a list of `children`

Handlers are not thrown away. They remain properties at parse time, then get reclassified during normalization.

## 4.3 Why not do direct string conversion

Direct string conversion is fragile because these are different semantic systems:

- QML bindings are implicitly reactive
- Angular requires explicit signal and computed wiring
- QML anchors are constraint-like
- Angular layout is CSS-driven

Holding structure in an AST and schema lets later stages make deliberate choices.

## 5. Canonical Schema

The canonical schema is the compiler contract between normalization and rendering.

It includes:

- UI nodes
- bindings
- events
- layout

```ts
export interface UiBinding {
  kind: 'literal' | 'expression';
  value?: string | number | boolean;
  expression?: string;
  dependencies: string[];
}

export interface UiEvent {
  name: string;
  angularEvent: string;
  handler: string;
}

export interface UiLayout {
  fillParent?: boolean;
  centerInParent?: boolean;
}

export interface UiNode {
  kind: 'container' | 'text' | 'input' | 'button' | 'unknown';
  id?: string;
  name?: string;
  text?: UiBinding;
  placeholder?: UiBinding;
  layout?: UiLayout;
  events: UiEvent[];
  children: UiNode[];
  meta?: Record<string, unknown>;
}
```

## 6. Expression lowering

### Problem
QML:

```qml
text: user.name
```

Angular should not inline that as a static string.

### Strategy
Bindings are classified:

- literals stay inline
- simple identifiers and dotted paths become reactive expressions
- nontrivial expressions also become computed expressions in this starter

### Example

QML:

```qml
Text {
  text: user.name
}
```

Generated Angular TS:

```ts
readonly user = signal<any>(null);
readonly textExpr1 = computed(() => this.user()?.name);
```

Generated Angular HTML:

```html
<span>{{ textExpr1() }}</span>
```

This starter uses a simple dependency detector and expression rewrite. It is intentionally conservative.

## 7. Handler mapping

QML handler names are mapped to Angular template events.

Examples:

- `onClicked` → `(click)`
- `onTextChanged` → `(input)`
- `onPressed` → `(mousedown)`

QML:

```qml
Button {
  text: "Submit"
  onClicked: submit()
}
```

Angular:

```html
<button mat-raised-button (click)="submit()">Submit</button>
```

## 8. Layout resolver

This repository introduces a first real resolver for selected `anchors.*`.

Supported today:

- `anchors.fill: parent`
- `anchors.centerIn: parent`

Mappings:

- `fill` → width/height 100% and block/flex host usage
- `centerIn` → flex centering

QML:

```qml
Column {
  anchors.centerIn: parent
}
```

Angular SCSS:

```scss
:host {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

This is an approximation layer. It preserves layout intent, not exact Qt constraints.

## 9. Automatic Material imports

The renderer walks the schema and collects only what each component uses.

Examples:
- buttons add `MatButtonModule`
- text fields add `MatFormFieldModule` and `MatInputModule`

This keeps generated components smaller and clearer.

The larger examples also make clear that a Material import registry is not enough by itself. Production rendering will need a broader component mapping registry that can:

- map supported controls to Angular Material or plain Angular patterns
- route unsupported graphics-heavy controls to explicit placeholders or diagnostics
- keep asset and style dependencies visible rather than silently dropping them

## 9.1 Example corpus as test and roadmap input

The example folders should play different roles in the architecture:

- `examples/login.qml` stays the fast smoke fixture for the currently supported subset
- curated files from `examples/FigmaVariants` and `examples/WebinarDemo` should be used as parser, lowering, renderer, and diagnostics fixtures
- broader directory-level runs over those folders should inform schematic integration, performance work, and migration planning

Treating the corpus this way helps keep the implementation honest without pretending that all 298 files are already convertible.

## 10. Repository layout

```text
src/
  cli.ts
  index.ts
  docs/
    parser-architecture.md
  lib/
    qml/
      ast.ts
      tokenizer.ts
      parser.ts
    schema/
      ui-schema.ts
    converter/
      expression-lowering.ts
      event-mapper.ts
      layout-resolver.ts
      qml-to-ui.ts
    angular/
      material-imports.ts
      material-renderer.ts
  schematics/
    qml-component/
      index.ts
      schema.json
      files/
        __name@dasherize__.component.ts.template
        __name@dasherize__.component.html.template
        __name@dasherize__.component.scss.template
examples/
  login.qml
  FigmaVariants/
  WebinarDemo/
```

## 11. Next steps after Phase 3

The strongest next step would be:

- full expression AST instead of string heuristics
- computed chaining and dependency graph
- more events
- more layout constraints
- component extraction and template splitting
- bundle-aware file graph and asset handling
- richer Material mapping
- example-driven golden tests over the larger sample corpus
