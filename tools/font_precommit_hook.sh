#!/bin/bash
# DEDAO 字体覆盖守卫（pre-commit）
# 提交前检测本次更新引入的「玩家可见文字」是否超出 woff2 字形表。
# 命中未豁免缺字 → 阻止提交，避免再次回归到「两套字形并存」。
# 环境异常（无 Python / 字体工具报错）→ 仅告警放行，不阻挡并发会话的正常提交。

PY="C:/Users/Lenovo/.workbuddy/binaries/python/versions/3.13.12/python.exe"
if [ ! -x "$PY" ]; then
  PY="$(command -v python3 2>/dev/null || command -v python 2>/dev/null || true)"
fi
if [ -z "$PY" ]; then
  echo "[font-guard] 未找到 Python，跳过字体检测（仅告警）。"
  exit 0
fi

ROOT="$(git rev-parse --show-toplevel)"
OUT="$("$PY" "$ROOT/tools/font_coverage.py" --check --staged 2>&1)"
RC=$?
echo "$OUT"

if [ $RC -eq 0 ]; then
  exit 0
fi

# 区分「真·缺字」与「工具/环境故障」
if echo "$OUT" | grep -q "缺少 tools/font_charset\|未安装 fontTools\|工具未能运行"; then
  echo "[font-guard] 字体工具环境异常，放行本次提交（仅告警），请尽快修复。"
  exit 0
fi

echo "[font-guard] ✗ 本次提交引入了字体未覆盖的玩家可见字符，已阻止。"
echo "[font-guard] 解决：改写用字 / 或确认属系统字形后加入 tools/font_allowlist.txt"
echo "[font-guard] 也可临时跳过：git commit --no-verify（不推荐）"
exit 1
