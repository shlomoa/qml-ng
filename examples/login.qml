Column {
  anchors.centerIn: parent

  Text {
    text: user.name
  }

  TextField {
    placeholderText: "Email"
  }

  Button {
    text: "Submit"
    onClicked: submit()
  }
}
