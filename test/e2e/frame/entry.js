module.exports = {
  'User can signup': client => {
    const mainPage = client.page.frame.entry()

    mainPage
      .navigate()
      .testFrameButton()
      .testValidPassword()
      .testAcknowledgeWords()
      .testWalletAddress()
      .testProfile()

    client.end()
  }
}