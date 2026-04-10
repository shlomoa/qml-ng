# Parser Architecture

The parser is intentionally split into tokenizer + recursive parser.

The current parser architecture also needs to be read against the much larger example corpus now
living under `examples/`. That corpus includes root objects such as `Window`, foundational
primitives such as `Item`, `Rectangle`, `Image`, and `CheckBox`, layout families such as
`StackLayout`, `RowLayout`, and `ColumnLayout`, bundle-level custom component references, and
advanced constructs such as `State`, `PropertyChanges`, `Timeline`, and `Keyframe`. The parser
does not need to semantically understand all of those forms today, but it does need a clear
structural strategy for accepting, classifying, and diagnosing them.

## Tokenizer
The tokenizer produces a compact token stream that is easier to reason about than raw text.

Token kinds:
- identifier
- string
- number
- punctuation
- newline
- eof

It also skips both QML line comments (`// ...`) and C-style block comments (`/* ... */`) so
Design Studio generated files can be parsed without special-case pre-cleaning.

## Parser
The parser currently supports the structural subset used by this starter:

- top-level `import` preamble lines before the root object; these are consumed and ignored by
  the AST because they are part of file setup, not the UI tree
- qualified object declarations like `T.Button { ... }` and `M.ListModel { ... }`
- nested child objects
- properties like `text: "Save"`
- dotted property names like `anchors.fill: parent`
- handlers like `onClicked: submit()`
- typed property declarations like `property alias foo: bar`, `property bool open: false`,
  `readonly property int width: 1920`, and `default property alias item: stack.children`
- multiline property expressions with balanced parentheses, brackets, and braces
- `function` and `signal` declarations, which are skipped conservatively rather than modeled
- resolved component source paths for child objects when the parser can map a type name to a
  project-local `.qml` or `.ui.qml` file

The larger corpus now makes a few additional requirements explicit:

- root objects such as `Window` must be treated as ordinary structural object nodes rather than
  special-cased parser failures
- typed declarations such as `property Window eventDialog: Window { ... }` need to be preserved
  structurally even if later stages do not yet lower them
- state and timeline families such as `State`, `PropertyChanges`, `Timeline`, `KeyframeGroup`,
  and `Keyframe` should have a deliberate parse strategy: either model them as first-class AST
  nodes later or preserve them predictably as object/property structures with diagnostics
- multi-file custom component references are now a normal case, not an edge case, because the
  example corpus is bundle-shaped rather than single-file

The parser document should therefore distinguish between:

- constructs the parser can already accept structurally
- constructs the parser should preserve conservatively for later semantic passes
- constructs that should fail with explicit diagnostics instead of being guessed

## Property value strategy
Property values are captured in a lightweight structured way:

- string literal
- number literal
- boolean-like identifier
- expression text
- object reference text

That keeps the parser simple while still enabling semantic lowering later.

With the larger corpus, this lightweight strategy is now carrying more responsibility than before.
It must be stable enough for:

- typed property declarations
- alias declarations
- object-valued properties
- richer expression text used in layout and implicit sizing
- example-driven unsupported constructs that still need good diagnostics

## Why handlers stay as properties initially
At parse time, `onClicked:` is just a property assignment.
At normalization time, it becomes a `UiEvent`.

That separation keeps the parser generic and the converter domain-aware.

The same principle should apply to other larger-scope structures from the examples. `Window`,
`State`, `Timeline`, and project-local custom component references should first survive parsing in
a predictable structural form. Semantic meaning can then be added, approximated, or diagnosed in
later passes.
