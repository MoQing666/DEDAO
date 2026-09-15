#!/bin/bash
# 安装「更新前字体检测」pre-commit 钩子（拷贝模板到 .git/hooks 并加执行位）
set -e
ROOT="$(git rev-parse --show-toplevel)"
cp "$ROOT/tools/font_precommit_hook.sh" "$ROOT/.git/hooks/pre-commit"
chmod +x "$ROOT/.git/hooks/pre-commit"
echo "[font-guard] 已安装 pre-commit 钩子：提交前自动检测字体覆盖冲突。"
