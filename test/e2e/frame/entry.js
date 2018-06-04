module.exports = {
  'User can click wallet button': client => {
    const mainPage = client.page.frame.entry()

    mainPage
      .navigate()
      .testFrameButton()

    client.end()
  },

  'User can progress with valid password': client => {
    const mainPage = client.page.frame.entry()

    mainPage
      .navigate()
      .openFrame()
      .testValidPassword()

    client.end()
  }
}