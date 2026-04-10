// Button grid calculator-style layout
Column {
  Row {
    Button { text: "1" onClicked: input(1) }
    Button { text: "2" onClicked: input(2) }
    Button { text: "3" onClicked: input(3) }
  }
  Row {
    Button { text: "4" onClicked: input(4) }
    Button { text: "5" onClicked: input(5) }
    Button { text: "6" onClicked: input(6) }
  }
  Row {
    Button { text: "7" onClicked: input(7) }
    Button { text: "8" onClicked: input(8) }
    Button { text: "9" onClicked: input(9) }
  }
  Row {
    Button { text: "0" onClicked: input(0) }
  }
}
