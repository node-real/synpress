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
    const extensionsData = await module.exports.getExtensionsData();
    
    const metamaskExtensionData = extensionsData.metamask;
    if (!metamaskExtensionData) {
      // 尝试查找包含 "metamask" 的扩展
      const metamaskKey = Object.keys(extensionsData).find(key => 
        key.toLowerCase().includes('metamask')
      );
      
      if (metamaskKey) {
        console.log(`Found MetaMask with key: "${metamaskKey}"`);
        return extensionsData[metamaskKey].id;
      }
      
      throw new Error(`MetaMask extension not found in extensions list. Available extensions: ${Object.keys(extensionsData).map(key => `"${key}"`).join(', ')}`);
    }
    
    return metamaskExtensionData.id;
  },
  async setExpectInstance(expect) {
    expectInstance = expect;
  },
  async init(playwrightInstance) {
    const chromium = playwrightInstance
      ? playwrightInstance
      : require('@playwright/test').chromium;
    const debuggerDetails = await fetch('http://127.0.0.1:9222/json/version'); //DevSkim: ignore DS137138
    const debuggerDetailsConfig = await debuggerDetails.json();
    const webSocketDebuggerUrl = debuggerDetailsConfig.webSocketDebuggerUrl;
    
    // 验证当前使用的 Chrome 版本
    console.log('🔍 Playwright 连接的 Chrome 信息:', {
      userAgent: debuggerDetailsConfig['User-Agent'],
      webKitVersion: debuggerDetailsConfig['WebKit-Version'],
      v8Version: debuggerDetailsConfig['V8-Version'],
      browser: debuggerDetailsConfig['Browser'],
      protocolVersion: debuggerDetailsConfig['Protocol-Version']
    });
    if (process.env.SLOW_MODE) {
      if (!isNaN(process.env.SLOW_MODE)) {
        browser = await chromium.connectOverCDP(webSocketDebuggerUrl, {
          slowMo: Number(process.env.SLOW_MODE),
        });
      } else {
        browser = await chromium.connectOverCDP(webSocketDebuggerUrl, {
          slowMo: 50,
        });
      }
    } else {
      browser = await chromium.connectOverCDP(webSocketDebuggerUrl);
    }
    return browser.isConnected();
  },
  async clear() {
    browser = null;
    return true;
  },
  async assignWindows() {
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
    const metamaskExtensionId = await module.exports.metamaskExtensionId();
    const NOTIFICATION_PAGE_TIMEOUT = 10000; // 10 seconds timeout
    const MAX_RETRIES = 50;

    // Helper function to check if page is valid and not closed
    const isPageValid = (page) => {
      try {
        return page && !page.isClosed() && page.url();
      } catch (error) {
        log(`[switchToMetamaskNotification] Error checking page validity: ${error.message}`);
        return false;
      }
    };

    // Helper function to safely bring page to front
    const safeBringToFront = async (page) => {
      try {
        if (isPageValid(page)) {
          await page.bringToFront();
        }
      } catch (error) {
        log(`[switchToMetamaskNotification] Error bringing page to front: ${error.message}`);
        // Don't throw, just log and continue
      }
    };

    try {
      // Check if browser and context are still valid
      if (!browser || !browser.contexts() || browser.contexts().length === 0) {
        throw new Error('[switchToMetamaskNotification] Browser or context is not available');
      }

      let pages = await browser.contexts()[0].pages();
      
      // Filter out closed pages
      pages = pages.filter(isPageValid);
      
      for (const page of pages) {
        try {
          if (
            page
              .url()
              .includes(
                `chrome-extension://${metamaskExtensionId}/notification.html`,
              )
          ) {
            metamaskNotificationWindow = page;
            retries = 0;
            
            await safeBringToFront(page);
            
            // Use the improved waitUntilStable with error handling
            await module.exports.waitUntilStable(page);
            
            // Check if page is still valid after waitUntilStable
            if (!isPageValid(page)) {
              log('[switchToMetamaskNotification] Page became invalid after waitUntilStable, continuing search');
              continue;
            }
            
            await module.exports.waitFor(
              notificationPageElements.notificationAppContent,
              page,
            );
            return page;
          }
        } catch (error) {
          log(`[switchToMetamaskNotification] Error processing page: ${error.message}`);
          // Continue to next page instead of failing
          continue;
        }
      }
      
      // If no notification page found, wait and retry with exponential backoff
      const waitTime = Math.min(200 * Math.pow(1.5, retries), 5000); // Max 5 seconds
      await sleep(waitTime);
      
      if (retries < MAX_RETRIES) {
        retries++;
        log(`[switchToMetamaskNotification] Notification page not found, retrying (${retries}/${MAX_RETRIES})...`);
        return await module.exports.switchToMetamaskNotification();
      } else {
        retries = 0;
        throw new Error(
          '[switchToMetamaskNotification] Max amount of retries to switch to metamask notification window has been reached. It was never found.',
        );
      }
    } catch (error) {
      retries = 0;
      if (error.message.includes('Target page, context or browser has been closed')) {
        log(`[switchToMetamaskNotification] Browser/context/page closed: ${error.message}`);
        throw new Error('[switchToMetamaskNotification] Browser context or page has been closed. Please restart the test.');
      }
      throw error;
    }
  },
  async waitFor(selector, page = metamaskWindow) {
    // Check if page is valid before proceeding
    if (!page || page.isClosed()) {
      throw new Error('[waitFor] Page is closed or invalid');
    }

    try {
      await module.exports.waitUntilStable(page);
      
      // Check again after waitUntilStable
      if (!page || page.isClosed()) {
        throw new Error('[waitFor] Page became closed after waitUntilStable');
      }
      
      await page.waitForSelector(selector, { strict: false, timeout: 10000 });
      const element = page.locator(selector).first();
      await element.waitFor({ timeout: 10000 });
      await element.focus();
      
      if (process.env.STABLE_MODE) {
        if (!isNaN(process.env.STABLE_MODE)) {
          await page.waitForTimeout(Number(process.env.STABLE_MODE));
        } else {
          await page.waitForTimeout(300);
        }
      }
      return element;
    } catch (error) {
      if (error.message.includes('Target page, context or browser has been closed')) {
        log(`[waitFor] Page/context/browser closed during waitFor: ${error.message}`);
        throw new Error('[waitFor] Page or browser context has been closed');
      }
      throw error;
    }
  },
  async waitAndClick(selector, page = metamaskWindow, args = {}) {
    // Check if page is valid before proceeding
    if (!page || page.isClosed()) {
      throw new Error('[waitAndClick] Page is closed or invalid');
    }

    try {
      const element = await module.exports.waitFor(selector, page);
      
      // Check if page is still valid after waitFor
      if (!page || page.isClosed()) {
        throw new Error('[waitAndClick] Page became closed after waitFor');
      }
      
      if (args.numberOfClicks && !args.waitForEvent) {
        await element.click({
          clickCount: args.numberOfClicks,
          force: args.force,
        });
      } else if (args.numberOfClicks && args.waitForEvent) {
        await Promise.all([
          page.waitForEvent(args.waitForEvent, { timeout: 10000 }),
          element.click({ clickCount: args.numberOfClicks, force: args.force }),
        ]);
      } else if (args.waitForEvent) {
        if (args.waitForEvent.includes('navi')) {
          await Promise.all([
            page.waitForNavigation({ timeout: 10000 }),
            element.click({ force: args.force }),
          ]);
        } else {
          await Promise.all([
            page.waitForEvent(args.waitForEvent, { timeout: 10000 }),
            element.click({ force: args.force }),
          ]);
        }
      } else {
        await element.click({ force: args.force });
      }
      
      // Only call waitUntilStable if page is still valid
      if (page && !page.isClosed()) {
        await module.exports.waitUntilStable();
      }
      
      return element;
    } catch (error) {
      if (error.message.includes('Target page, context or browser has been closed')) {
        log(`[waitAndClick] Page/context/browser closed during waitAndClick: ${error.message}`);
        throw new Error('[waitAndClick] Page or browser context has been closed');
      }
      throw error;
    }
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
    const DEFAULT_TIMEOUT = 10000; // 10 seconds timeout

    // Helper function to safely wait for load state with timeout and error handling
    const safeWaitForLoadState = async (targetPage, state, timeout = DEFAULT_TIMEOUT) => {
      try {
        // Check if page is still valid before waiting
        if (!targetPage || targetPage.isClosed()) {
          log(`[waitUntilStable] Page is closed, skipping waitForLoadState for ${state}`);
          return;
        }
        await targetPage.waitForLoadState(state, { timeout });
      } catch (error) {
        if (error.message.includes('Target page, context or browser has been closed')) {
          log(`[waitUntilStable] Page/context/browser closed during waitForLoadState for ${state}: ${error.message}`);
          return; // Don't throw, just log and continue
        }
        log(`[waitUntilStable] Error during waitForLoadState for ${state}: ${error.message}`);
        throw error;
      }
    };

    if (
      page &&
      page
        .url()
        .includes(`chrome-extension://${metamaskExtensionId}/notification.html`)
    ) {
      await safeWaitForLoadState(page, 'load');
      await safeWaitForLoadState(page, 'domcontentloaded');
      await safeWaitForLoadState(page, 'networkidle');
      await module.exports.waitUntilNotificationWindowIsStable();
    }
    
    if (metamaskWindow && !metamaskWindow.isClosed()) {
      await safeWaitForLoadState(metamaskWindow, 'load');
      await safeWaitForLoadState(metamaskWindow, 'domcontentloaded');
      await safeWaitForLoadState(metamaskWindow, 'networkidle');
      await module.exports.waitUntilMetamaskWindowIsStable();
    }
    
    if (mainWindow && !mainWindow.isClosed()) {
      await safeWaitForLoadState(mainWindow, 'load');
      await safeWaitForLoadState(mainWindow, 'domcontentloaded');
      // todo: this may slow down tests and not be necessary but could improve stability
      // await safeWaitForLoadState(mainWindow, 'networkidle');
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

    console.log('Getting extensions data from chrome://extensions...');
    const context = await browser.contexts()[0];
    const page = await context.newPage();

    await page.goto('chrome://extensions');
    await page.waitForLoadState('load');
    await page.waitForLoadState('domcontentloaded');

    const devModeButton = page.locator('#devMode');
    await devModeButton.waitFor();
    await devModeButton.focus();
    await devModeButton.click();

    const extensionDataItems = await page.locator('extensions-item').all();
    console.log(`Found ${extensionDataItems.length} extensions`);
    
    for (const extensionData of extensionDataItems) {
      try {
      const extensionName = (
        await extensionData
          .locator('#name-and-version')
          .locator('#name')
          .textContent()
      ).toLowerCase().trim();

        const extensionVersion = (
          await extensionData
            .locator('#name-and-version')
            .locator('#version')
            .textContent()
        ).trim().replace(/(\n| )/g, '');

        const extensionId = (
          await extensionData.locator('#extension-id').textContent()
        ).trim().split(': ')[1];


        extensionsData[extensionName] = {
          version: extensionVersion,
          id: extensionId,
        };
      } catch (error) {
        console.log(`Error processing extension: ${error.message}`);
      }
    }
    await page.close();

    console.log('Final extensions data:', Object.keys(extensionsData));
    return extensionsData;
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
