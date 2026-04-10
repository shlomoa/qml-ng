# Parser Architecture

The parser is intentionally split into tokenizer + recursive parser.

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
The parser supports the QML subset used by this starter:

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

## Property value strategy
Property values are captured in a lightweight structured way:

- string literal
- number literal
- boolean-like identifier
- expression text
- object reference text

That keeps the parser simple while still enabling semantic lowering later.

## Why handlers stay as properties initially
At parse time, `onClicked:` is just a property assignment.
At normalization time, it becomes a `UiEvent`.

That separation keeps the parser generic and the converter domain-aware.
