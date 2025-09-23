const { chromium } = require('@playwright/test');
const log = require('debug')('synpress:debug');

async function debugExtensions() {
  let browser;
  let page;
  
  try {
    log('Starting debug session...');
    
    // 启动新的Chrome实例
    log('Launching new Chrome instance...');
    browser = await chromium.launch({
      headless: false, // 显示浏览器窗口
      args: [
        '--remote-debugging-port=9222',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    if (!browser.isConnected()) {
      throw new Error('Failed to launch browser');
    }
    
    log('Browser launched successfully');
    
    // 创建浏览器上下文
    const context = await browser.newContext();
    page = await context.newPage();
    
    log('Created new page');
    
    // 监听页面事件
    page.on('pageerror', error => {
      log(`Page error: ${error.message}`);
    });

    page.on('console', msg => {
      log(`Console ${msg.type()}: ${msg.text()}`);
    });

    page.on('request', request => {
      log(`Request: ${request.method()} ${request.url()}`);
    });

    page.on('response', response => {
      log(`Response: ${response.status()} ${response.url()}`);
    });

    log('Navigating to chrome://extensions...');
    await page.goto('chrome://extensions');
    
    log('Waiting for page load...');
    await page.waitForLoadState('load');
    await page.waitForLoadState('domcontentloaded');
    
    // 等待一段时间确保页面完全加载
    await page.waitForTimeout(2000);
    
    log('Page loaded, checking URL...');
    const currentUrl = page.url();
    log(`Current URL: ${currentUrl}`);
    
    if (!currentUrl.includes('chrome://extensions')) {
      throw new Error(`Expected chrome://extensions, got: ${currentUrl}`);
    }

    // 截图检查
    await page.screenshot({ 
      path: 'debug-extensions-page.png',
      fullPage: true 
    });
    log('Screenshot saved to debug-extensions-page.png');

    // 检查页面标题
    const pageTitle = await page.title();
    log(`Page title: ${pageTitle}`);

    // 检查页面内容
    const pageContent = await page.content();
    log(`Page content length: ${pageContent.length}`);
    
    // 检查是否包含关键元素
    const hasExtensionsManager = await page.locator('#extensions-manager').count() > 0;
    log(`Has extensions manager: ${hasExtensionsManager}`);
    
    const hasExtensionsList = await page.locator('#extensions-list').count() > 0;
    log(`Has extensions list: ${hasExtensionsList}`);
    
    const hasDevModeButton = await page.locator('#devMode').count() > 0;
    log(`Has dev mode button: ${hasDevModeButton}`);

    if (hasDevModeButton) {
      log('Clicking dev mode button...');
      const devModeButton = page.locator('#devMode');
      await devModeButton.waitFor();
      await devModeButton.focus();
      await devModeButton.click();
      
      // 等待开发者模式生效
      await page.waitForTimeout(1000);
      
      log('Dev mode button clicked');
    }

    // 尝试多种选择器来查找扩展
    log('Looking for extensions with different selectors...');
    
    const selectors = [
      'extensions-item',
      '#extensions-list extensions-item',
      '.extension-item',
      '[data-extension-id]',
      '.extension-card'
    ];
    
    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      log(`Selector "${selector}": ${count} items found`);
    }

    // 检查页面HTML结构
    log('Checking page structure...');
    const bodyText = await page.locator('body').textContent();
    log(`Body text length: ${bodyText.length}`);
    log(`Body text preview: ${bodyText.substring(0, 500)}...`);

    // 检查是否有任何扩展相关的文本
    if (bodyText.toLowerCase().includes('metamask')) {
      log('Found MetaMask in page text');
    } else {
      log('No MetaMask found in page text');
    }

    // 尝试等待扩展列表加载
    log('Waiting for extensions to load...');
    await page.waitForTimeout(3000);
    
    // 再次检查扩展
    const extensionDataItems = await page.locator('extensions-item').all();
    log(`Final extensions count: ${extensionDataItems.length}`);

    if (extensionDataItems.length > 0) {
      log('Found extensions, listing them:');
      for (let i = 0; i < extensionDataItems.length; i++) {
        try {
          const extensionName = await extensionDataItems[i]
            .locator('#name-and-version #name')
            .textContent();
          log(`Extension ${i}: ${extensionName}`);
        } catch (e) {
          log(`Failed to get name for extension ${i}: ${e.message}`);
        }
      }
    } else {
      log('No extensions found. Possible issues:');
      log('1. No extensions are installed');
      log('2. Extensions page is not loading properly');
      log('3. Extensions are disabled');
      log('4. Chrome is running in a restricted mode');
      
      // 检查是否有错误信息
      const errorElements = await page.locator('.error, .warning, .message').all();
      for (const errorElement of errorElements) {
        const errorText = await errorElement.textContent();
        log(`Error/Warning: ${errorText}`);
      }
    }

    // 等待用户查看
    log('Press any key to continue...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

  } catch (error) {
    log(`Error during debug: ${error.message}`);
    log(`Error stack: ${error.stack}`);
  } finally {
    if (page) {
      await page.screenshot({ 
        path: 'debug-extensions-error.png',
        fullPage: true 
      });
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
    log('Debug session ended');
  }
}

// 运行调试
debugExtensions().catch(console.error); 