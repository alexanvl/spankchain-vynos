const pause = require('../helpers/pause')
const frame = require('../helpers/frame')
const PAGE_URL = 'http://localhost:6969'
const PASSWORD = 'asdfjkl;'

const loginCommands = {
  testFrameButton() {
    return this
      .waitForElementVisible('@frameConsentButton', 5000)
      .click('@frameConsentButton')
      .waitForElementVisible('@frameButton', 0)
      .pause(5000)
      .click('@frameButton')
      .pause(2000)
      .getCssProperty('@frame', 'opacity', (result) => {
        this.assert.equal(result.value, 1)
      })
      .frame(0)
      .pause(1000)
  },

  testRestoreWallet() {
    const SELENIUM_WORDS = this.api.globals.SELENIUM_TEST_BACKUP_WORDS.split(' ')

    return this
      .click('@restoreWalletButton')
      .pause(500)

      // Error case
      .click('@submitSeedWordsButton', _ => {
        this.assert.containsText('@passwordTextBox', 'Invalid seed phrase. Did you forget or mistype a word?')
      })

      // Set the words
      .setValue('@restoreWordsInput0', SELENIUM_WORDS[0])
      .setValue('@restoreWordsInput1', SELENIUM_WORDS[1])
      .setValue('@restoreWordsInput2', SELENIUM_WORDS[2])
      .setValue('@restoreWordsInput3', SELENIUM_WORDS[3])
      .setValue('@restoreWordsInput4', SELENIUM_WORDS[4])
      .setValue('@restoreWordsInput5', SELENIUM_WORDS[5])
      .setValue('@restoreWordsInput6', SELENIUM_WORDS[6])
      .setValue('@restoreWordsInput7', SELENIUM_WORDS[7])
      .setValue('@restoreWordsInput8', SELENIUM_WORDS[8])
      .setValue('@restoreWordsInput9', SELENIUM_WORDS[9])
      .setValue('@restoreWordsInput10', SELENIUM_WORDS[10])
      .setValue('@restoreWordsInput11', SELENIUM_WORDS[11])
      .pause(1000)
      .click('@submitSeedWordsButton')
      .pause(2000)

      // Set new password
      .setValue('@restoreNewPasswordInput', PASSWORD)
      .setValue('@restoreConfirmPasswordInput', PASSWORD)
      .pause(1000)
      .click('@submitRestorePasswordButton')
      .pause(2000)
  }
}

module.exports = {
  url: PAGE_URL,
  commands: [pause, frame, loginCommands],
  elements: {
    // Frame elements
    frame: {
      selector: '#ynos_frame',
    },
    frameButton: {
      selector: 'div.container.locked.noAccount'
    },
    frameConsentButton: {
      selector: '//button[@data-sel="initialConsentButton"]',
      locateStrategy: 'xpath'
    },

    // Restore
    restoreWalletButton: {
      selector: '//button[@data-sel="restoreWalletButton"]',
      locateStrategy: 'xpath'
    },
    passwordTextBox: {
      selector: '//div[@data-sel="passwordTextBox"]',
      locateStrategy: 'xpath'
    },
    restoreWordsInput0: {
      selector: '//input[@data-sel="restoreWordsInput0"]',
      locateStrategy: 'xpath'
    },
    restoreWordsInput1: {
      selector: '//input[@data-sel="restoreWordsInput1"]',
      locateStrategy: 'xpath'
    },
    restoreWordsInput2: {
      selector: '//input[@data-sel="restoreWordsInput2"]',
      locateStrategy: 'xpath'
    },
    restoreWordsInput3: {
      selector: '//input[@data-sel="restoreWordsInput3"]',
      locateStrategy: 'xpath'
    },
    restoreWordsInput4: {
      selector: '//input[@data-sel="restoreWordsInput4"]',
      locateStrategy: 'xpath'
    },
    restoreWordsInput5: {
      selector: '//input[@data-sel="restoreWordsInput5"]',
      locateStrategy: 'xpath'
    },
    restoreWordsInput6: {
      selector: '//input[@data-sel="restoreWordsInput6"]',
      locateStrategy: 'xpath'
    },
    restoreWordsInput7: {
      selector: '//input[@data-sel="restoreWordsInput7"]',
      locateStrategy: 'xpath'
    },
    restoreWordsInput8: {
      selector: '//input[@data-sel="restoreWordsInput8"]',
      locateStrategy: 'xpath'
    },
    restoreWordsInput9: {
      selector: '//input[@data-sel="restoreWordsInput9"]',
      locateStrategy: 'xpath'
    },
    restoreWordsInput10: {
      selector: '//input[@data-sel="restoreWordsInput10"]',
      locateStrategy: 'xpath'
    },
    restoreWordsInput11: {
      selector: '//input[@data-sel="restoreWordsInput11"]',
      locateStrategy: 'xpath'
    },
    submitSeedWordsButton: {
      selector: '//button[@data-sel="submitSeedWordsButton"]',
      locateStrategy: 'xpath'
    },

    // Password
    restoreNewPasswordInput: {
      selector: '//input[@data-sel="restoreNewPasswordInput"]',
      locateStrategy: 'xpath'
    },
    restoreConfirmPasswordInput: {
      selector: '//input[@data-sel="restoreConfirmPasswordInput"]',
      locateStrategy: 'xpath'
    },
    submitRestorePasswordButton: {
      selector: '//button[@data-sel="submitRestorePasswordButton"]',
      locateStrategy: 'xpath'
    }
  }
}