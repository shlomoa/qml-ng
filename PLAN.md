Here is the production roadmap, with the Angular-first direction made explicit.

The short answer on `node:fs` and `node:path` is: they are acceptable only at the **outer boundary** of the system, such as a standalone CLI that reads a `.qml` file from disk. They should **not** be the main mechanism inside the generator itself. For production quality, the core generation flow should lean on Angular schematics and the Angular DevKit virtual file system (`Tree`), because schematics are specifically designed to create, update, and maintain Angular projects in a structured way. Angular’s current guidance still positions schematics as the standard way to package generators into collections and apply project transformations, and Angular continues to emphasize standalone components and Signals as first-class patterns. ([Angular][1])

The current example corpus is also much larger than the original starter scope. The repository now contains roughly 300 QML or `.ui.qml` files, around 130 object types, and many multi-file bundles from Qt Design Studio-style projects. That corpus includes app-shell types like `Window`, foundational primitives like `Item`, `Rectangle`, and `Image`, layout families like `StackLayout` and `RowLayout`, interaction primitives like `MouseArea` and `Connections`, and advanced design constructs such as `State`, `PropertyChanges`, `Timeline`, `Keyframe`, `SvgPathItem`, `ShaderEffect`, and `FastBlur`. The roadmap should therefore be read as a plan for handling a project-shaped QML corpus, not only a tiny hand-written subset.

## 1. Target architecture to aim for

The production target should be a **compiler-style toolchain**, not a file-spitting script:

`QML source → tokenizer → parser → QML AST → semantic model → Angular lowering → Angular renderer → schematic/project integration`

That separation matters because QML structure, QML reactivity, Angular Signals, Angular templates, and Angular Material imports are different concerns. Your current starter already hints at this, but production quality means each stage becomes independently testable, versioned, and replaceable. Schematics are especially useful here because Angular documents them as a mechanism for generating and modifying project files while enforcing organization-wide conventions. ([Angular][2])

## 2. Reduce Node usage to the edges

Keep `node:fs` and `node:path` only in these cases:

* a local developer CLI wrapper that reads a QML file path and prints or writes output
* optional test harnesses and fixture loaders
* packaging/build scripts outside the Angular generation engine

Do **not** make them the primary abstraction in the converter itself. Inside the production generator, prefer:

* Angular schematic `Tree` for file creation and updates
* schematic options and JSON schemas for inputs
* Angular workspace-aware behavior rather than raw path concatenation
* Angular component metadata generation based on standalone patterns

That keeps the engine aligned with Angular’s own tooling model instead of acting like a general Node codegen script that happens to output Angular files. ([Angular][1])

## 3. Phase-by-phase plan to reach production quality

### Step 1: Lock the product scope

Before improving code, freeze the supported QML subset for version 1.0 using the expanded example corpus as the reference set. At minimum, explicitly classify the following groups:

* app shells and root nodes: `Window`, `Item`, `Rectangle`
* layout and composition primitives: `Row`, `Column`, `StackLayout`, `RowLayout`, `ColumnLayout`, `Loader`
* text/input/action controls: `Text`, `TextField`, `Button`, `CheckBox`
* visual and media primitives: `Image`
* interaction primitives: `MouseArea`, `Connections`
* selected anchors and geometry: `fill`, `centerIn`, left/right/top/bottom variants, `x`, `y`, `width`, `height`
* selected handlers: `onClicked`, `onTextChanged`, `onPressed`, and simple assignment-style handlers
* selected binding patterns: identifiers, dotted paths, arithmetic, boolean expressions, `when:` guards, and common function calls such as `Math.max(...)`
* property forms that now appear throughout the corpus: `property alias`, typed properties, and declarations such as `property Window ...`
* multi-file component references and local asset resolution for project-local `.qml` and `.ui.qml` files

Also define what is explicitly out of scope for v1:

* full state systems beyond a narrow approved subset: `State`, `PropertyChanges`, `Timeline`, `KeyframeGroup`, `Keyframe`
* transitions, behaviors, and animations
* graphics-heavy or effect-heavy constructs such as `SvgPathItem`, `ShaderEffect`, `FastBlur`, and custom drawing/canvas
* complex Design Studio plugin surfaces and custom imported modules beyond a first approved list
* delegates/models beyond a first limited version
* imperative JS blocks beyond a small safe subset

Production quality starts with stable boundaries. Otherwise the parser and lowering logic will keep shifting under you. With the current corpus size, this step is no longer just about a few controls; it is about deciding what happens when the converter sees real app shells, bundle-level component graphs, assets, and many unsupported advanced constructs in the same run. Angular schematics are strongest when they generate repeatable, constrained patterns, not when they try to absorb an unbounded language all at once. ([Angular][2])

### Step 2: Replace heuristic parsing with a formal grammar layer

Your current parser is a practical subset parser. Production quality requires a stricter grammar and clearer error model.

Do this in order:

* define the QML subset grammar you support
* distinguish lexical errors from syntax errors
* preserve source locations on every token, property, and object node
* parse handlers, bindings, literals, arrays, and nested objects as different AST node kinds
* add structured diagnostics with severity and recovery

The goal is not “parse everything QML supports.” The goal is “parse your supported subset reliably, and fail gracefully with actionable diagnostics.” This is the single biggest quality multiplier because every later stage depends on AST correctness. The reason to do this before fancy rendering is that Angular’s downstream generation is deterministic, while parser bugs create silent bad output. ([Angular][1])

### Step 3: Introduce a real expression AST

This is the most important Phase 4 move after your current Phase 3.

Right now expression lowering is string-based. Production quality requires:

* expression tokenizer
* expression parser
* AST nodes for identifiers, member access, calls, unary/binary ops, conditionals, literals
* dependency extraction from AST, not regex
* explicit lowering rules from QML expressions to Angular expressions

That unlocks:

* correct `computed(...)` generation
* correct chaining and precedence
* safer rewrites to signal reads like `user().name`
* future support for caching and dependency graphs

Angular’s Signals model makes this especially worthwhile because `computed` is meant for derived state. The cleaner your expression AST is, the cleaner your generated `computed(...)` values will be. ([Angular][3])

### Step 4: Split semantic lowering into explicit passes

Do not keep one big `qml-to-ui.ts` file for everything. Move to explicit lowering passes:

* structural normalization
* binding lowering
* handler lowering
* layout lowering
* control mapping
* diagnostics enrichment

Each pass should take one schema and return another schema, possibly with added diagnostics.

That gives you three advantages:
first, each pass is testable in isolation; second, unsupported features can be flagged at the right stage; third, later Angular changes can be localized to the renderer layer instead of forcing parser changes. This is how you keep the system Angular-centered without making Angular concerns leak back into parsing. ([Angular][2])

### Step 5: Make Signals the default reactive target

For production quality, Signals should be the primary output model for generated local state.

Use:

* `signal(...)` for writable local state
* `computed(...)` for derived state
* signal-based queries and signal-friendly patterns where needed

Avoid generating older Angular patterns by default unless interoperability requires them. Angular’s current docs position Signals as the core reactivity model, and standalone components are now the mainstream authoring style. That makes Signals the right long-term target for generated bindings. ([Angular][3])

### Step 6: Move all generation into Angular schematics

For production, the main user-facing entry point should be a schematic collection, not a Node CLI.

Recommended model:

* `ng generate your-collection:qml-component --qmlFile=... --name=...`
* schematic reads options
* schematic uses Angular DevKit `Tree`
* schematic emits component files into the workspace
* schematic updates routes or feature indexes if requested
* schematic can validate Angular workspace shape before writing

You can still keep a thin CLI for non-Angular experimentation, but the primary path should be schematic-driven. Angular explicitly documents schematics for creating and modifying projects, and that fits your use case much better than ad hoc file writes. ([Angular][1])

### Step 7: Replace raw path logic with workspace-aware generation

This is where `node:path` should largely disappear from the generator core.

Instead of treating paths as strings, generation should understand:

* Angular workspace structure
* target project
* feature folder
* standalone component placement
* optional barrel file updates
* route insertion rules

Use Node path helpers only in small boundary adapters if needed. The core generator should think in terms of Angular workspace destinations and schematic templates, not arbitrary filesystem strings. That aligns better with Angular workspace configuration and reduces Windows/Linux path bugs. ([Angular][4])

### Step 8: Build a real Angular renderer contract

Today your renderer mixes schema walking, import collection, computed declaration generation, and template output.

For production, split it into sub-renderers:

* TypeScript renderer
* HTML renderer
* SCSS renderer
* imports resolver
* naming service
* diagnostics/comments emitter

That allows you to:

* test TS emission separately from template emission
* swap Angular Material mapping strategies later
* support alternative render targets if needed
* prevent duplicated logic between imports and template generation

The renderer should target current Angular defaults:

* standalone components
* direct `imports: [...]`
* modern template syntax where applicable
* style and naming aligned with Angular style guidance. ([Angular][5])

### Step 9: Make Material imports rule-based, not hardcoded

Automatic Material imports are good, but production quality means formalizing the mapping.

Create a registry like:

* schema node kind → template renderer
* schema node kind → required Angular imports
* schema node kind → required Material imports
* schema node kind → optional theme hooks
* schema node kind → accessibility rules

Then every supported QML control maps through that registry. That gives you maintainability and makes it easy to extend from `Button` and `TextField` to richer Angular Material controls later. Schematics are good at generating repeated patterns from registries and templates, which matches this design. ([Angular][2])

### Step 10: Build a first-class layout subsystem

Your current `anchors.*` lowering is a good start, but production quality needs a dedicated layout engine.

Do it in three maturity levels:

* level 1: intent mapping (`fill`, `centerIn`, basic edge alignment)
* level 2: container-aware resolution (`Row`, `Column`, parent sizing, stretch rules)
* level 3: constraint approximation with conflict detection

Important: do not promise exact Qt layout fidelity. Instead, classify each layout rule as:

* exact
* approximate
* unsupported

Then surface that in diagnostics or comments. This is better than silent wrong CSS.

The Angular side remains normal component styling, which Angular supports directly through component styles; the trick is keeping the lowering disciplined rather than letting CSS hacks spread everywhere. ([Angular][6])

### Step 11: Add event safety and behavior modeling

Handlers such as `onClicked:` must be treated as code, not plain strings.

Production quality requires:

* parsing handler bodies into a minimal AST or controlled expression subset
* validating allowed operations
* mapping handlers to Angular template events safely
* generating method stubs when necessary
* diagnosing unsupported imperative code instead of blindly copying it

This is where many generators become unsafe or brittle. The safe approach is to define a supported handler subset and fail clearly outside it. Since Angular templates and component class methods have different execution models than QML handlers, being explicit here is critical. ([Angular][2])

### Step 12: Add project integration features as schematics, not custom scripts

For production, you will likely need more than “generate one component.” Add separate schematics for:

* generate component from QML
* generate feature from a QML bundle
* update route configuration
* migrate existing generated code to newer output conventions
* validate generated project consistency

Angular’s own ecosystem uses schematics not only for generation but also for migrations, and that is the clean way to evolve generated output over time without forcing users to recreate everything. ([Angular][1])

### Step 13: Build a serious testing strategy

Production quality needs at least five test layers:

* tokenizer tests
* parser tests
* semantic lowering tests
* renderer golden-file tests
* schematic integration tests against sample Angular workspaces

Also add:

* snapshot tests for generated TS/HTML/SCSS
* diagnostics tests for unsupported features
* regression tests from real QML samples
* compile checks of generated Angular components

The golden-file approach is especially valuable for generators because it lets you review diffs intentionally when output changes. Angular’s strong conventions and predictable standalone component output make this test style a good fit. ([Angular][2])

### Step 14: Add performance and scale checks

A production converter needs to handle batches, not just single files.

Plan for:

* bulk conversion of many QML files
* incremental regeneration
* caching parsed ASTs or intermediate schemas
* memory-bounded processing
* timing metrics by stage

Angular’s guidance on slow computations is aimed at apps, but the principle still applies: isolate expensive work, measure it, and avoid repeated heavy computations. In your generator, expression analysis and layout lowering are likely hotspots once the subset grows. ([Angular][7])

### Step 15: Harden developer experience

For a production tool, developer trust matters as much as raw capability.

Add:

* clear diagnostics with source positions
* readable generated code
* stable naming
* deterministic ordering of imports and declarations
* generated comments where approximation happened
* a dry-run mode
* a diff mode
* a “strict” mode that fails on unsupported features

Schematics naturally support dry-run-style workflows much better than raw filesystem scripts, which is another reason to keep Angular tooling central. ([Angular][1])

### Step 16: Add upgrade and migration strategy from day one

Once teams start relying on generated output, changing conventions becomes expensive.

So define:

* generator versioning
* output compatibility policy
* migration schematics for old output
* schema versioning for your intermediate model
* deprecation path for unsupported or changing features

Angular already uses schematic-based migrations for framework evolution, and that is the right model for your generator too. ([Angular][8])

## 4. Recommended implementation order

Build in this order:

1. freeze QML v1 subset
2. formalize tokenizer and parser diagnostics
3. introduce expression AST
4. split semantic lowering into multiple passes
5. move generation fully into schematics + `Tree`
6. formalize Material mapping registry
7. expand layout subsystem
8. harden handler support
9. add golden tests and workspace integration tests
10. add migration schematics and versioning

That order reduces rework. In particular, do not spend too much time polishing rendered Angular until the parser and lowering contracts are stable.

## 5. Direct answer: should you keep `node:fs` and `node:path`?

Yes, but only minimally.

Keep them for:

* a standalone CLI wrapper
* test fixture loading
* package/build utilities

Do not use them as the core generation mechanism.

Inside the production solution, prefer:

* Angular schematics
* Angular DevKit `Tree`
* Angular workspace-aware generation
* standalone component output
* Signals and `computed(...)` for reactivity

That gives you a tool that feels like Angular, evolves like Angular, and plugs into Angular projects the way Angular expects. ([Angular][1])

## 6. Concrete architecture recommendation

If this were my production blueprint, I would structure it like this:

* `packages/compiler-core`

  * tokenizer
  * parser
  * AST
  * expression AST
  * diagnostics
* `packages/semantic-model`

  * canonical schema
  * normalization passes
  * layout lowering
  * event lowering
  * binding lowering
* `packages/angular-renderer`

  * TS renderer
  * template renderer
  * SCSS renderer
  * Material import registry
* `packages/angular-schematics`

  * collection
  * generators
  * migrations
  * workspace integration
* `packages/testing`

  * golden fixtures
  * sample QML corpus
  * generated Angular compile checks

That still uses Node for packaging because Angular tooling runs in that ecosystem, but the **design center** remains Angular generation rather than generic Node file manipulation. ([Angular][1])

The strongest next move is to refactor the current repo toward this Angular-first shape: remove `fs/path` from the schematic path, push them out to the CLI boundary, and make the schematic + `Tree` flow the primary runtime.

[1]: https://angular.dev/tools/cli/schematics-authoring?utm_source=chatgpt.com "Authoring schematics"
[2]: https://angular.dev/tools/cli/schematics?utm_source=chatgpt.com "Generating code using schematics"
[3]: https://angular.dev/guide/signals?utm_source=chatgpt.com "Signals • Overview"
[4]: https://angular.dev/reference/configs/workspace-config?utm_source=chatgpt.com "Workspace configuration"
[5]: https://angular.dev/api/core/Component?utm_source=chatgpt.com "Component"
[6]: https://angular.dev/guide/components/styling?utm_source=chatgpt.com "Styling components"
[7]: https://angular.dev/best-practices/slow-computations?utm_source=chatgpt.com "Slow computations"
[8]: https://angular.dev/reference/migrations/inject-function?utm_source=chatgpt.com "Migration to the inject function"
