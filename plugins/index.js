const helpers = require('../helpers');
const playwright = require('../commands/playwright');
const metamask = require('../commands/metamask');
const etherscan = require('../commands/etherscan');

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config

  on('before:browser:launch', async (browser = {}, arguments_) => {
    if (browser.name === 'chrome') {
      // 检查是否使用 Chrome for Testing
      const useChromeForTesting = process.env.USE_CHROME_FOR_TESTING !== 'false';
      
      if (useChromeForTesting) {
        try {
          console.log('🔧 准备 Chrome for Testing...');
          // 检查是否需要强制重新下载 Chrome
          const forceRedownload = process.env.FORCE_REDOWNLOAD_CHROME === 'true';
          if (forceRedownload) {
            console.log('🔄 强制重新下载 Chrome for Testing...');
          }
          const chromeBinaryPath = await helpers.prepareChromeForTesting(forceRedownload);
          
          console.log(`✅ 准备使用 Chrome for Testing: ${chromeBinaryPath}`);
          
          // 尝试通过 launchOptions.args 设置自定义浏览器路径
          // 这是 Cypress 支持的方式
          arguments_.args.push(`--browser=${chromeBinaryPath}`);
          
          // 同时设置环境变量作为备用方案
          process.env.CHROME_BIN = chromeBinaryPath;
          process.env.CHROME_FOR_TESTING_PATH = chromeBinaryPath;
          
          console.log(`🔧 已通过 launchOptions.args 设置浏览器路径: ${chromeBinaryPath}`);
          console.log(`🔧 已设置环境变量 CHROME_BIN: ${chromeBinaryPath}`);
          
          console.log(`🔍 Browser 对象信息:`, {
            name: browser.name,
            path: browser.path,
            version: browser.version,
            isHeadless: browser.isHeadless
          });
          
          console.log(`🔍 LaunchOptions 信息:`, {
            extensions: arguments_.extensions.length,
            args: arguments_.args.length,
            extensionPaths: arguments_.extensions
          });
        } catch (error) {
          console.warn(`⚠️  Chrome for Testing 准备失败: ${error.message}`);
          console.warn('⚠️  回退到系统 Chrome，可能不支持扩展加载');
        }
      }

      // metamask welcome screen blocks cypress from loading
      arguments_.args.push(
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      );
      if (process.env.CI) {
        // Avoid: "dri3 extension not supported" error
        arguments_.args.push('--disable-gpu');
      }
      if (process.env.HEADLESS_MODE) {
        arguments_.args.push('--headless=new');
      }
      if (browser.isHeadless) {
        arguments_.args.push('--window-size=1920,1080');
      }
    }

    if (!process.env.SKIP_METAMASK_INSTALL) {
      // NOTE: extensions cannot be loaded in headless Chrome
      const metamaskPath = await helpers.prepareMetamask(
        process.env.METAMASK_VERSION || '11.15.0',
      );
      console.log(`Adding MetaMask extension from path: ${metamaskPath}`);
      
      // 验证扩展路径是否存在
      const fs = require('fs');
      try {
        const stats = fs.statSync(metamaskPath);
        console.log(`MetaMask extension path exists: ${stats.isDirectory() ? 'directory' : 'file'}`);
      } catch (error) {
        console.error(`MetaMask extension path does not exist: ${metamaskPath}`);
        throw error;
      }
      
      arguments_.extensions.push(metamaskPath);
      console.log(`Total extensions to load: ${arguments_.extensions.length}`);
      console.log(`Extensions array:`, arguments_.extensions);
    } else {
      console.log('Skipping MetaMask installation due to SKIP_METAMASK_INSTALL environment variable');
    }

    return arguments_;
  });

  on('task', {
    error(message) {
      console.error('\u001B[31m', 'ERROR:', message, '\u001B[0m');
      return true;
    },
    warn(message) {
      console.warn('\u001B[33m', 'WARNING:', message, '\u001B[0m');
      return true;
    },
    // playwright commands
    initPlaywright: playwright.init,
    clearPlaywright: playwright.clear,
    assignWindows: playwright.assignWindows,
    clearWindows: playwright.clearWindows,
    assignActiveTabName: playwright.assignActiveTabName,
    isMetamaskWindowActive: playwright.isMetamaskWindowActive,
    isCypressWindowActive: playwright.isCypressWindowActive,
    switchToCypressWindow: playwright.switchToCypressWindow,
    switchToMetamaskWindow: playwright.switchToMetamaskWindow,
    switchToMetamaskNotification: playwright.switchToMetamaskNotification,
    unlockMetamask: metamask.unlock,
    openMetamaskHomePage: metamask.switchToMetamaskIfNotActive,
    importMetamaskAccount: metamask.importAccount,
    createMetamaskAccount: metamask.createAccount,
    renameMetamaskAccount: metamask.renameAccount,
    switchMetamaskAccount: metamask.switchAccount,
    addMetamaskNetwork: metamask.addNetwork,
    sendTransaction: metamask.sendTransaction,
    metamaskScreenshot: metamask.metamaskScreenshot,
    changeMetamaskNetwork: async network => {
      if (process.env.NETWORK_NAME && !network) {
        network = process.env.NETWORK_NAME;
      } else if (!network) {
        network = 'goerli';
      }
      return await metamask.changeNetwork(network);
    },
    checkNetworkAdded: async network => {
      return await metamask.checkNetworkAdded(network);
    },
    activateAdvancedGasControlInMetamask: metamask.activateAdvancedGasControl,
    activateShowHexDataInMetamask: metamask.activateShowHexData,
    activateTestnetConversionInMetamask: metamask.activateTestnetConversion,
    activateShowTestnetNetworksInMetamask: metamask.activateShowTestnetNetworks,
    activateCustomNonceInMetamask: metamask.activateCustomNonce,
    activateDismissBackupReminderInMetamask:
      metamask.activateDismissBackupReminder,
    activateEthSignRequestsInMetamask: metamask.activateEthSignRequests,
    activateImprovedTokenAllowanceInMetamask:
      metamask.activateImprovedTokenAllowance,
    resetMetamaskAccount: metamask.resetAccount,
    disconnectMetamaskWalletFromDapp: metamask.disconnectWalletFromDapp,
    disconnectMetamaskWalletFromAllDapps: metamask.disconnectWalletFromAllDapps,
    confirmMetamaskSignatureRequest: metamask.confirmSignatureRequest,
    confirmMetamaskDataSignatureRequest: metamask.confirmDataSignatureRequest,
    rejectMetamaskSignatureRequest: metamask.rejectSignatureRequest,
    rejectMetamaskDataSignatureRequest: metamask.rejectDataSignatureRequest,
    confirmMetamaskEncryptionPublicKeyRequest:
      metamask.confirmEncryptionPublicKeyRequest,
    rejectMetamaskEncryptionPublicKeyRequest:
      metamask.rejectEncryptionPublicKeyRequest,
    confirmMetamaskDecryptionRequest: metamask.confirmDecryptionRequest,
    rejectMetamaskDecryptionRequest: metamask.rejectDecryptionRequest,
    importMetamaskToken: metamask.importToken,
    confirmMetamaskAddToken: metamask.confirmAddToken,
    rejectMetamaskAddToken: metamask.rejectAddToken,
    confirmMetamaskPermissionToSpend: metamask.confirmPermissionToSpend,
    rejectMetamaskPermissionToSpend: metamask.rejectPermissionToSpend,
    confirmMetamaskPermissionToApproveAll:
      metamask.confirmPermissionToApproveAll,
    rejectMetamaskPermissionToApproveAll: metamask.rejectPermissionToApproveAll,
    confirmMetamaskRevokePermissionToAll: metamask.confirmRevokePermissionToAll,
    rejectMetamaskRevokePermissionToAll: metamask.rejectRevokePermissionToAll,
    acceptMetamaskAccess: metamask.acceptAccess,
    rejectMetamaskAccess: metamask.rejectAccess,
    confirmMetamaskTransaction: metamask.confirmTransaction,
    confirmMetamaskTransactionAndWaitForMining:
      metamask.confirmTransactionAndWaitForMining,
    rejectMetamaskTransaction: metamask.rejectTransaction,
    openMetamaskTransactionDetails: metamask.openTransactionDetails,
    closeMetamaskTransactionDetailsPopup: metamask.closeTransactionDetailsPopup,
    allowMetamaskToAddNetwork: async ({ waitForEvent }) =>
      await metamask.allowToAddNetwork({ waitForEvent }),
    rejectMetamaskToAddNetwork: metamask.rejectToAddNetwork,
    allowMetamaskToSwitchNetwork: metamask.allowToSwitchNetwork,
    rejectMetamaskToSwitchNetwork: metamask.rejectToSwitchNetwork,
    allowMetamaskToAddAndSwitchNetwork: metamask.allowToAddAndSwitchNetwork,
    getMetamaskWalletAddress: metamask.getWalletAddress,
    fetchMetamaskWalletAddress: metamask.walletAddress,
    setupMetamask: async ({
      secretWordsOrPrivateKey,
      network,
      password,
      enableAdvancedSettings,
      enableExperimentalSettings,
    }) => {
      if (process.env.NETWORK_NAME) {
        network = process.env.NETWORK_NAME;
      }
      if (
        process.env.NETWORK_NAME &&
        process.env.RPC_URL &&
        process.env.CHAIN_ID &&
        process.env.SYMBOL
      ) {
        network = {
          id: process.env.CHAIN_ID,
          name: process.env.NETWORK_NAME,
          nativeCurrency: {
            symbol: process.env.SYMBOL,
          },
          rpcUrls: {
            public: { http: [process.env.RPC_URL] },
            default: { http: [process.env.RPC_URL] },
          },
          blockExplorers: {
            etherscan: { url: process.env.BLOCK_EXPLORER },
            default: { url: process.env.BLOCK_EXPLORER },
          },
          testnet: process.env.IS_TESTNET,
        };
      }
      if (process.env.PRIVATE_KEY) {
        secretWordsOrPrivateKey = process.env.PRIVATE_KEY;
      }
      if (process.env.SECRET_WORDS) {
        secretWordsOrPrivateKey = process.env.SECRET_WORDS;
      }
      await metamask.initialSetup(null, {
        secretWordsOrPrivateKey,
        network,
        password,
        enableAdvancedSettings,
        enableExperimentalSettings,
      });
      return true;
    },
    getCurrentNetwork: helpers.getCurrentNetwork,
    etherscanGetTransactionStatus: async ({ txid }) =>
      await etherscan.getTransactionStatus(txid),
    etherscanWaitForTxSuccess: async ({ txid }) =>
      await etherscan.waitForTxSuccess(txid),
    uploadVideo: async (videoPath) => {
      const fs = require('fs');
      const path = require('path');
      const FormData = require('form-data');
      const fetch = require('node-fetch');
      
      try {
        // Check if video file exists
        const fullPath = path.resolve(videoPath);
        if (!fs.existsSync(fullPath)) {
          throw new Error(`Video file not found: ${fullPath}`);
        }
        
        console.log(`📹 Uploading video: ${fullPath}`);
        
        // Create form data
        const form = new FormData();
        form.append('file', fs.createReadStream(fullPath));
        
        // Upload to transfer.toolsfdg.net
        const response = await fetch('https://transfer.toolsfdg.net/video', {
          method: 'POST',
          body: form,
          headers: form.getHeaders()
        });
        
        const result = await response.text();
        
        if (response.ok) {
          console.log(`✅ Video uploaded successfully: ${result}`);
          return {
            success: true,
            url: result,
            status: response.status,
            message: 'Video uploaded successfully'
          };
        } else {
          console.error(`❌ Video upload failed: ${response.status} - ${result}`);
          return {
            success: false,
            status: response.status,
            error: result,
            message: 'Video upload failed'
          };
        }
      } catch (error) {
        console.error(`❌ Video upload error: ${error.message}`);
        return {
          success: false,
          error: error.message,
          message: 'Video upload error'
        };
      }
    },
  });

  if (process.env.BASE_URL) {
    config.e2e.baseUrl = process.env.BASE_URL;
    config.component.baseUrl = process.env.BASE_URL;
  }

  if (process.env.CI) {
    config.retries.runMode = 1;
    config.retries.openMode = 1;
  }

  if (process.env.SKIP_METAMASK_SETUP) {
    config.env.SKIP_METAMASK_SETUP = true;
  }

  return config;
};
