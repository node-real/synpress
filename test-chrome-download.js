#!/usr/bin/env node

/**
 * 测试 Chrome for Testing 下载功能
 * 使用方法: node test-chrome-download.js
 */

const helpers = require('./helpers');

async function testChromeDownload() {
  try {
    console.log('开始测试 Chrome for Testing 下载功能...');
    
    // 测试获取 Chrome 信息
    console.log('\n1. 获取 Chrome for Testing 信息...');
    const chromeInfo = await helpers.getChromeForTestingInfo();
    console.log('Chrome 信息:', chromeInfo);
    
    // 测试下载 Chrome
    console.log('\n2. 下载 Chrome for Testing...');
    const chromeBinaryPath = await helpers.prepareChromeForTesting();
    console.log('Chrome 二进制文件路径:', chromeBinaryPath);
    
    console.log('\n✅ Chrome for Testing 下载测试成功！');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

// 运行测试
testChromeDownload();
