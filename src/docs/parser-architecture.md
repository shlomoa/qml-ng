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

## Parser
The parser supports the QML subset used by this starter:

- object declarations like `Button { ... }`
- nested child objects
- properties like `text: "Save"`
- dotted property names like `anchors.fill: parent`
- handlers like `onClicked: submit()`

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
