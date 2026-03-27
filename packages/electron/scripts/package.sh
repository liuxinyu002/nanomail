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