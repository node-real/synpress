#!/usr/bin/env node

/**
 * Chrome for Testing 下载脚本
 * 
 * 使用方法:
 *   node scripts/download-chrome.js
 *   node scripts/download-chrome.js --version=136.0.7103.49
 *   node scripts/download-chrome.js --platform=win32
 *   node scripts/download-chrome.js --help
 */

const path = require('path');
const helpers = require('../helpers');

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    version: '136.0.7103.49',
    platform: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--version=')) {
      options.version = arg.split('=')[1];
    } else if (arg.startsWith('--platform=')) {
      options.platform = arg.split('=')[1];
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
Chrome for Testing 下载脚本

使用方法:
  node scripts/download-chrome.js [选项]

选项:
  --version=VERSION    指定 Chrome 版本 (默认: 136.0.7103.49)
  --platform=PLATFORM 指定平台 (win32, mac-x64, mac-arm64, linux64)
  --help, -h          显示此帮助信息

示例:
  node scripts/download-chrome.js
  node scripts/download-chrome.js --version=136.0.7103.49
  node scripts/download-chrome.js --platform=win32
  node scripts/download-chrome.js --version=136.0.7103.49 --platform=win32

环境变量:
  CHROME_FOR_TESTING_VERSION  设置默认 Chrome 版本
  USE_CHROME_FOR_TESTING      是否使用 Chrome for Testing (默认: true)
`);
}

// 主函数
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  try {
    console.log('🚀 开始下载 Chrome for Testing...');
    console.log(`📋 配置信息:`);
    console.log(`   - 版本: ${options.version}`);
    console.log(`   - 平台: ${options.platform || '自动检测'}`);
    console.log('');

    // 设置环境变量
    if (options.version) {
      process.env.CHROME_FOR_TESTING_VERSION = options.version;
    }

    // 获取 Chrome 信息
    console.log('🔍 获取 Chrome for Testing 信息...');
    const chromeInfo = await helpers.getChromeForTestingInfo();
    console.log(`   - 平台: ${chromeInfo.platform}`);
    console.log(`   - 版本: ${chromeInfo.version}`);
    console.log(`   - 下载 URL: ${chromeInfo.downloadUrl}`);
    console.log('');

    // 下载 Chrome
    console.log('⬇️  下载 Chrome for Testing...');
    const chromeBinaryPath = await helpers.prepareChromeForTesting();
    
    console.log('');
    console.log('✅ Chrome for Testing 下载完成!');
    console.log(`📁 安装路径: ${chromeBinaryPath}`);
    console.log('');
    console.log('💡 提示:');
    console.log('   - 现在可以在 Cypress 中使用 Chrome for Testing');
    console.log('   - 设置环境变量 USE_CHROME_FOR_TESTING=true 启用自动使用');
    console.log('   - 或者设置 USE_CHROME_FOR_TESTING=false 禁用自动使用');

  } catch (error) {
    console.error('');
    console.error('❌ 下载失败:', error.message);
    console.error('');
    console.error('🔧 故障排除:');
    console.error('   1. 检查网络连接');
    console.error('   2. 验证 Chrome 版本是否支持当前平台');
    console.error('   3. 确保有足够的磁盘空间');
    console.error('   4. 检查文件权限');
    console.error('');
    console.error('📖 更多信息请查看: CHROME_FOR_TESTING.md');
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { main, parseArgs, showHelp };
