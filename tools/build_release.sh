#!/usr/bin/env bash
# DEDAO 发布打包 —— 生成 dist/DEDAO_release/（TapTap WebView 壳 / 通用 H5 发布包）
# 用法：在仓库根目录运行  bash tools/build_release.sh
# 只包含运行时文件，剔除 .git / test / 文档 / 开发脚本 / node_modules。
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="dist/DEDAO_release"
rm -rf "$OUT"
mkdir -p "$OUT"

# 运行时白名单
cp index.html manifest.json sw.js "$OUT/"
cp -r css js assets "$OUT/"

# 剔除 AI 原图（_src 为生成源，不进发布包；只发布处理后成品）
rm -rf "$OUT/assets/img/_src"

# 校验：字体/音频为压缩后版本
echo "=== 包体构成 ==="
du -sh "$OUT"/* | sort -rh
echo "=== 总大小 ==="
du -sh "$OUT"
echo "=== 大文件 TOP10 ==="
find "$OUT" -type f -printf "%s\t%p\n" | sort -rn | head -10 | awk -F'\t' '{printf "%.2f MB\t%s\n", $1/1048576, $2}'
echo ""
echo "完成：$OUT （可直接作为 TapTap WebView 壳的 assets，或部署到任意静态服务器）"
