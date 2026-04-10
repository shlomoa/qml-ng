// Window shell with content
Window {
  width: 800
  height: 600
  title: "My Application"

  Column {
    Item {
      Rectangle {
        Text {
          text: "Header"
        }
      }
    }

    Row {
      Button {
        text: "Action 1"
      }
      Button {
        text: "Action 2"
      }
    }
  }
}
