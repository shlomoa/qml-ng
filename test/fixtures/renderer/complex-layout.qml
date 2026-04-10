// Complex layout with various containers
ColumnLayout {
  RowLayout {
    Text {
      text: "Label 1"
    }
    TextField {
      placeholderText: "Input 1"
    }
  }

  RowLayout {
    Text {
      text: "Label 2"
    }
    TextField {
      placeholderText: "Input 2"
    }
  }

  Row {
    Button {
      text: "Cancel"
    }
    Button {
      text: "OK"
    }
  }
}
