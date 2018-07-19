const seleniumServer = require('selenium-server')
const chromedriver = require('chromedriver')
const geckodriver = require('geckodriver')

module.exports = {
  "src_folders": ["./test/e2e"],
  "page_objects_path": ["./test/pages"],
  "disable_colors": false,
  "selenium": {
    "start_process": true,
    "server_path": seleniumServer.path,
    "host": "127.0.0.1",
    "port": 4444,
    "cli_args": {
      "webdriver.chrome.driver" : chromedriver.path
    }
  },
  "test_settings": {
    "default": {
      "screenshots": {
        "enabled": false
      },
      "globals": {
        "waitForConditionTimeout": 5000,
        "SELENIUM_TEST_BACKUP_WORDS": "HEDGEHOG BLAST FOREST SHOE SESSION PRESENT SUCCESS TYPE SAVE READY FEEL LOAN",
      },
      "desiredCapabilities": {
        "browserName": "chrome"
      }
    },
    "chrome": {
      "desiredCapabilities": {
        "browserName": "chrome",
        "javascriptEnabled": true
      }
    }
  }
}
