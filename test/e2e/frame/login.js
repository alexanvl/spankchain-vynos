module.exports = {
  'User can login': client => {
    const mainPage = client.page.frame.login()

    mainPage
      .navigate()
      .testFrameButton()
      .testRestoreWallet()

    client.end()
  }
}