# QML → Angular Material Converter
## Architecture & Blueprint

---

## 1. Overview

This document describes a converter that transforms QML UI into Angular Material UI.

Pipeline:
QML → AST → Schema → Angular Generator → Angular Material

---

## 2. Example

QML:
Column {
  Text { text: "Login" }
  TextField { placeholderText: "Email" }
  Button { text: "Submit" }
}

Generated Angular:
<div class="column">
  <h1>Login</h1>
  <mat-form-field>
    <input matInput placeholder="Email">
  </mat-form-field>
  <button mat-raised-button>Submit</button>
</div>

---

## 3. Schema

type UiNode =
  | { kind: 'container'; children: UiNode[] }
  | { kind: 'text'; text: string }
  | { kind: 'input'; placeholder?: string }
  | { kind: 'button'; text: string }

---

## 4. Mapping

Text → HTML text
TextField → mat-form-field
Button → mat-button

---

## 5. Notes

Unsupported:
- anchors
- states
- transitions

---

## 6. Summary

Schema-driven conversion ensures maintainability.
