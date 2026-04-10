// Unsupported constructs that should emit diagnostics
Item {
  // Supported elements
  Text {
    text: "This is supported"
  }

  // Unsupported graphics constructs
  SvgPathItem {
    path: "M 0,0 L 100,100"
  }

  // Unsupported state management
  State {
    name: "active"
    PropertyChanges {
      target: someItem
      color: "red"
    }
  }

  // Supported button
  Button {
    text: "Click me"
  }
}
