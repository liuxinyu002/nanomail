# Electron 打包优化实施计划

## 概述

针对当前 Electron 打包存在的三个核心问题（跨平台二进制冗余、打包体积过大、打包流程不稳定），制定系统性的优化方案。通过替换原生依赖、精简打包配置、优化打包流程，将打包体积从 **1.2GB 降低至 200MB 以内**，并确保打包过程的可重复性。

**核心目标**：
- 消除跨平台二进制冗余（bcrypt 所有平台包被打包）
- 大幅减小打包体积（better-sqlite3 源码、中间产物、TS 源文件）
- 建立稳定的打包流程（规避 exFAT AppleDouble 文件问题）

---

## 问题诊断

### 问题 1：跨平台二进制冗余

**现象**：打包目标为 Windows x64，但产物中出现 macOS 目录

**根因分析**：

```
packages/electron/package.json:
├── @node-rs/bcrypt: "^1.10.0"
├── @node-rs/bcrypt-darwin-x64: "^1.10.0"    # macOS x64
├── @node-rs/bcrypt-darwin-arm64: "^1.10.0"  # macOS ARM
├── @node-rs/bcrypt-win32-x64-msvc: "^1.10.0" # Windows x64
└── @node-rs/bcrypt-win32-arm64-msvc: "^1.10.0" # Windows ARM
```

electron-builder 默认将 `dependencies` 中所有包打包进 ASAR，导致：
- 打包 Windows x64 时，macOS/ARM 平台的 bcrypt 二进制也被包含
- 增加 ~5MB 无用数据
- afterPack.js 需要额外处理原生模块路径

**影响文件**：
- `packages/electron/package.json` (第 24-29 行)
- `packages/electron/electron-builder.yml` (第 74 行)
- `packages/electron/build/afterPack.js`

---

### 问题 2：打包体积过大（1.2GB）

**现象**：Windows x64 安装包体积高达 1.2GB

**根因分析**：

| 问题项 | 体积 | 根因 |
|--------|------|------|
| better-sqlite3 源码 | ~20MB | `deps/` 包含 SQLite 源码 |
| better-sqlite3 中间产物 | ~34MB | `build/Release/obj/` 包含编译中间文件 |
| bcrypt 所有平台二进制 | ~5MB | 4 个平台包全部打包 |
| TypeScript 源文件 | ~10MB | `.ts` 文件未排除 |
| 测试文件 | ~5MB | `.test.ts`, `__tests__/` 未排除 |

**当前 files 配置问题**：

```yaml
# electron-builder.yml 第 12-16 行
files:
  - "**/*"              # 过于宽泛，包含所有文件
  - "!**/._*"           # 仅排除 AppleDouble
  - "!**/.DS_Store"
  - "!release/**/*"
```

**影响文件**：
- `packages/electron/electron-builder.yml`

---

### 问题 3：打包流程不稳定

**现象**：ASAR 打包失败，报错 `RangeError: ERR_OUT_OF_RANGE`

**根因**：项目位于外接 exFAT 硬盘，macOS 自动创建 `._` 开头的 AppleDouble 元数据文件，导致 electron-builder ASAR 打包失败

**当前缓解措施**：
- 输出目录设置为 `/tmp/nanomail-electron-release`
- files 配置排除 `!**/._*`
- 但打包过程仍在 exFAT 上执行，AppleDouble 文件可能被创建

**最佳方案**：整个打包流程在原生文件系统（/tmp）上执行

---

## 解决方案

### 方案 1：替换 bcrypt 为 bcryptjs

**理由**：
- bcryptjs 是纯 JavaScript 实现，无原生依赖
- 无需处理跨平台二进制问题
- 移除 afterPack.js 中的 bcrypt 特殊处理
- 性能差异在非高频场景下可忽略

**影响范围**：
- Electron 主进程：移除 @node-rs/bcrypt 及所有平台包
- 后端：修改 esbuild external 配置

---

### 方案 2：精简 electron-builder files 配置

**策略**：使用白名单 + 精准排除

```yaml
files:
  # 白名单：只包含必要文件
  - "dist/**/*"
  - "package.json"
  # 精准排除 better-sqlite3 冗余文件
  - "!node_modules/better-sqlite3/deps/**/*"
  - "!node_modules/better-sqlite3/src/**/*"
  - "!node_modules/better-sqlite3/build/Release/obj/**/*"
  - "!node_modules/better-sqlite3/build/Makefile"
  # 排除源码和测试文件
  - "!**/*.ts"
  - "!**/*.test.*"
  - "!**/__tests__/**/*"
```

---

### 方案 3：优化打包流程

**流程设计**：

```
原项目目录
    │
    │ rsync --exclude 'node_modules' --exclude 'release' --exclude 'dist' --exclude '.git' --exclude '.*'
    ▼
/tmp/nanomail-build-{timestamp}/
    │
    │ pnpm install
    │ pnpm build
    │ electron-builder
    ▼
/tmp/nanomail-electron-release/
    │
    │ 复制回项目目录
    ▼
项目目录/release/
```

**优势**：
- 完全规避 exFAT AppleDouble 问题
- 打包过程干净可控
- 不影响原项目目录

---

## 实施步骤

### Phase 1：替换 bcrypt 依赖

#### 1.1 修改 Electron 包依赖

**文件**: `packages/electron/package.json`

**变更内容**：

```json
{
  "dependencies": {
    "@nanomail/shared": "workspace:*",
    "better-sqlite3": "^12.0.0",
    "bcryptjs": "^2.4.3",
    "electron-store": "^8.1.0"
  }
}
```

**操作步骤**：
1. 删除 `@node-rs/bcrypt` 及所有平台包依赖
2. 添加 `"bcryptjs": "^2.4.3"`
3. 添加 `"@types/bcryptjs": "^2.4.6"` 到 devDependencies
4. 执行 `pnpm install`

---

#### 1.2 修改后端 esbuild 配置

**文件**: `packages/backend/package.json`

**变更内容**：

```json
{
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --outfile=dist/index.cjs --format=cjs --external:better-sqlite3 --external:bcryptjs --loader:.node=file"
  }
}
```

---

#### 1.3 删除 afterPack.js

由于 bcryptjs 无原生依赖，不再需要 afterPack.js：

1. 删除 `packages/electron/build/afterPack.js`
2. 修改 `packages/electron/package.json`，删除 `build.afterPack` 配置

---

### Phase 2：精简打包配置

#### 2.1 修改 electron-builder.yml

**文件**: `packages/electron/electron-builder.yml`

```yaml
appId: com.nanomail.app
productName: NanoMail
directories:
  output: /tmp/nanomail-electron-release
  buildResources: build

# 精简 files 配置：白名单 + 精准排除
files:
  - "dist/**/*"
  - "package.json"
  - "!node_modules/better-sqlite3/deps/**/*"
  - "!node_modules/better-sqlite3/src/**/*"
  - "!node_modules/better-sqlite3/build/Release/obj/**/*"
  - "!node_modules/better-sqlite3/build/Makefile"
  - "!**/*.ts"
  - "!**/*.test.*"
  - "!**/__tests__/**/*"
  - "!**/._*"
  - "!**/.DS_Store"
  - "!release/**/*"

extraResources:
  - from: "../frontend/dist"
    to: "frontend"
    filter:
      - "**/*"
  - from: "../backend/dist/index.cjs"
    to: "backend/index.cjs"

mac:
  category: public.app-category.productivity
  icon: build/icon.icns
  target:
    - dmg
    - zip
  hardenedRuntime: true
  gatekeeperAssess: false

dmg:
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications

win:
  icon: build/icon.ico
  target:
    - target: nsis
      arch:
        - x64
    - target: portable
      arch:
        - x64

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true

asar: true
asarUnpack:
  - "**/*.node"
  - "node_modules/better-sqlite3/**/*"
compression: maximum
```

---

#### 2.2 修改 Vite 主进程配置

**文件**: `packages/electron/vite.main.config.ts`

```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'
import { builtinModules } from 'module'

export default defineConfig({
  build: {
    outDir: 'dist/main',
    lib: {
      entry: resolve(__dirname, 'src/main/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: [...builtinModules, 'electron', 'better-sqlite3', 'bcryptjs'],
      output: {
        entryFileNames: '[name].js',
      },
    },
    minify: false,
    sourcemap: true,
  },
})
```

---

### Phase 3：创建打包脚本

#### 3.1 创建打包脚本

**文件**: `packages/electron/scripts/package.sh`

```bash
#!/bin/bash
# Electron 打包脚本
# 解决 exFAT 文件系统导致的 AppleDouble 文件问题

set -e

# 动态获取项目根目录 (假设脚本在 packages/electron/scripts/ 下)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( dirname "$( dirname "$SCRIPT_DIR" )" )"  # 回退到根目录
ELECTRON_DIR="$PROJECT_ROOT/packages/electron"
BUILD_DIR="/tmp/nanomail-build-$(date +%Y%m%d%H%M%S)"
OUTPUT_DIR="/tmp/nanomail-electron-release"

echo "=== NanoMail Electron 打包脚本 ==="
echo "项目目录: $PROJECT_ROOT"
echo "临时构建目录: $BUILD_DIR"
echo ""

# 解析参数
TARGET_PLATFORM="all"
TARGET_ARCH=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --win)
      TARGET_PLATFORM="win"
      shift
      ;;
    --mac)
      TARGET_PLATFORM="mac"
      shift
      ;;
    --x64)
      TARGET_ARCH="x64"
      shift
      ;;
    --arm64)
      TARGET_ARCH="arm64"
      shift
      ;;
    *)
      echo "未知参数: $1"
      exit 1
      ;;
  esac
done

# Step 1: 清理旧输出
echo "[1/6] 清理旧输出..."
rm -rf "$OUTPUT_DIR"
rm -rf "$ELECTRON_DIR/release"

# Step 2: 复制项目到临时目录
echo "[2/6] 复制项目到临时目录..."
rsync -av --delete \
  --exclude 'node_modules' \
  --exclude 'release' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude '.DS_Store' \
  --exclude '._*' \
  --exclude '*.log' \
  "$PROJECT_ROOT/" "$BUILD_DIR/"

# Step 3: 在临时目录安装依赖
echo "[3/6] 安装依赖..."
cd "$BUILD_DIR"
pnpm install --frozen-lockfile

# Step 4: 构建所有包
echo "[4/6] 构建所有包..."
pnpm build

# Step 5: 执行打包
echo "[5/6] 执行 Electron 打包..."
cd "$BUILD_DIR/packages/electron"

case $TARGET_PLATFORM in
  win)
    if [ "$TARGET_ARCH" = "arm64" ]; then
      npx electron-builder --win --arm64
    else
      npx electron-builder --win --x64
    fi
    ;;
  mac)
    npx electron-builder --mac --universal
    ;;
  all)
    npx electron-builder
    ;;
esac

# Step 6: 复制输出回项目目录
echo "[6/6] 复制输出到项目目录..."
mkdir -p "$ELECTRON_DIR/release"
cp -r "$OUTPUT_DIR/"* "$ELECTRON_DIR/release/"

# 清理临时目录
echo "清理临时目录..."
rm -rf "$BUILD_DIR"

echo ""
echo "=== 打包完成 ==="
echo "输出目录: $ELECTRON_DIR/release"
ls -lh "$ELECTRON_DIR/release"
```

**操作步骤**：
1. 创建 `scripts/package.sh` 文件
2. 添加执行权限：`chmod +x scripts/package.sh`

---

#### 3.2 更新 package.json scripts

**文件**: `packages/electron/package.json`

```json
{
  "scripts": {
    "dev": "concurrently -k \"vite build -c vite.main.config.ts --watch\" \"vite build -c vite.preload.config.ts --watch\" \"wait-on dist/main/index.js dist/preload/index.js && electron .\"",
    "build": "tsc && vite build -c vite.main.config.ts && vite build -c vite.preload.config.ts",
    "build:all": "pnpm --filter @nanomail/shared build && pnpm --filter @nanomail/backend build && pnpm --filter @nanomail/frontend build && pnpm build",
    "rebuild:electron": "electron-builder install-app-deps",
    "package": "./scripts/package.sh",
    "package:mac": "./scripts/package.sh --mac",
    "package:win": "./scripts/package.sh --win --x64",
    "package:win-arm64": "./scripts/package.sh --win --arm64"
  }
}
```

---

## 预期效果

### 体积优化预期

| 优化项 | 优化前 | 优化后 | 节省 |
|--------|--------|--------|------|
| bcrypt 原生包 | ~5MB (4平台) | 0 | 5MB |
| better-sqlite3 冗余 | ~54MB | ~20MB | 34MB |
| TypeScript 源文件 | ~10MB | 0 | 10MB |
| 测试文件 | ~5MB | 0 | 5MB |
| **总计** | **~1.2GB** | **< 200MB** | **> 1GB** |

### 架构简化预期

| 优化项 | 优化前 | 优化后 |
|--------|--------|--------|
| 原生依赖数量 | 2 (bcrypt + better-sqlite3) | 1 (better-sqlite3) |
| afterPack.js 处理 | bcrypt 复制逻辑 | 删除 |
| 打包流程 | 依赖 exFAT 环境稳定 | 在 /tmp 执行，稳定可靠 |

---

## 风险与缓解

### 风险 1：bcryptjs 性能差异

**描述**：bcryptjs 纯 JS 实现，性能低于原生 bcrypt

**缓解措施**：
- NanoMail 的密码哈希频率低（登录/注册），性能差异可忽略
- 如果未来需要高频使用，可考虑缓存哈希结果

---

### 风险 2：打包脚本跨平台兼容性

**描述**：package.sh 仅支持 macOS/Linux

**缓解措施**：
- 当前开发环境为 macOS，脚本可用
- 未来支持 Windows 开发时，可使用 Node.js 脚本替代

---

## 关键文件清单

| 文件路径 | 修改类型 |
|----------|----------|
| `packages/electron/package.json` | 修改依赖，移除 bcrypt，添加 bcryptjs |
| `packages/electron/electron-builder.yml` | 精简 files 配置 |
| `packages/electron/vite.main.config.ts` | 添加 better-sqlite3、bcryptjs 到 external |
| `packages/backend/package.json` | 修改 esbuild external |
| `packages/electron/build/afterPack.js` | 删除 |
| `packages/electron/scripts/package.sh` | 新增 |

---

## 成功标准

- [ ] Windows x64 安装包体积 < 200MB
- [ ] 打包产物无 macOS 目录
- [ ] 打包产物无 bcrypt 相关原生包
- [ ] 应用正常启动，后端进程可用
- [ ] 数据库功能正常
- [ ] 打包过程稳定，无 ASAR 相关错误

---

**文档版本**: v1.0
**创建日期**: 2026-03-27