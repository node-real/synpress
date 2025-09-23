# CI/CD Chrome for Testing 集成指南

## 概述

本文档描述了如何在 CI/CD 流程中集成 Chrome for Testing，以解决 Chrome v137+ 的扩展加载问题。

## GitHub Actions 工作流修改

### 1. 现有工作流更新

#### 1.1 `e2e_cypress-action.yml`
- ✅ 添加了 Chrome for Testing 下载步骤
- ✅ 配置了环境变量
- ✅ 在测试运行前设置 Chrome

#### 1.2 `e2e_headful.yml`
- ✅ 添加了 Chrome for Testing 下载步骤
- ✅ 配置了环境变量
- ✅ 在测试运行前设置 Chrome

#### 1.3 `e2e_docker.yml`
- ✅ 通过 Docker 配置支持 Chrome for Testing

### 2. 新增工作流

#### 2.1 `test-chrome-for-testing.yml`
- ✅ 专门测试 Chrome for Testing 功能
- ✅ 多平台测试 (linux64, win32, mac-x64)
- ✅ 集成测试
- ✅ 环境变量测试

## Docker 配置修改

### 1. Dockerfile 更新

```dockerfile
# 添加 Chrome for Testing 依赖
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# 设置 Chrome for Testing
RUN echo "🔧 Setting up Chrome for Testing in Docker..." && \
    pnpm run chrome:download && \
    echo "✅ Chrome for Testing setup complete"
```

### 2. docker-compose.ci.yml 更新

```yaml
environment:
  # Chrome for Testing configuration
  - USE_CHROME_FOR_TESTING=true
  - CHROME_FOR_TESTING_VERSION=136.0.7103.49
```

## 环境变量配置

### 1. GitHub Actions 环境变量

```yaml
env:
  # Chrome for Testing configuration
  USE_CHROME_FOR_TESTING: true
  CHROME_FOR_TESTING_VERSION: 136.0.7103.49
```

### 2. Docker 环境变量

```yaml
environment:
  - USE_CHROME_FOR_TESTING=true
  - CHROME_FOR_TESTING_VERSION=136.0.7103.49
```

## 工作流步骤

### 1. 标准 E2E 测试流程

```yaml
- name: Install dependencies
  run: pnpm install --frozen-lockfile --prefer-offline

- name: Setup Chrome for Testing
  run: |
    echo "🔧 Setting up Chrome for Testing..."
    pnpm run chrome:download
    echo "✅ Chrome for Testing setup complete"
  env:
    CHROME_FOR_TESTING_VERSION: 136.0.7103.49
    USE_CHROME_FOR_TESTING: true

- name: Run e2e tests
  run: pnpm test:e2e:anvil
  env:
    USE_CHROME_FOR_TESTING: true
    CHROME_FOR_TESTING_VERSION: 136.0.7103.49
```

### 2. Docker 构建流程

```dockerfile
# 安装依赖
RUN pnpm install --frozen-lockfile --prefer-offline

# 安装 Chrome for Testing 依赖
RUN apt-get update && apt-get install -y wget unzip

# 设置 Chrome for Testing
RUN pnpm run chrome:download
```

## 缓存策略

### 1. GitHub Actions 缓存

```yaml
- name: Setup cache
  uses: actions/cache@v2
  with:
    path: |
      .pnpm-store
      node_modules
      /home/runner/.cache/Cypress
    key: ${{ runner.os }}-pnpm-v1-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-v1-
```

### 2. Docker 层缓存

```yaml
- name: Cache Docker layers
  uses: actions/cache@v2
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-buildx-
```

## 故障排除

### 1. 常见问题

#### 1.1 下载失败
```bash
# 检查网络连接
curl -I https://storage.googleapis.com/chrome-for-testing-public/136.0.7103.49/linux64/chrome-linux64.zip

# 检查磁盘空间
df -h
```

#### 1.2 权限问题
```bash
# 检查文件权限
ls -la node_modules/chrome-for-testing-*/

# 修复权限
chmod +x node_modules/chrome-for-testing-*/chrome-linux64/chrome
```

#### 1.3 环境变量问题
```bash
# 检查环境变量
echo $USE_CHROME_FOR_TESTING
echo $CHROME_FOR_TESTING_VERSION

# 设置环境变量
export USE_CHROME_FOR_TESTING=true
export CHROME_FOR_TESTING_VERSION=136.0.7103.49
```

### 2. 调试步骤

#### 2.1 本地调试
```bash
# 测试下载
npm run chrome:download

# 检查状态
npm run chrome:status

# 验证安装
npm run chrome:verify
```

#### 2.2 CI 调试
```yaml
- name: Debug Chrome for Testing
  run: |
    echo "Current directory: $(pwd)"
    echo "Node version: $(node --version)"
    echo "NPM version: $(npm --version)"
    echo "Environment variables:"
    env | grep -E "(CHROME|USE_)"
    echo "Chrome for Testing status:"
    npm run chrome:status
```

## 性能优化

### 1. 缓存优化

- ✅ 缓存 Chrome for Testing 下载
- ✅ 缓存 Node.js 依赖
- ✅ 缓存 Cypress 二进制文件

### 2. 并行执行

- ✅ 多平台并行测试
- ✅ 独立的工作流任务
- ✅ 矩阵策略

### 3. 资源优化

- ✅ 清理临时文件
- ✅ 优化 Docker 镜像大小
- ✅ 减少不必要的依赖

## 监控和报告

### 1. 测试报告

- ✅ 测试结果汇总
- ✅ 失败原因分析
- ✅ 性能指标

### 2. 日志记录

- ✅ 详细的操作日志
- ✅ 错误信息记录
- ✅ 调试信息输出

## 最佳实践

### 1. 版本管理

- ✅ 固定 Chrome for Testing 版本
- ✅ 定期更新版本
- ✅ 版本兼容性测试

### 2. 错误处理

- ✅ 优雅的错误处理
- ✅ 回退机制
- ✅ 重试逻辑

### 3. 安全性

- ✅ 安全的下载源
- ✅ 文件完整性验证
- ✅ 权限控制

## 总结

Chrome for Testing 的 CI/CD 集成已经完成，包括：

1. **GitHub Actions 工作流更新** - 所有 E2E 测试工作流都支持 Chrome for Testing
2. **Docker 配置更新** - 容器化环境支持 Chrome for Testing
3. **环境变量配置** - 统一的环境变量管理
4. **测试工作流** - 专门的 Chrome for Testing 测试
5. **缓存策略** - 优化构建性能
6. **故障排除** - 完整的调试和问题解决指南

这个集成确保了在 Chrome v137+ 环境下的测试兼容性和稳定性。
