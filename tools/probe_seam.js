#!/usr/bin/env node
/* DEDAO 测试缝冒烟验证 —— 证明「把游戏推进到指定进度」真的能用
 *
 * 运行：node tools/probe_seam.js
 *
 * 不是 test/automated/ 里的套件，不占用 365 用例计数（01 套件会校验
 * AGENTS.md 的模块表合计数，随意加套件会把它打红）。
 */
'use strict';
const { createGameContext } = require('../test/automated/_harness');

function line(k, v) { console.log('  ' + k.padEnd(22, ' ') + (Array.isArray(v) ? v.join(' / ') : v)); }

const G = createGameContext();
if (!G.__TEST__) {
  console.error('✗ 测试缝未安装（Engine 未加载？）');
  process.exit(1);
}
const T = G.__TEST__;

console.log('\n[1] 固定种子 → 两次运行结果必须完全一致');
function playOnce(seed) {
  T.setSeed(seed);
  const s = T.newLife('甲');
  T.jumpToRealm('筑基', { maxYears: 400 });
  return T.snapshot(s);
}
const a = playOnce(20260925);
const b = playOnce(20260925);
const same = JSON.stringify(a) === JSON.stringify(b);
console.log(same ? '  ✓ 同种子结果一致' : '  ✗ 同种子结果不一致（随机源没被接管）');
line('第 1 次', `${a.realm} · 第 ${a.year} 年 · 攻 ${a.atk} · 灵石 ${a.stone}`);
line('第 2 次', `${b.realm} · 第 ${b.year} 年 · 攻 ${b.atk} · 灵石 ${b.stone}`);

console.log('\n[2] 换种子 → 结果应当不同');
const c = playOnce(12345);
const diff = JSON.stringify(a) !== JSON.stringify(c);
console.log(diff ? '  ✓ 换种子结果不同' : '  ✗ 换种子结果相同（种子没生效）');
line('种子 12345', `${c.realm} · 第 ${c.year} 年 · 攻 ${c.atk} · 灵石 ${c.stone}`);

console.log('\n[3] jumpToYear：直接推到第 N 年');
T.setSeed(20260925);
const s3 = T.newLife('乙');
const r3 = T.jumpToYear(60);
line('目标第 60 年', `实到第 ${s3.year} 年 · 推进 ${r3.years} 年 · 境界 ${s3.realm} · 死亡 ${s3.dead}`);
console.log(s3.year === 60 ? '  ✓ 年份到位' : '  ✗ 年份未到位（中途死亡或推进受阻）');

console.log('\n[4] jumpToRealm：推到指定境界');
T.setSeed(20260925);
const s4 = T.newLife('丙');
for (const realm of ['筑基', '金丹', '元婴']) {
  const r = T.jumpToRealm(realm, { maxYears: 2000 });
  line(realm, `命中 ${r.hit} · 第 ${s4.year} 年 · 用 ${r.years} 年 · 死亡 ${s4.dead}`);
}

console.log('\n[5] snapshot：断言可用的关键字段');
const snap = T.snapshot(s4);
line('快照字段', Object.keys(snap).join(', '));

const ok = same && diff && s3.year === 60;
console.log('\n结果: ' + (ok ? '✓ 测试缝可用' : '✗ 测试缝存在问题'));
process.exit(ok ? 0 : 1);
