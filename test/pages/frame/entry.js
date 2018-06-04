const pause = require('../helpers/pause')
const frame = require('../helpers/frame')
const PAGE_URL = 'http://localhost:6969'
const PASSWORD = 'asdfjkl;'

const entryCommands = {
  testFrameButton() {
    return this
      .waitForElementVisible('@consentButton', 5000)
      .click('@consentButton')
      .waitForElementVisible('@frameButton')
      .pause(5000)
      .click('@frameButton')
      .pause(2000)
      .getCssProperty('@frame', 'opacity', (result) => {
        this.assert.equal(result.value, 1)
      })
  },

  testValidPassword() {
    return this
      .setValue('@newPasswordInput', PASSWORD)
      .setValue('@confirmPasswordInput', PASSWORD)
      .pause(1000)
      .click('@setPasswordButton')
      .pause(2000)
      .assert.containsText('@passwordHeader', 'Backup Words')
  },

  openFrame() {
    return this
      .waitForElementVisible('@consentButton', 5000)
      .click('@consentButton')
      .waitForElementVisible('@frameButton', 5000)
      .pause(5000)
      .click('@frameButton')
      .pause(2000)
      .frame(0)
      .pause(1000)
  }
}

module.exports = {
  url: PAGE_URL,
  commands: [pause, frame, entryCommands],
  elements: {
    frame: {
      selector: '#ynos_frame',
    },
    frameButton: {
      selector: 'div.container.locked.noAccount'
    },
    consentButton: {
      selector: '//button[contains(., "I Agree")]',
      locateStrategy: 'xpath'
    },
    setPasswordButton: {
      selector: '//button[contains(., "Next")]',
      locateStrategy: 'xpath'
    },
    passwordHeader: {
      selector: 'div.ynos_funnelTitle_lidqQ'
    },
    newPasswordInput: {
      selector: '//input[@placeholder="New Password"]',
      locateStrategy: 'xpath'
    },
    confirmPasswordInput: {
      selector: '//input[@placeholder="Confirm Password"]',
      locateStrategy: 'xpath'
    }
  }
}