const log = require('debug')('synpress:helpers');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { ethers } = require('ethers');
const download = require('download');
const packageJson = require('./package.json');
const chains = require('viem/chains');
const appRoot = require('app-root-path');
const os = require('os');
const AdmZip = require('adm-zip');

let currentNetwork = chains.mainnet;
// list of added networks to metamask
let addedNetworks = [chains.mainnet, chains.goerli, chains.sepolia];

module.exports = {
  async resetState() {
    log('Resetting state of helpers');
    currentNetwork = chains.mainnet;
    addedNetworks = [chains.mainnet, chains.goerli, chains.sepolia];
  },
  // set currently active network
  async setNetwork(network) {
    log('Setting network to', network);
    currentNetwork = network;
  },
  // find network in presets
  async findNetwork(network) {
    if (typeof network === 'object') {
      network = network.name || network.network;
    }

    network = network.toLowerCase();
    log('[findNetwork] Trying to find following network', network);

    let chain;
    for (const [key, value] of Object.entries(chains)) {
      const { name, network: chainNetwork } = value;
      const lcName = name ? name.toLowerCase() : undefined;
      const lcChainNetwork = chainNetwork
        ? chainNetwork.toLowerCase()
        : undefined;
      if (lcName === network || lcChainNetwork === network) {
        chain = chains[key];
        break;
      } else if (key.toLowerCase() === network) {
        chain = chains[key];
        break;
      }
    }

    if (!chain) {
      throw new Error(
        `[setNetwork] Provided chain was not found.\nFor list of available chains, check: https://github.com/wagmi-dev/references/tree/main/packages/chains#chains`,
      );
    }

    if (
      chain.network === 'localhost' ||
      chain.network === 'foundry' ||
      chain.network === 'hardhat'
    ) {
      // todo: ip+port rpcUrls
      const provider = new ethers.JsonRpcProvider(
        chain.rpcUrls.default.http[0],
      );
      await provider.getNetwork().then(result => {
        chain.id = Number(result.chainId);
        chain.forkedFrom = result.name;
      });
    }

    return chain;
  },
  // get currently active network
  getCurrentNetwork() {
    log('[getCurrentNetwork] Current network data', currentNetwork);
    return currentNetwork;
  },
  // add new network to presets and list of metamask networks
  async addNetwork(newNetwork) {
    if (!newNetwork.network) {
      newNetwork.network = newNetwork.name.toLowerCase().replace(' ', '-');
    }

    log(`[addNetwork] Adding new network: ${newNetwork}`);
    chains[newNetwork.network] = newNetwork;
    addedNetworks.push(newNetwork);
  },
  // check if network is already added to metamask
  async checkNetworkAdded(network) {
    log('[checkNetworkAdded] Checking if network is already added', network);
    if (addedNetworks.includes(network)) {
      log(`[checkNetworkAdded] Network is present`);
      return true;
    } else {
      log(`[checkNetworkAdded] Network doesn't exist`);
      return false;
    }
  },
  getSynpressPath() {
    if (process.env.SYNPRESS_LOCAL_TEST) {
      return '.';
    } else {
      return path.dirname(require.resolve(packageJson.name));
    }
  },
  async createDirIfNotExist(path) {
    try {
      log(`Checking if directory exists on path: ${path}`);
      await fs.access(path);
      return true;
    } catch (e) {
      if (e.code === 'ENOENT') {
        log(`Creating directory as it doesn't exist..`);
        await fs.mkdir(path);
        return true;
      }

      throw new Error(
        `[createDirIfNotExist] Unhandled error from fs.access() with following error:\n${e}`,
      );
    }
  },
  async checkDirOrFileExist(path) {
    try {
      log(`Checking if directory exists on path: ${path}`);
      await fs.access(path);
      return true;
    } catch (e) {
      if (e.code === 'ENOENT') {
        log(`Directory or file doesn't exist`);
        return false;
      }

      throw new Error(
        `[checkDirOrFileExist] Unhandled error from fs.access() with following error:\n${e}`,
      );
    }
  },
  async getMetamaskReleases(version) {
    log(`Trying to find metamask version ${version} in GitHub releases..`);
    let filename;
    let downloadUrl;
    let tagName;
    let response;

    try {
      if (version === 'latest' || !version) {
        if (process.env.GH_USERNAME && process.env.GH_PAT) {
          response = await axios.get(
            'https://api.github.com/repos/metamask/metamask-extension/releases',
            {
              auth: {
                username: process.env.GH_USERNAME,
                password: process.env.GH_PAT,
              },
            },
          );
        } else {
          response = await axios.get(
            'https://api.github.com/repos/metamask/metamask-extension/releases',
          );
        }
        filename = response.data[0].assets[0].name;
        downloadUrl = response.data[0].assets[0].browser_download_url;
        tagName = response.data[0].tag_name;
        log(
          `Metamask version found! Filename: ${filename}; Download url: ${downloadUrl}; Tag name: ${tagName}`,
        );
      } else if (version) {
        filename = `metamask-chrome-${version}.zip`;
        downloadUrl = `https://github.com/MetaMask/metamask-extension/releases/download/v${version}/metamask-chrome-${version}.zip`;
        tagName = `metamask-chrome-${version}`;
        log(
          `Metamask version found! Filename: ${filename}; Download url: ${downloadUrl}; Tag name: ${tagName}`,
        );
      }
      return {
        filename,
        downloadUrl,
        tagName,
      };
    } catch (e) {
      if (e.response && e.response.status === 403) {
        throw new Error(
          `[getMetamaskReleases] Unable to fetch metamask releases from GitHub because you've been rate limited! Please set GH_USERNAME and GH_PAT environment variables to avoid this issue or retry again.`,
        );
      }

      throw new Error(
        `[getMetamaskReleases] Unable to fetch metamask releases from GitHub with following error:\n${e}`,
      );
    }
  },
  async download(url, destination) {
    try {
      log(
        `Trying to download and extract file from: ${url} to following path: ${destination}`,
      );
      
      // Ensure the destination directory exists before downloading
      await module.exports.createDirIfNotExist(destination);
      
      if (process.env.GH_USERNAME && process.env.GH_PAT) {
        log(`Using GitHub authentication for download`);
        await download(url, destination, {
          extract: true,
          auth: `${process.env.GH_USERNAME}:${process.env.GH_PAT}`,
        });
      } else {
        log(`Downloading without authentication (may hit rate limits)`);
        await download(url, destination, {
          extract: true,
        });
      }
      
      log(`Download and extraction completed successfully`);
    } catch (e) {
      log(`Download failed with error: ${e.message}`);
      throw new Error(
        `[download] Unable to download metamask release from: ${url} to: ${destination} with following error:\n${e}`,
      );
    }
  },
  async prepareMetamask(version) {
    const release = await module.exports.getMetamaskReleases(version);

    let downloadsDirectory;
    if (os.platform() === 'win32') {
      downloadsDirectory = appRoot.resolve('/node_modules');
    } else {
      downloadsDirectory = path.resolve(__dirname, 'downloads');
    }

    await module.exports.createDirIfNotExist(downloadsDirectory);
    const metamaskDirectory = path.join(downloadsDirectory, release.tagName);
    const metamaskDirectoryExists =
      await module.exports.checkDirOrFileExist(metamaskDirectory);
    const metamaskManifestFilePath = path.join(
      downloadsDirectory,
      release.tagName,
      'manifest.json',
    );
    const metamaskManifestFileExists = await module.exports.checkDirOrFileExist(
      metamaskManifestFilePath,
    );
    if (!metamaskDirectoryExists && !metamaskManifestFileExists) {
      log(`MetaMask directory doesn't exist, starting download...`);
      log(`Download URL: ${release.downloadUrl}`);
      log(`Target directory: ${metamaskDirectory}`);
      try {
        await module.exports.download(release.downloadUrl, metamaskDirectory);
        log(`MetaMask download completed successfully`);
      } catch (error) {
        log(`MetaMask download failed: ${error.message}`);
        throw error;
      }
    } else {
      log('Metamask is already downloaded');
    }
    
    // 验证扩展目录和 manifest.json 文件
    const finalManifestPath = path.join(metamaskDirectory, 'manifest.json');
    const manifestExists = await module.exports.checkDirOrFileExist(finalManifestPath);
    log(`MetaMask manifest.json exists: ${manifestExists} at ${finalManifestPath}`);
    
    if (manifestExists) {
      try {
        const manifestContent = await fs.readFile(finalManifestPath, 'utf8');
        const manifest = JSON.parse(manifestContent);
        log(`MetaMask manifest version: ${manifest.version}`);
        log(`MetaMask manifest name: ${manifest.name}`);
      } catch (error) {
        log(`Error reading manifest: ${error.message}`);
      }
    }
    
    return metamaskDirectory;
  },

  // Chrome for Testing 相关函数
  async getChromeForTestingInfo() {
    const platform = os.platform();
    // 使用一个更稳定的版本，确保支持扩展加载
    const version = process.env.CHROME_FOR_TESTING_VERSION || '120.0.6099.109';
    
    const platformMap = {
      'win32': 'win32',
      'darwin': 'mac-x64', // 可以根据需要添加 mac-arm64
      'linux': 'linux64'
    };

    const platformName = platformMap[platform];
    if (!platformName) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const downloadUrl = `https://storage.googleapis.com/chrome-for-testing-public/${version}/${platformName}/chrome-${platformName}.zip`;
    const filename = `chrome-${platformName}.zip`;
    const tagName = `chrome-for-testing-${version}-${platformName}`;

    log(`Chrome for Testing info - Platform: ${platformName}, Version: ${version}, URL: ${downloadUrl}`);

    return {
      filename,
      downloadUrl,
      tagName,
      platform: platformName,
      version
    };
  },

  async downloadChromeForTesting(forceRedownload = false) {
    const chromeInfo = await module.exports.getChromeForTestingInfo();
    
    let downloadsDirectory;
    if (os.platform() === 'win32') {
      downloadsDirectory = appRoot.resolve('/node_modules');
    } else {
      downloadsDirectory = path.resolve(__dirname, 'downloads');
    }

    await module.exports.createDirIfNotExist(downloadsDirectory);
    const chromeDirectory = path.join(downloadsDirectory, chromeInfo.tagName);
    const chromeDirectoryExists = await module.exports.checkDirOrFileExist(chromeDirectory);
    
    // 检查 Chrome 二进制文件是否存在
    const chromeBinaryPath = module.exports.getChromeBinaryPath(chromeDirectory, chromeInfo.platform);
    const chromeBinaryExists = await module.exports.checkDirOrFileExist(chromeBinaryPath);

    if (forceRedownload || !chromeDirectoryExists || !chromeBinaryExists) {
      if (forceRedownload) {
        log(`Force redownloading Chrome for Testing...`);
        // 清理现有目录
        try {
          if (chromeDirectoryExists) {
            await fs.rm(chromeDirectory, { recursive: true, force: true });
            log(`Cleaned up existing Chrome directory: ${chromeDirectory}`);
          }
        } catch (error) {
          log(`Warning: Could not clean up Chrome directory: ${error.message}`);
        }
      }
      
      log(`Downloading Chrome for Testing ${chromeInfo.version} for ${chromeInfo.platform}...`);
      
      // 下载 ZIP 文件
      const zipPath = path.join(downloadsDirectory, chromeInfo.filename);
      await module.exports.downloadFile(chromeInfo.downloadUrl, zipPath);
      
      // 解压 ZIP 文件
      await module.exports.extractZip(zipPath, chromeDirectory);
      
      // 删除 ZIP 文件
      try {
        await fs.unlink(zipPath);
        log(`Cleaned up downloaded ZIP file: ${zipPath}`);
      } catch (error) {
        log(`Warning: Could not delete ZIP file ${zipPath}: ${error.message}`);
      }
      
      log(`Chrome for Testing downloaded and extracted to: ${chromeDirectory}`);
    } else {
      log('Chrome for Testing is already downloaded');
    }

    return chromeDirectory;
  },

  getChromeBinaryPath(chromeDirectory, platform) {
    const binaryMap = {
      'win32': path.join(chromeDirectory, 'chrome-win32', 'chrome.exe'),
      'mac-x64': path.join(chromeDirectory, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
      'mac-arm64': path.join(chromeDirectory, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
      'linux64': path.join(chromeDirectory, 'chrome-linux64', 'chrome')
    };

    return binaryMap[platform];
  },

  async downloadFile(url, destination) {
    try {
      log(`Downloading file from: ${url} to: ${destination}`);
      
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 300000 // 5 minutes timeout
      });

      const writer = require('fs').createWriteStream(destination);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          log(`File downloaded successfully: ${destination}`);
          resolve();
        });
        writer.on('error', (error) => {
          log(`Error writing file: ${error.message}`);
          reject(error);
        });
      });
    } catch (error) {
      throw new Error(`Failed to download file from ${url}: ${error.message}`);
    }
  },

  async extractZip(zipPath, extractTo) {
    try {
      log(`Extracting ZIP file: ${zipPath} to: ${extractTo}`);
      
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractTo, true);
      
      log(`ZIP file extracted successfully to: ${extractTo}`);
    } catch (error) {
      throw new Error(`Failed to extract ZIP file ${zipPath}: ${error.message}`);
    }
  },

  async prepareChromeForTesting(forceRedownload = false) {
    try {
      const chromeDirectory = await module.exports.downloadChromeForTesting(forceRedownload);
      const chromeInfo = await module.exports.getChromeForTestingInfo();
      const chromeBinaryPath = module.exports.getChromeBinaryPath(chromeDirectory, chromeInfo.platform);
      
      // 验证二进制文件是否存在
      const binaryExists = await module.exports.checkDirOrFileExist(chromeBinaryPath);
      if (!binaryExists) {
        log(`Chrome binary not found, this might be a version compatibility issue`);
        log(`Chrome path: ${chromeBinaryPath}`);
        log(`Chrome directory: ${chromeDirectory}`);
        throw new Error(`Chrome binary not found at: ${chromeBinaryPath}`);
      }

      log(`Chrome for Testing ready at: ${chromeBinaryPath}`);
      log(`Chrome version: ${chromeInfo.version}`);
      return chromeBinaryPath;
    } catch (error) {
      log(`Error preparing Chrome for Testing: ${error.message}`);
      throw error;
    }
  },
};
