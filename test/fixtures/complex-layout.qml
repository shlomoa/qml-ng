// Complex nested layout
Row {
  Column {
    Text { text: "Left Panel" }
    TextField { placeholderText: "Search" }
    Button { text: "Filter" }
  }

  Column {
    Text { text: "Main Content" }
    Image { source: "banner.jpg" }
    Row {
      Button { text: "Action 1" }
      Button { text: "Action 2" }
      Button { text: "Action 3" }
    }
  }

  Column {
    Text { text: "Right Sidebar" }
    Text { text: user.status }
    Button { text: "Profile" }
  }
}
