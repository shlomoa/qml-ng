// Contains unsupported features
Item {
  // Unsupported: State management
  State {
    name: "active"
    PropertyChanges {
      target: button
      color: "blue"
    }
  }

  // Supported: Button
  Button {
    id: button
    text: "Toggle"
    onClicked: toggle()
  }

  // Unsupported: Graphics effect
  FastBlur {
    radius: 32
    source: button
  }
}
