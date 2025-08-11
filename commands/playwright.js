const log = require('debug')('synpress:playwright');
const fetch = require('node-fetch');
const {
  notificationPageElements,
} = require('../pages/metamask/notification-page');
const { pageElements } = require('../pages/metamask/page');
const {
  onboardingWelcomePageElements,
} = require('../pages/metamask/first-time-flow-page');
const sleep = require('util').promisify(setTimeout);
const _ = require('underscore');

let expectInstance;

let browser;
let mainWindow;
let metamaskWindow;
let metamaskNotificationWindow;
let metamaskPopupWindow;
let activeTabName;

let retries = 0;

let extensionsData = {};

module.exports = {
  async resetState() {
    log('Resetting state of playwright');
    expectInstance = undefined;
    browser = undefined;
    mainWindow = undefined;
    metamaskWindow = undefined;
    metamaskNotificationWindow = undefined;
    metamaskPopupWindow = undefined;
    activeTabName = undefined;
    retries = 0;
    extensionsData = {};
  },
  getExpectInstance() {
    return expectInstance;
  },
  browser() {
    return browser;
  },
  mainWindow() {
    return mainWindow;
  },
  metamaskWindow() {
    return metamaskWindow;
  },
  metamaskNotificationWindow() {
    return metamaskNotificationWindow;
  },
  metamaskPopupWindow() {
    return metamaskPopupWindow;
  },
  activeTabName() {
    return activeTabName;
  },
  async metamaskExtensionId() {
    try {
      let extensionsData = await module.exports.getExtensionsData();
      let metamaskExtensionData = extensionsData.metamask;
      
      if (!metamaskExtensionData) {
        // Try to refresh extensions data once more in case of timing issues
        log('MetaMask extension not found on first attempt, refreshing extensions data...');
        await sleep(1000); // Wait a bit for extensions to load
        
        // Clear cached data and try again
        extensionsData = {}; // Clear the global cache
        const refreshedExtensionsData = await module.exports.getExtensionsData();
        const refreshedMetamaskExtensionData = refreshedExtensionsData.metamask;
        
        if (!refreshedMetamaskExtensionData) {
          throw new Error('MetaMask extension not found. Please ensure MetaMask is installed and enabled in the browser.');
        }
        
        if (!refreshedMetamaskExtensionData.id) {
          throw new Error('MetaMask extension ID not found. The extension may not be properly loaded.');
        }
        
        return refreshedMetamaskExtensionData.id;
      }
      
      if (!metamaskExtensionData.id) {
        throw new Error('MetaMask extension ID not found. The extension may not be properly loaded.');
      }
      
      return metamaskExtensionData.id;
    } catch (error) {
      log(`Error in metamaskExtensionId: ${error.message}`);
      throw error;
    }
  },
  async setExpectInstance(expect) {
    expectInstance = expect;
  },
  async init(playwrightInstance) {
    try {
      log('[init] Starting browser initialization...');
      
      const chromium = playwrightInstance
        ? playwrightInstance
        : require('@playwright/test').chromium;
      
      log('[init] Attempting to connect to Chrome DevTools Protocol...');
      
      // Try to connect to the CDP endpoint
      let debuggerDetails;
      try {
        debuggerDetails = await fetch('http://127.0.0.1:9222/json/version'); //DevSkim: ignore DS137138
        log('[init] Successfully fetched debugger details');
      } catch (fetchError) {
        log(`[init] Failed to fetch debugger details: ${fetchError.message}`);
        throw new Error(`Failed to connect to Chrome DevTools Protocol at http://127.0.0.1:9222. Make sure Chrome is running with --remote-debugging-port=9222`);
      }
      
      let debuggerDetailsConfig;
      try {
        debuggerDetailsConfig = await debuggerDetails.json();
        log('[init] Successfully parsed debugger details');
      } catch (jsonError) {
        log(`[init] Failed to parse debugger details: ${jsonError.message}`);
        throw new Error('Failed to parse Chrome DevTools Protocol response');
      }
      
      const webSocketDebuggerUrl = debuggerDetailsConfig.webSocketDebuggerUrl;
      log(`[init] WebSocket debugger URL: ${webSocketDebuggerUrl}`);
      
      // Connect to the browser
      try {
        if (process.env.SLOW_MODE) {
          if (!isNaN(process.env.SLOW_MODE)) {
            log(`[init] Connecting with slowMo: ${process.env.SLOW_MODE}`);
            browser = await chromium.connectOverCDP(webSocketDebuggerUrl, {
              slowMo: Number(process.env.SLOW_MODE),
            });
          } else {
            log('[init] Connecting with default slowMo: 50');
            browser = await chromium.connectOverCDP(webSocketDebuggerUrl, {
              slowMo: 50,
            });
          }
        } else {
          log('[init] Connecting without slowMo');
          browser = await chromium.connectOverCDP(webSocketDebuggerUrl);
        }
        
        log('[init] Successfully connected to browser');
        
        const isConnected = await browser.isConnected();
        log(`[init] Browser connection status: ${isConnected}`);
        
        return isConnected;
      } catch (connectError) {
        log(`[init] Failed to connect to browser: ${connectError.message}`);
        throw new Error(`Failed to connect to browser: ${connectError.message}`);
      }
    } catch (error) {
      log(`[init] Browser initialization failed: ${error.message}`);
      throw error;
    }
  },
  async clear() {
    browser = null;
    return true;
  },
  async assignWindows() {
    try {
      // Ensure browser is initialized
      if (!browser) {
        log('Browser not initialized in assignWindows, attempting to initialize...');
        try {
          // Add a timeout to prevent hanging
          const initPromise = module.exports.init();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Browser initialization timed out after 30 seconds')), 30000);
          });
          
          await Promise.race([initPromise, timeoutPromise]);
          log('Browser initialized successfully in assignWindows');
        } catch (initError) {
          log(`Failed to initialize browser in assignWindows: ${initError.message}`);
          throw initError;
        }
      }

      const metamaskExtensionId = await module.exports.metamaskExtensionId();

      let pages = await browser.contexts()[0].pages();
      for (const page of pages) {
        if (page.url().includes('specs/runner')) {
          mainWindow = page;
        } else if (
          page
            .url()
            .includes(`chrome-extension://${metamaskExtensionId}/home.html`)
        ) {
          metamaskWindow = page;
        } else if (
          page
            .url()
            .includes(
              `chrome-extension://${metamaskExtensionId}/notification.html`,
            )
        ) {
          metamaskNotificationWindow = page;
        } else if (
          page
            .url()
            .includes(`chrome-extension://${metamaskExtensionId}/popup.html`)
        ) {
          metamaskPopupWindow = page;
        }
      }
      return true;
    } catch (error) {
      log(`Error in assignWindows: ${error.message}`);
      throw error;
    }
  },
  async assignActiveTabName(tabName) {
    activeTabName = tabName;
    return true;
  },
  async clearWindows() {
    mainWindow = null;
    metamaskWindow = null;
    metamaskNotificationWindow = null;
    metamaskPopupWindow = null;
    return true;
  },
  async isCypressWindowActive() {
    return activeTabName === 'cypress';
  },
  async isMetamaskWindowActive() {
    return activeTabName === 'metamask';
  },
  async isMetamaskNotificationWindowActive() {
    return activeTabName === 'metamask-notif';
  },
  async switchToCypressWindow() {
    if (mainWindow) {
      await mainWindow.bringToFront();
      await module.exports.assignActiveTabName('cypress');
    }
    return true;
  },
  async switchToMetamaskWindow() {
    await metamaskWindow.bringToFront();
    await module.exports.assignActiveTabName('metamask');
    return true;
  },
  async switchToMetamaskNotificationWindow() {
    await metamaskNotificationWindow.bringToFront();
    await module.exports.assignActiveTabName('metamask-notif');
    return true;
  },
  async switchToMetamaskPopupWindow() {
    await metamaskPopupWindow.bringToFront();
    await module.exports.assignActiveTabName('metamask-popup');
    return true;
  },
  async switchToMetamaskNotification() {
    try {
      // Ensure browser is initialized
      if (!browser) {
        log('Browser not initialized in switchToMetamaskNotification, attempting to initialize...');
        try {
          // Add a timeout to prevent hanging
          const initPromise = module.exports.init();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Browser initialization timed out after 30 seconds')), 30000);
          });
          
          await Promise.race([initPromise, timeoutPromise]);
          log('Browser initialized successfully in switchToMetamaskNotification');
        } catch (initError) {
          log(`Failed to initialize browser in switchToMetamaskNotification: ${initError.message}`);
          throw initError;
        }
      }

      const metamaskExtensionId = await module.exports.metamaskExtensionId();
      log(`Looking for MetaMask notification with extension ID: ${metamaskExtensionId}`);

      let pages = await browser.contexts()[0].pages();
      log(`Found ${pages.length} pages in browser context`);
      
      // Log all page URLs for debugging
      for (let i = 0; i < pages.length; i++) {
        const pageUrl = pages[i].url();
        log(`Page ${i}: ${pageUrl}`);
      }

      for (const page of pages) {
        const pageUrl = page.url();
        log(`Checking page URL: ${pageUrl}`);
        
        if (
          pageUrl.includes(
            `chrome-extension://${metamaskExtensionId}/notification.html`,
          )
        ) {
          log('Found MetaMask notification page!');
          metamaskNotificationWindow = page;
          retries = 0;
          await page.bringToFront();
          await module.exports.waitUntilStable(page);
          
          // Wait for the notification content to be present
          try {
            await module.exports.waitFor(
              notificationPageElements.notificationAppContent,
              page,
            );
            log('Notification content loaded successfully');
          } catch (waitError) {
            log(`Warning: Could not find notification content: ${waitError.message}`);
            
            // Try to find alternative selectors
            const alternativeSelectors = [
              '.notification',
              '#app-content',
              '.app',
              '[data-testid="page-container"]',
              '.page-container'
            ];
            
            for (const selector of alternativeSelectors) {
              try {
                const element = page.locator(selector);
                const count = await element.count();
                if (count > 0) {
                  log(`Found alternative selector: ${selector} (${count} elements)`);
                  break;
                }
              } catch (altError) {
                log(`Alternative selector ${selector} not found: ${altError.message}`);
              }
            }
            
            // Continue anyway as the page might still be loading
          }
          
          return page;
        }
      }
      
      log(`No MetaMask notification page found. Retry ${retries + 1}/50`);
      await sleep(500); // Increased wait time
      
      if (retries < 50) {
        retries++;
        return await module.exports.switchToMetamaskNotification();
      } else if (retries >= 50) {
        retries = 0;
        throw new Error(
          '[switchToMetamaskNotification] Max amount of retries to switch to metamask notification window has been reached. It was never found.',
        );
      }
    } catch (error) {
      log(`Error in switchToMetamaskNotification: ${error.message}`);
      throw error;
    }
  },
  async waitFor(selector, page = metamaskWindow) {
    await module.exports.waitUntilStable(page);
    await page.waitForSelector(selector, { strict: false });
    const element = page.locator(selector).first();
    await element.waitFor();
    await element.focus();
    if (process.env.STABLE_MODE) {
      if (!isNaN(process.env.STABLE_MODE)) {
        await page.waitForTimeout(Number(process.env.STABLE_MODE));
      } else {
        await page.waitForTimeout(300);
      }
    }
    return element;
  },
  async waitAndClick(selector, page = metamaskWindow, args = {}) {
    const element = await module.exports.waitFor(selector, page);
    if (args.numberOfClicks && !args.waitForEvent) {
      await element.click({
        clickCount: args.numberOfClicks,
        force: args.force,
      });
    } else if (args.numberOfClicks && args.waitForEvent) {
      await Promise.all([
        page.waitForEvent(args.waitForEvent),
        element.click({ clickCount: args.numberOfClicks, force: args.force }),
      ]);
    } else if (args.waitForEvent) {
      if (args.waitForEvent.includes('navi')) {
        await Promise.all([
          page.waitForNavigation(),
          element.click({ force: args.force }),
        ]);
      } else {
        await Promise.all([
          page.waitForEvent(args.waitForEvent),
          element.click({ force: args.force }),
        ]);
      }
    } else {
      await element.click({ force: args.force });
    }
    await module.exports.waitUntilStable();
    return element;
  },
  async waitAndClickByText(selector, text, page = metamaskWindow) {
    await module.exports.waitFor(selector, page);
    const element = `:is(:text-is("${text}"), :text("${text}"))`;
    await page.click(element);
    await module.exports.waitUntilStable();
  },
  async waitAndType(selector, value, page = metamaskWindow) {
    if (typeof value === 'number') {
      value = value.toString();
    }
    const element = await module.exports.waitFor(selector, page);
    await element.type(value);
    await module.exports.waitUntilStable(page);
  },
  async waitAndGetValue(selector, page = metamaskWindow) {
    const expect = expectInstance
      ? expectInstance
      : require('@playwright/test').expect;
    const element = await module.exports.waitFor(selector, page);
    await expect(element).toHaveText(/[a-zA-Z0-9]/, {
      ignoreCase: true,
      useInnerText: true,
    });
    const value = await element.innerText();
    return value;
  },
  async waitAndGetInputValue(selector, page = metamaskWindow) {
    const expect = expectInstance
      ? expectInstance
      : require('@playwright/test').expect;
    const element = await module.exports.waitFor(selector, page);
    await expect(element).toHaveValue(/[a-zA-Z1-9]/);
    const value = await element.inputValue();
    return value;
  },
  async waitAndGetElementInnerText(selector, page = metamaskWindow) {
    const expect = expectInstance
      ? expectInstance
      : require('@playwright/test').expect;
    const element = await module.exports.waitFor(selector, page);
    await expect(element).toHaveText(/[a-zA-Z1-9]/);
    const value = await element.innerText();
    return value;
  },
  async waitAndGetAttributeValue(
    selector,
    attribute,
    page = metamaskWindow,
    skipValidation = false,
  ) {
    const expect = expectInstance
      ? expectInstance
      : require('@playwright/test').expect;
    const element = await module.exports.waitFor(selector, page);
    if (!skipValidation) {
      await expect(element).toHaveAttribute(attribute, /[a-zA-Z0-9]/);
    }
    const attrValue = await element.getAttribute(attribute);
    return attrValue;
  },
  async waitAndSetValue(text, selector, page = metamaskWindow) {
    const element = await module.exports.waitFor(selector, page);
    await element.fill('');
    await module.exports.waitUntilStable(page);
    await element.fill(text);
    await module.exports.waitUntilStable(page);
  },
  async waitAndClearWithBackspace(selector, page = metamaskWindow) {
    await module.exports.waitFor(selector, page);
    const inputValue = await page.evaluate(selector, el => el.value);
    for (let i = 0; i < inputValue.length; i++) {
      await page.keyboard.press('Backspace');
      await module.exports.waitUntilStable(page);
    }
  },
  async waitClearAndType(text, selector, page = metamaskWindow) {
    const element = await module.exports.waitAndClick(selector, page, {
      numberOfClicks: 3,
    });
    await module.exports.waitUntilStable(page);
    await element.type(text);
    await module.exports.waitUntilStable(page);
  },
  async waitForText(selector, text, page = metamaskWindow) {
    await module.exports.waitFor(selector, page);
    const element = page.locator(selector, { hasText: text });
    await element.waitFor();
  },
  async waitToBeHidden(selector, page = metamaskWindow) {
    // info: waits for 60 seconds
    const locator = page.locator(selector);
    for (const element of await locator.all()) {
      if ((await element.count()) > 0 && retries < 300) {
        retries++;
        await page.waitForTimeout(200);
        await module.exports.waitToBeHidden(selector, page);
      } else if (retries >= 300) {
        retries = 0;
        throw new Error(
          `[waitToBeHidden] Max amount of retries reached while waiting for ${selector} to disappear.`,
        );
      }
      retries = 0;
    }
  },
  async waitUntilStable(page) {
    const metamaskExtensionId = await module.exports.metamaskExtensionId();

    if (
      page &&
      page
        .url()
        .includes(`chrome-extension://${metamaskExtensionId}/notification.html`)
    ) {
      await page.waitForLoadState('load');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');
      await module.exports.waitUntilNotificationWindowIsStable();
    }
    await metamaskWindow.waitForLoadState('load');
    await metamaskWindow.waitForLoadState('domcontentloaded');
    await metamaskWindow.waitForLoadState('networkidle');
    await module.exports.waitUntilMetamaskWindowIsStable();
    if (mainWindow) {
      await mainWindow.waitForLoadState('load');
      await mainWindow.waitForLoadState('domcontentloaded');
      // todo: this may slow down tests and not be necessary but could improve stability
      // await mainWindow.waitForLoadState('networkidle');
    }
  },
  async waitUntilNotificationWindowIsStable(page = metamaskNotificationWindow) {
    await module.exports.waitToBeHidden(
      notificationPageElements.loadingLogo,
      page,
    );
    await module.exports.waitToBeHidden(
      notificationPageElements.loadingSpinner,
      page,
    );
  },
  async waitUntilMetamaskWindowIsStable(page = metamaskWindow) {
    await module.exports.waitToBeHidden(pageElements.loadingLogo, page); // shown on reload
    await module.exports.waitToBeHidden(pageElements.loadingSpinner, page); // shown on reload
    await module.exports.waitToBeHidden(pageElements.loadingOverlay, page); // shown on change network
    await module.exports.waitToBeHidden(
      pageElements.loadingOverlaySpinner,
      page,
    ); // shown on balance load
    // network error handler
    if (
      (await page.locator(pageElements.loadingOverlayErrorButtons).count()) > 0
    ) {
      await module.exports.waitAndClick(
        pageElements.loadingOverlayErrorButtonsRetryButton,
        page,
      );
      await module.exports.waitToBeHidden(pageElements.loadingOverlay, page);
    }
    await module.exports.fixCriticalError();
  },
  // workaround for metamask random blank page on first run
  async fixBlankPage(page = metamaskWindow) {
    await page.waitForTimeout(1000);
    for (let times = 0; times < 5; times++) {
      if (
        (await page.locator(onboardingWelcomePageElements.app).count()) === 0
      ) {
        await page.reload();
        await module.exports.waitUntilMetamaskWindowIsStable();
      } else {
        break;
      }
    }
  },
  async fixCriticalError(page = metamaskWindow) {
    for (let times = 0; times < 5; times++) {
      if ((await page.locator(pageElements.criticalError).count()) > 0) {
        log(
          '[fixCriticalError] Metamask crashed with critical error, refreshing..',
        );
        if (times <= 3) {
          await page.reload();
          await module.exports.waitUntilMetamaskWindowIsStable();
        } else if (times === 4) {
          await module.exports.waitAndClick(
            pageElements.criticalErrorRestartButton,
          );
          await module.exports.waitUntilMetamaskWindowIsStable();
        } else {
          throw new Error(
            '[fixCriticalError] Max amount of retries to fix critical metamask error has been reached.',
          );
        }
      } else if ((await page.locator(pageElements.errorPage).count()) > 0) {
        log('[fixCriticalError] Metamask crashed with error, refreshing..');
        if (times <= 4) {
          await page.reload();
          await module.exports.waitUntilMetamaskWindowIsStable();
        } else {
          throw new Error(
            '[fixCriticalError] Max amount of retries to fix critical metamask error has been reached.',
          );
        }
      } else {
        break;
      }
    }
  },
  async getExtensionsData() {
    if (!_.isEmpty(extensionsData)) {
      return extensionsData;
    }

    try {
      if (!browser) {
        // Try to initialize the browser if it's not already initialized
        log('Browser is not initialized, attempting to initialize...');
        try {
          // Add a timeout to prevent hanging
          const initPromise = module.exports.init();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Browser initialization timed out after 30 seconds')), 30000);
          });
          
          await Promise.race([initPromise, timeoutPromise]);
          log('Browser initialized successfully');
        } catch (initError) {
          log(`Failed to initialize browser: ${initError.message}`);
          throw new Error(`Browser is not initialized and failed to auto-initialize: ${initError.message}`);
        }
      }

      const contexts = await browser.contexts();
      if (!contexts || contexts.length === 0) {
        throw new Error('No browser contexts available.');
      }

      const context = contexts[0];
      const page = await context.newPage();

      await page.goto('chrome://extensions');
      await page.waitForLoadState('load');
      await page.waitForLoadState('domcontentloaded');

      const devModeButton = page.locator('#devMode');
      await devModeButton.waitFor();
      await devModeButton.focus();
      await devModeButton.click();

      const extensionDataItems = await page.locator('extensions-item').all();
      log(`Found ${extensionDataItems.length} extension items`);
      
      for (const extensionData of extensionDataItems) {
        try {
          const nameElement = extensionData.locator('#name-and-version').locator('#name');
          const versionElement = extensionData.locator('#name-and-version').locator('#version');
          const idElement = extensionData.locator('#extension-id');
          
          // Check if elements exist before trying to get text content
          if (await nameElement.count() === 0 || await versionElement.count() === 0 || await idElement.count() === 0) {
            continue;
          }
          
          const extensionName = (
            await nameElement.textContent()
          ).toLowerCase();

          const extensionVersion = (
            await versionElement.textContent()
          ).replace(/(\n| )/g, '');

          const idText = await idElement.textContent();
          const extensionId = idText.split(': ')[1];

          if (extensionName && extensionVersion && extensionId) {
            extensionsData[extensionName] = {
              version: extensionVersion,
              id: extensionId,
            };
            log(`Found extension: ${extensionName} (${extensionId})`);
          }
        } catch (extensionError) {
          log(`Error processing extension data: ${extensionError.message}`);
          continue;
        }
      }
      
      await page.close();
      
      if (_.isEmpty(extensionsData)) {
        log('No extensions found or all extensions failed to process');
      } else {
        log(`Successfully processed ${Object.keys(extensionsData).length} extensions`);
      }
      
      return extensionsData;
    } catch (error) {
      log(`Error getting extensions data: ${error.message}`);
      throw new Error(`Failed to get extensions data: ${error.message}`);
    }
  },

  async screenshot(path, page = metamaskWindow) {
    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'png',
      path: path,
    });
    return screenshot;
  },
};
