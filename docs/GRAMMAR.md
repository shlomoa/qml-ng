# QML Subset Grammar Specification

This document defines the formal grammar for the QML subset supported by qml-ng v1.0.

## Lexical Structure

### Tokens

```
IDENTIFIER    = [A-Za-z_][A-Za-z0-9_]*
STRING        = '"' ( [^"\\] | '\\' . )* '"' | "'" ( [^'\\] | '\\' . )* "'"
NUMBER        = [0-9]+ ( '.' [0-9]+ )?
LBRACE        = '{'
RBRACE        = '}'
LBRACKET      = '['
RBRACKET      = ']'
COLON         = ':'
COMMA         = ','
DOT           = '.'
NEWLINE       = '\n'
COMMENT       = '//' [^\n]* | '/*' .* '*/'
WHITESPACE    = [ \t\r]+
```

### Lexical Rules

- Comments and whitespace are ignored except as token separators
- Newlines are significant in the grammar
- Keywords are context-dependent (e.g., `property`, `readonly`, `import`, `pragma`)

## Syntax Grammar

### Document Structure

```
Document       = Preamble RootObject
Preamble       = ( Import | Pragma )*
Import         = 'import' QualifiedId Version?
Pragma         = 'pragma' IDENTIFIER ( IDENTIFIER )*
Version        = NUMBER '.' NUMBER
RootObject     = QualifiedId ObjectBody
```

### Object Definitions

```
ObjectBody     = LBRACE Member* RBRACE
Member         = Property
               | Handler
               | Signal
               | Function
               | Component
               | ChildObject
               | Comment

ChildObject    = QualifiedId ObjectBody
QualifiedId    = IDENTIFIER ( DOT IDENTIFIER )*
```

### Properties

```
Property       = TypedProperty | SimpleProperty
TypedProperty  = PropertyPrefix QualifiedId IDENTIFIER COLON PropertyValue
PropertyPrefix = 'property' | 'readonly' 'property' | 'required' 'property' | 'default' 'property'
SimpleProperty = DottedName COLON PropertyValue
DottedName     = IDENTIFIER ( DOT IDENTIFIER )*
PropertyValue  = Literal
               | Binding
               | Array
               | InlineObject
               | PropertyAlias

PropertyAlias  = 'alias' IDENTIFIER ( DOT IDENTIFIER )?
```

### Property Values

```
Literal        = STRING | NUMBER | IDENTIFIER
Binding        = Expression
Array          = LBRACKET ( PropertyValue ( COMMA PropertyValue )* )? RBRACKET
InlineObject   = QualifiedId ObjectBody
Expression     = /* Complex expressions - parsed but not fully specified in v1.0 */
```

### Handlers

```
Handler        = HandlerName COLON HandlerBody
HandlerName    = 'on' IDENTIFIER  /* e.g., onClicked, onTextChanged */
HandlerBody    = Statement | LBRACE Statement* RBRACE
Statement      = /* Simple statement subset - parsed but limited support in v1.0 */
```

### Signals and Functions

```
Signal         = 'signal' IDENTIFIER ( '(' Parameters? ')' )?
Function       = 'function' IDENTIFIER '(' Parameters? ')' FunctionBody
Parameters     = Parameter ( COMMA Parameter )*
Parameter      = IDENTIFIER | QualifiedId IDENTIFIER
FunctionBody   = LBRACE Statement* RBRACE
```

### Components

```
Component      = 'component' IDENTIFIER COLON QualifiedId ObjectBody
```

## Scope Definition

### Supported Constructs (v1.0)

**Root Shells:**
- `Window` - Maps to Angular component root with viewport styling
- `Item` - Generic div-like container
- `Rectangle` - Styled div with CSS border/background
- `QtObject` - Structural container (renders as contents)
- `Component` - Reusable component definition

**Layout Primitives:**
- `Row`, `Column` - Basic flex layouts
- `RowLayout`, `ColumnLayout`, `GridLayout`, `StackLayout` - Advanced layouts
- `ScrollView` - Scrollable container

**Controls:**
- `Text` - Text display
- `TextField` - Text input
- `Button` - Button control
- `Image` - Image display

**Property Forms:**
- Simple properties: `name: value`
- Typed properties: `property type name: value`
- Readonly properties: `readonly property type name: value`
- Property aliases: `property alias name: target.property`
- Required properties: `required property type name: value`

**Bindings:**
- Literal values: strings, numbers, identifiers
- Simple expressions: `user.name`, `width * 2`
- Property access: dotted paths
- Function calls: `Math.max(a, b)`

**Handlers:**
- Simple handlers: `onClicked: handler()`
- Assignment handlers: `onTextChanged: text = value`
- Method call handlers: `onPressed: submit()`

**Imports:**
- QtQuick imports: `import QtQuick 2.15`
- QtQuick.Controls imports: `import QtQuick.Controls 2.15`
- QtQuick.Layouts imports: `import QtQuick.Layouts 1.15`
- Local component imports: `import "./components"`

### Explicitly Unsupported (v1.0)

These constructs are recognized but will produce structured diagnostics:

**State Systems:**
- `State` - State definitions
- `PropertyChanges` - Property change on state
- `StateGroup` - State grouping
- `Transition` - State transitions

**Animations:**
- `Timeline` - Timeline-based animations
- `KeyframeGroup` - Keyframe grouping
- `Keyframe` - Individual keyframes
- `PropertyAnimation` - Property animations
- `Behavior` - Property behaviors

**Graphics:**
- `SvgPathItem` - SVG path rendering
- `ShaderEffect` - Custom shader effects
- `FastBlur`, `Glow`, etc. - Graphics effects
- `Canvas` - Canvas drawing
- `Shape`, `ShapePath` - Complex shapes

**Advanced Features:**
- Complex delegates and models
- Imperative JavaScript blocks (beyond simple handlers)
- Dynamic object creation
- Loader with dynamic sources
- Connections beyond simple signals

## Error Model

### Lexical Errors

- Unterminated string literal
- Invalid number format
- Invalid character in input

### Syntax Errors

- Unexpected token
- Missing required token (e.g., missing `{` after object type)
- Invalid property syntax
- Malformed handler
- Unbalanced braces/brackets

### Semantic Errors

- Unsupported QML type
- Unsupported property on known type
- Unsupported binding pattern
- Type mismatch (detected in converter)

## Diagnostic Severity

- **Error**: Prevents conversion, must be fixed
- **Warning**: Conversion proceeds with limitations/approximations
- **Info**: Informational message about conversion decisions

## Recovery Strategy

The parser implements error recovery at:
- Property boundaries (skip to next property or closing brace)
- Object boundaries (skip to next object or closing brace)
- Statement boundaries (skip to next statement or newline)

Recovery preserves enough structure for diagnostics and partial conversion.
