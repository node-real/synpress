# Chrome for Testing 集成说明

## 概述

由于 Chrome v137+ 不再支持 `--load-extension` 参数，我们集成了 Chrome for Testing 来解决扩展加载问题。

## 功能特性

- 自动检测操作系统类型
- 下载对应平台的 Chrome for Testing
- 支持 Windows、macOS 和 Linux
- 自动解压和配置
- 缓存机制，避免重复下载

## 环境变量

### CHROME_FOR_TESTING_VERSION
指定 Chrome for Testing 版本，默认为 `140.0.7339.185`

```bash
export CHROME_FOR_TESTING_VERSION="140.0.7339.185"
```

## 使用方法

### 1. 在代码中使用

```javascript
const helpers = require('./helpers');

// 准备 Chrome for Testing
const chromeBinaryPath = await helpers.prepareChromeForTesting();
console.log('Chrome 路径:', chromeBinaryPath);
```

### 2. 在 Cypress 配置中使用

```javascript
// cypress.config.js
module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('before:browser:launch', async (browser = {}, arguments_) => {
        if (browser.name === 'chrome') {
          // 使用 Chrome for Testing
          const chromePath = await helpers.prepareChromeForTesting();
          arguments_.executablePath = chromePath;
        }
      });
    },
  },
});
```

## 支持的操作系统

| 操作系统 | 平台标识 | 二进制文件路径 |
|---------|---------|---------------|
| Windows | win32 | `chrome-win32/chrome.exe` |
| macOS (Intel) | mac-x64 | `chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing` |
| macOS (Apple Silicon) | mac-arm64 | `chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing` |
| Linux | linux64 | `chrome-linux64/chrome` |

## 下载目录

- **Windows**: `node_modules/chrome-for-testing-{version}-{platform}/`
- **其他系统**: `downloads/chrome-for-testing-{version}-{platform}/`

## 测试

运行测试脚本验证下载功能：

```bash
node test-chrome-download.js
```

## 错误处理

如果下载失败，会抛出详细的错误信息，包括：
- 网络连接问题
- 文件系统权限问题
- 解压失败
- 二进制文件不存在

## 注意事项

1. 首次下载可能需要较长时间，取决于网络速度
2. 确保有足够的磁盘空间（约 200MB）
3. 在 CI 环境中，建议缓存下载的 Chrome 文件
4. 如果遇到权限问题，确保对下载目录有写权限

## 故障排除

### 下载失败
- 检查网络连接
- 验证下载 URL 是否可访问
- 检查磁盘空间

### 解压失败
- 确保 ZIP 文件完整下载
- 检查文件权限
- 验证 AdmZip 库是否正确安装

### 二进制文件不存在
- 检查解压是否成功
- 验证平台标识是否正确
- 确认 Chrome 版本是否支持当前平台
