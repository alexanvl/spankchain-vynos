const pause = require('../helpers/pause')
const frame = require('../helpers/frame')
const PAGE_URL = 'http://localhost:6969'
const PASSWORD = 'asdfjkl;'
const PROFILE_USERNAME = Math.random().toString(36).substr(2, 5)
const PROFILE_EMAIL = `${Math.random().toString(36).substr(2, 5)}@spankchain+test.com`

const signupCommands = {
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

  testValidPassword() {
    return this
      .setValue('@signupNewPasswordInput', PASSWORD)
      .setValue('@signupConfirmPasswordInput', PASSWORD)
      .pause(1000)
      .click('@signupSetPasswordButton')
      .pause(1000)
      .assert.containsText('@signupPasswordHeader', 'Backup Words')
      .pause(1500)
  },

  testAcknowledgeWords() {
    return this
      .click('@signupAckCheckbox', _ => {
        this.click('@signupAckWordsButton', _ => {
          this.assert.containsText('@signupDepositHeader', 'Wallet Address')
        })
      })
      .pause(1500)
  },

  testWalletAddress() {
    return this
      .assert.elementPresent('@signupWalletAddress')
      .click('@signupCopyAddress', _ => {
        this.assert.containsText('@signupCopyText', 'Copied')
      })
      .pause(500)
      .click('@signupCompleteButton')
      .pause(3000)
  },

  testProfile() {
    return this
      .frame(null)
      .assert.containsText('@signupProfileHeader', 'Profile')
      .setValue('@signupProfileUsername', PROFILE_USERNAME)
      .setValue('@signupProfileEmailAddress', PROFILE_EMAIL)
      .pause(1500)
      .click('@signupProfileAck', _ => {
        this.click('@signupProfileCompleteButton')
      })
      .pause(2500)
      .assert.containsText('@frameBalanceText', 'F0')
  }
}

module.exports = {
  url: PAGE_URL,
  commands: [pause, frame, signupCommands],
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
    frameBalanceText: {
      selector: '//div[@data-sel="frameBalanceText"]',
      locateStrategy: 'xpath'
    },

    // Password frame
    signupSetPasswordButton: {
      selector: '//button[@data-sel="signupSetPasswordButton"]',
      locateStrategy: 'xpath'
    },
    signupPasswordHeader: {
      selector: '//div[@data-sel="signupPasswordHeader"]',
      locateStrategy: 'xpath'
    },
    signupNewPasswordInput: {
      selector: '//input[@data-sel="signupNewPasswordInput"]',
      locateStrategy: 'xpath'
    },
    signupConfirmPasswordInput: {
      selector: '//input[@data-sel="signupConfirmPasswordInput"]',
      locateStrategy: 'xpath'
    },

    // Mnemonic words frame
    signupAckCheckbox: {
      selector: '//label[@data-sel="signupAckCheckbox"]',
      locateStrategy: 'xpath'
    },
    signupAckWordsButton: {
      selector: '//button[@data-sel="signupAckWordsButton"]',
      locateStrategy: 'xpath'
    },

    // Deposit frame
    signupDepositHeader: {
      selector: '//div[@data-sel="signupDepositHeader"]',
      locateStrategy: 'xpath'
    },
    signupWalletAddress: {
      selector: '//div[@data-sel="signupWalletAddress"]',
      locateStrategy: 'xpath'
    },
    signupCopyAddress: {
      selector: '//div[@data-sel="signupCopyAddress"]',
      locateStrategy: 'xpath'
    },
    signupCopyText: {
      selector: '//span[@data-sel="signupCopyText"]',
      locateStrategy: 'xpath'
    },
    signupCompleteButton: {
      selector: '//button[@data-sel="signupCompleteButton"]',
      locateStrategy: 'xpath'
    },

    // Profile frame
    signupProfileHeader: {
      selector: '//div[@data-sel="signupProfileHeader"]',
      locateStrategy: 'xpath'
    },
    signupProfileUsername: {
      selector: '//input[@data-sel="signupProfileUsername"]',
      locateStrategy: 'xpath'
    },
    signupProfileEmailAddress: {
      selector: '//input[@data-sel="signupProfileEmailAddress"]',
      locateStrategy: 'xpath'
    },
    signupProfileAck: {
      selector: '//label[@data-sel="signupProfileAck"]',
      locateStrategy: 'xpath'
    },
    signupProfileCompleteButton: {
      selector: '//button[@data-sel="signupProfileCompleteButton"]',
      locateStrategy: 'xpath'
    }
  }
}