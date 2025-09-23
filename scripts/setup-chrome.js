#!/usr/bin/env node

/**
 * Chrome for Testing 设置脚本
 * 
 * 这个脚本提供完整的 Chrome for Testing 设置功能，包括:
 * - 下载 Chrome for Testing
 * - 验证安装
 * - 清理旧版本
 * - 显示状态信息
 * 
 * 使用方法:
 *   node scripts/setup-chrome.js
 *   node scripts/setup-chrome.js --action=download
 *   node scripts/setup-chrome.js --action=verify
 *   node scripts/setup-chrome.js --action=clean
 *   node scripts/setup-chrome.js --action=status
 */

const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const helpers = require('../helpers');

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    action: 'download', // download, verify, clean, status
    version: null,
    platform: null,
    help: false,
    force: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--action=')) {
      options.action = arg.split('=')[1];
    } else if (arg.startsWith('--version=')) {
      options.version = arg.split('=')[1];
    } else if (arg.startsWith('--platform=')) {
      options.platform = arg.split('=')[1];
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--action' && i + 1 < args.length) {
      options.action = args[++i];
    } else if (arg === '--version' && i + 1 < args.length) {
      options.version = args[++i];
    } else if (arg === '--platform' && i + 1 < args.length) {
      options.platform = args[++i];
    }
  }

  return options;
}

// 显示帮助信息
function showHelp() {
  console.log(`
Chrome for Testing 设置脚本

使用方法:
  node scripts/setup-chrome.js [选项]

操作:
  --action=download    下载 Chrome for Testing (默认)
  --action=verify      验证 Chrome for Testing 安装
  --action=clean       清理旧版本的 Chrome for Testing
  --action=status      显示当前状态

选项:
  --version=VERSION    指定 Chrome 版本
  --platform=PLATFORM 指定平台 (win32, mac-x64, mac-arm64, linux64)
  --force             强制重新下载/清理
  --help, -h          显示此帮助信息

示例:
  node scripts/setup-chrome.js
  node scripts/setup-chrome.js --action=download --version=140.0.7339.185
  node scripts/setup-chrome.js --action=verify
  node scripts/setup-chrome.js --action=clean --force
  node scripts/setup-chrome.js --action=status

环境变量:
  CHROME_FOR_TESTING_VERSION  设置默认 Chrome 版本
  USE_CHROME_FOR_TESTING      是否使用 Chrome for Testing (默认: true)
`);
}

// 显示状态信息
async function showStatus() {
  console.log('📊 Chrome for Testing 状态信息');
  console.log('================================');
  
  try {
    const chromeInfo = await helpers.getChromeForTestingInfo();
    console.log(`🖥️  平台: ${chromeInfo.platform}`);
    console.log(`📦 版本: ${chromeInfo.version}`);
    console.log(`🔗 下载 URL: ${chromeInfo.downloadUrl}`);
    console.log('');

    // 检查下载目录
    let downloadsDirectory;
    if (os.platform() === 'win32') {
      downloadsDirectory = require('app-root-path').resolve('/node_modules');
    } else {
      downloadsDirectory = path.resolve(__dirname, '../downloads');
    }

    const chromeDirectory = path.join(downloadsDirectory, chromeInfo.tagName);
    const chromeBinaryPath = helpers.getChromeBinaryPath(chromeDirectory, chromeInfo.platform);

    console.log(`📁 下载目录: ${downloadsDirectory}`);
    console.log(`📁 Chrome 目录: ${chromeDirectory}`);
    console.log(`🔧 二进制路径: ${chromeBinaryPath}`);
    console.log('');

    // 检查文件状态
    const directoryExists = await helpers.checkDirOrFileExist(chromeDirectory);
    const binaryExists = await helpers.checkDirOrFileExist(chromeBinaryPath);

    console.log('📋 文件状态:');
    console.log(`   - Chrome 目录: ${directoryExists ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`   - 二进制文件: ${binaryExists ? '✅ 存在' : '❌ 不存在'}`);
    console.log('');

    if (directoryExists && binaryExists) {
      console.log('✅ Chrome for Testing 已正确安装');
    } else {
      console.log('⚠️  Chrome for Testing 未完全安装');
      console.log('💡 运行 "node scripts/setup-chrome.js --action=download" 进行安装');
    }

  } catch (error) {
    console.error('❌ 获取状态信息失败:', error.message);
  }
}

// 验证安装
async function verifyInstallation() {
  console.log('🔍 验证 Chrome for Testing 安装...');
  
  try {
    const chromeBinaryPath = await helpers.prepareChromeForTesting();
    const binaryExists = await helpers.checkDirOrFileExist(chromeBinaryPath);
    
    if (binaryExists) {
      console.log('✅ Chrome for Testing 安装验证成功');
      console.log(`📁 二进制文件路径: ${chromeBinaryPath}`);
    } else {
      console.log('❌ Chrome for Testing 安装验证失败');
      console.log('💡 二进制文件不存在，请重新下载');
    }
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  }
}

// 清理旧版本
async function cleanOldVersions(force = false) {
  console.log('🧹 清理旧版本的 Chrome for Testing...');
  
  try {
    let downloadsDirectory;
    if (os.platform() === 'win32') {
      downloadsDirectory = require('app-root-path').resolve('/node_modules');
    } else {
      downloadsDirectory = path.resolve(__dirname, '../downloads');
    }

    const entries = await fs.readdir(downloadsDirectory, { withFileTypes: true });
    const chromeDirs = entries
      .filter(entry => entry.isDirectory() && entry.name.startsWith('chrome-for-testing-'))
      .map(entry => entry.name);

    if (chromeDirs.length === 0) {
      console.log('📭 没有找到旧版本的 Chrome for Testing');
      return;
    }

    console.log(`📋 找到 ${chromeDirs.length} 个 Chrome for Testing 目录:`);
    chromeDirs.forEach(dir => console.log(`   - ${dir}`));
    console.log('');

    if (!force) {
      console.log('⚠️  使用 --force 参数确认删除这些目录');
      return;
    }

    for (const dir of chromeDirs) {
      const dirPath = path.join(downloadsDirectory, dir);
      try {
        await fs.rm(dirPath, { recursive: true, force: true });
        console.log(`🗑️  已删除: ${dir}`);
      } catch (error) {
        console.error(`❌ 删除失败 ${dir}: ${error.message}`);
      }
    }

    console.log('✅ 清理完成');

  } catch (error) {
    console.error('❌ 清理失败:', error.message);
  }
}

// 下载 Chrome
async function downloadChrome(options) {
  console.log('⬇️  下载 Chrome for Testing...');
  
  try {
    if (options.version) {
      process.env.CHROME_FOR_TESTING_VERSION = options.version;
    }

    const chromeBinaryPath = await helpers.prepareChromeForTesting();
    console.log('✅ Chrome for Testing 下载完成');
    console.log(`📁 安装路径: ${chromeBinaryPath}`);
  } catch (error) {
    console.error('❌ 下载失败:', error.message);
    throw error;
  }
}

// 主函数
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log(`🚀 Chrome for Testing 设置脚本`);
  console.log(`📋 操作: ${options.action}`);
  console.log('');

  try {
    switch (options.action) {
      case 'download':
        await downloadChrome(options);
        break;
      case 'verify':
        await verifyInstallation();
        break;
      case 'clean':
        await cleanOldVersions(options.force);
        break;
      case 'status':
        await showStatus();
        break;
      default:
        console.error(`❌ 未知操作: ${options.action}`);
        console.error('💡 使用 --help 查看可用操作');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { main, parseArgs, showHelp, showStatus, verifyInstallation, cleanOldVersions, downloadChrome };
