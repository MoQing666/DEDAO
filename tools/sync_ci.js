#!/usr/bin/env node
/* DEDAO 主仓 ↔ 隔离测试仓 同步器
 * ------------------------------------------------------------------
 * 主仓（游戏代码真源）：D:/opencode/dedaO
 * 隔离测试仓（改测试/CI 的地方）：D:/opencode/DEDAO_ci
 *
 * 命令：
 *   node tools/sync_ci.js status               # 只看差异，不动文件
 *   node tools/sync_ci.js pull                 # 主仓 → 隔离仓（游戏代码更新后）
 *   node tools/sync_ci.js push                 # 隔离仓 → 主仓（预演，不写盘）
 *   node tools/sync_ci.js push --yes           # 隔离仓 → 主仓（真正回灌）
 *   node tools/sync_ci.js pull --force         # 有冲突也以主仓为准覆盖
 *
 * 规则：
 *   1. 只复制，从不删除。任一侧的新增文件不会被抹掉。
 *   2. 冲突判定 = 两边内容不同。谁新谁赢（按 mtime）。旧的一侧被跳过并列出，
 *      需要人工决定：要么 push 回去，要么 --force。
 *   3. push 默认只允许回灌「测试与工程配置」（test/ tools/ package.json .github/ .gitignore），
 *      避免误把游戏代码反向覆盖。确需放开用 --all。
 *   4. 恒定跳过：.git / node_modules / dist / .workbuddy / test/reports / __pycache__
 *
 * 路径可用环境变量覆盖：DEDAO_MAIN / DEDAO_CI
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MAIN = path.resolve(process.env.DEDAO_MAIN || 'D:/opencode/dedaO');
const CI = path.resolve(process.env.DEDAO_CI || 'D:/opencode/DEDAO_ci');

/* 恒定跳过 */
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', '.workbuddy', '__pycache__', 'reports']);
const SKIP_REL = new Set(['test/reports']);

/* push 时允许回灌的范围（前缀） */
const PUSH_ALLOW = ['test/', 'tools/', 'package.json', 'package-lock.json', '.github/', '.gitignore'];

const args = process.argv.slice(2);
const cmd = args[0] || 'status';
const FORCE = args.includes('--force');
const YES = args.includes('--yes');
const ALL = args.includes('--all');

function walk(root) {
  const out = [];
  (function rec(dir, rel) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of entries) {
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        if (SKIP_REL.has(r)) continue;
        rec(path.join(dir, e.name), r);
      } else if (e.isFile()) {
        if (SKIP_REL.has(r)) continue;
        out.push(r);
      }
    }
  })(root, '');
  return out;
}

function same(a, b) {
  try {
    const sa = fs.statSync(a), sb = fs.statSync(b);
    if (sa.size !== sb.size) return false;
    return fs.readFileSync(a).equals(fs.readFileSync(b));
  } catch (e) { return false; }
}

function newer(srcF, dstF) {
  try {
    return fs.statSync(srcF).mtimeMs > fs.statSync(dstF).mtimeMs;
  } catch (e) { return true; }
}

function copy(srcF, dstF) {
  fs.mkdirSync(path.dirname(dstF), { recursive: true });
  fs.copyFileSync(srcF, dstF);
  try {
    const st = fs.statSync(srcF);
    fs.utimesSync(dstF, st.atime, st.mtime);
  } catch (e) { /* 时间戳同步失败不影响内容 */ }
}

function allowedForPush(rel) {
  if (ALL) return true;
  return PUSH_ALLOW.some((p) => rel === p || rel.startsWith(p));
}

function run(srcRoot, dstRoot, label, restrict) {
  const files = walk(srcRoot);
  const copied = [], skipped = [], conflict = [], blocked = [];
  for (const rel of files) {
    const srcF = path.join(srcRoot, rel);
    const dstF = path.join(dstRoot, rel);
    if (restrict && !allowedForPush(rel)) { blocked.push(rel); continue; }
    if (!fs.existsSync(dstF)) { copy(srcF, dstF); copied.push(rel + '  (新增)'); continue; }
    if (same(srcF, dstF)) { skipped.push(rel); continue; }
    if (FORCE || newer(srcF, dstF)) { copy(srcF, dstF); copied.push(rel); }
    else conflict.push(rel);
  }
  console.log(`\n[${label}] ${srcRoot}  →  ${dstRoot}`);
  console.log(`  复制 ${copied.length} · 相同 ${skipped.length} · 冲突跳过 ${conflict.length}` + (restrict ? ` · 范围外 ${blocked.length}` : ''));
  if (copied.length) {
    console.log('  —— 已复制：');
    copied.slice(0, 40).forEach((r) => console.log('     + ' + r));
    if (copied.length > 40) console.log(`     … 另有 ${copied.length - 40} 个`);
  }
  if (conflict.length) {
    console.log('  —— 冲突（目标更新，已跳过；用 --force 覆盖，或先反向同步）：');
    conflict.slice(0, 40).forEach((r) => console.log('     ! ' + r));
    if (conflict.length > 40) console.log(`     … 另有 ${conflict.length - 40} 个`);
  }
  return { copied: copied.length, conflict: conflict.length };
}

function status() {
  const a = walk(MAIN), b = walk(CI);
  const setB = new Set(b);
  const onlyMain = a.filter((r) => !setB.has(r));
  const setA = new Set(a);
  const onlyCI = b.filter((r) => !setA.has(r));
  const diff = a.filter((r) => setB.has(r) && !same(path.join(MAIN, r), path.join(CI, r)));
  console.log(`\n主仓   ${MAIN}  （${a.length} 文件）`);
  console.log(`隔离仓 ${CI}  （${b.length} 文件）`);
  console.log(`\n仅在主仓 ${onlyMain.length}`);
  onlyMain.slice(0, 20).forEach((r) => console.log('   < ' + r));
  console.log(`仅在隔离仓 ${onlyCI.length}`);
  onlyCI.slice(0, 20).forEach((r) => console.log('   > ' + r));
  console.log(`内容不同 ${diff.length}`);
  diff.slice(0, 40).forEach((r) => {
    const newerSide = newer(path.join(MAIN, r), path.join(CI, r)) ? '主仓较新' : '隔离仓较新';
    console.log('   ≠ ' + r + '  [' + newerSide + ']');
  });
  if (diff.length > 40) console.log(`   … 另有 ${diff.length - 40} 个`);
}

if (!fs.existsSync(MAIN)) { console.error('主仓不存在: ' + MAIN); process.exit(1); }
if (!fs.existsSync(CI)) { console.error('隔离仓不存在: ' + CI); process.exit(1); }

if (cmd === 'status') status();
else if (cmd === 'pull') run(MAIN, CI, 'pull', false);
else if (cmd === 'push') {
  if (!YES) {
    console.log('预演模式（未写盘）。确认无误后加 --yes 真正回灌：');
    console.log('  node tools/sync_ci.js push --yes');
    if (!ALL) console.log('（当前仅回灌 test/ tools/ package.json .github/ .gitignore；放开用 --all）');
  }
  run(CI, MAIN, YES ? 'push' : 'push(预演)', !ALL);
  if (!YES) console.log('\n以上为预演结果，主仓未改动。');
} else {
  console.error('未知命令: ' + cmd + '\n可用: status | pull | push [--yes] [--all] | pull --force');
  process.exit(1);
}
