/* DEDAO 轮回结算重做 —— 断言式校验脚本
 * 运行：node tools/reinc_validate.js
 *
 * 2026-09-15 改版：**不再手抄公式 / 数据表**，经 `_engine_loader` 真加载
 *   `js/data.js` + `js/engine.js`，直调 `Engine.settlePoints` / `Engine.earnPoints`。
 *
 * 改版原因（AGENTS.md #59「第四大 bug 类」）—— 旧版本三处分叉同时存在，整列算错：
 *   ① 渡劫分写 `Math.floor(s.broken/3)`。`s.broken` 是「突破次数」（每次小阶提升 +1），
 *      引擎用的是 `s.tribPassed*3`（渡劫次数：金丹劫/元婴劫/飞升劫，至多 3 次）。
 *      引擎里有同源前车之鉴（成就 `sanjie` 曾误用 s.broken，engine.js:4801 注释）。
 *   ② 漏结局乘子 `endMul`：飞升/仙 1.2、打破轮回 1.5（engine.js:4740）。
 *   ③ 漏秘境分里的 `exploreKills*0.05`（engine.js:4696）。
 *   净效应：脚本输出的 jie0 列 6/18/34/55/129 整列偏低（正确 6/18/37/61/164），
 *   而方案文档四张表全部照抄它。且脚本自己那条「全部天赋全满 = 1406」断言（实测 1296）
 *   一直报 ❌ 却因不在 run.js 视野里而无人看见 —— 故另有 `test/automated/13-tools-reinc.test.js` 守它。
 *
 * 成就分口径：文档表用的是**保守成就集**（2/4/9/14/48）。本脚本用「预置 meta」把
 *   其余已达成成就标记为『早先已得』，让引擎只把指定几条算作本世新增 → 复现文档数字，
 *   且公式完全出自引擎（零镜像）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { load } = require('./_engine_loader');

const G = load();
const ENG = G.Engine;
const REINC = G.REINCARNATION;

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name + (extra ? '  → ' + extra : '')); }
  else { fail++; console.log('  ❌ ' + name + (extra ? '  → ' + extra : '')); }
}

/* ---------- 1. 直读 data.js / 引擎的 REINCARNATION，算真实加满成本 ---------- */
console.log('\n=== 测试1：六维 max=9 加满成本（数据表直读）===');
const costOf = r => r.cost * r.max * (r.max + 1) / 2; // 第 n 级 = cost×n
const sixIds = ['wu', 'ti', 'dun', 'shen', 'dao', 'ling'];
let sixTotal = 0, allTotal = 0;
REINC.forEach(r => {
  const c = costOf(r);
  allTotal += c;
  if (sixIds.indexOf(r.id) >= 0) sixTotal += c;
  console.log('  ' + r.id.padEnd(14) + ' cost=' + r.cost + ' max=' + r.max + ' 满级=' + c);
});
check('六维核心全满 = 1080', sixTotal === 1080, sixTotal);
check('全部天赋全满 = 1296', allTotal === 1296, allTotal);
check('道心(dao)+悟性(wu) = 540（单维各270）',
  (costOf(REINC.find(x => x.id === 'dao')) + costOf(REINC.find(x => x.id === 'wu'))) === 540);

/* ---------- 2. 引擎公式入口 ---------- */
console.log('\n=== 测试2：结算走 Engine.settlePoints / earnPoints（零镜像）===');
check('Engine.settlePoints 已导出', typeof ENG.settlePoints === 'function');
check('Engine.earnPoints 已导出', typeof ENG.earnPoints === 'function');

function blankMeta() { return { lives: 1, earnedTotal: 0, achievements: {}, reinc: {}, destinySeen: {} }; }
function mkState(tag, realm, idx, trib, death, cleared, endReason) {
  const s = ENG.startLife(tag);
  s.realm = realm; s.idx = idx;
  s.tribPassed = trib; s.deathPassed = death;
  s.flags = s.flags || {};
  const ac = {}; cleared.forEach(k => { ac[k] = 1; }); s.flags.advClear = ac;
  s.endReason = endReason; s.jie = 0;
  return s;
}
/* 只让 keep 里的成就算作"本世新增"，其余已达成的一律预置为早先已得 → 复现文档的保守成就分 */
function settleKeep(s, keep) {
  const meta = blankMeta();
  const satisfied = ENG.achDefs(s, meta) || {};
  Object.keys(satisfied).forEach(id => { if (satisfied[id] && keep.indexOf(id) < 0) meta.achievements[id] = 1; });
  return ENG.settlePoints(s, meta);
}

/* 典型可达场景（含秘境探索；成就分为文档口径的保守值） */
const SCEN = [
  { tag: '炼气初陨', realm: '炼气', idx: 0,  trib: 0, death: 0, cleared: ['huang'],                                end: '寿元耗尽', keep: ['chu_tan', 'shou_zhong'] },
  { tag: '筑基陨',   realm: '筑基', idx: 3,  trib: 0, death: 1, cleared: ['huang', 'xuan'],                      end: '寿元耗尽', keep: ['shou_zhuji', 'chu_tan', 'shou_zhong'] },
  { tag: '金丹陨',   realm: '金丹', idx: 6,  trib: 1, death: 2, cleared: ['huang', 'xuan', 'di'],                 end: '寿元耗尽', keep: ['shou_zhuji', 'shou_jiejin', 'dongtian'] },
  { tag: '元婴陨',   realm: '元婴', idx: 9,  trib: 2, death: 4, cleared: ['huang', 'xuan', 'di', 'tian'],          end: '寿元耗尽', keep: ['shou_zhuji', 'shou_jiejin', 'shou_yuanying', 'moya'] },
  { tag: '飞升',     realm: '仙',   idx: 15, trib: 3, death: 4, cleared: ['huang', 'xuan', 'di', 'tian', 'xian'], end: '飞升',     keep: ['shou_zhuji', 'shou_jiejin', 'shou_yuanying', 'feisheng', 'sanjie', 'chu_tan', 'feizhai', 'daheishan', 'dongtian', 'quanjing', 'chu_dao', 'churu', 'san_xiu'] },
];

function settleAt(row, jie) {
  const s = mkState(row.tag, row.realm, row.idx, row.trib, row.death, row.cleared, row.end);
  s.jie = jie || 0;
  return settleKeep(s, row.keep);
}

console.log('\n=== 测试3：逐场景单局收益（K=0.05，删 jie×2）===');
console.log('场景'.padEnd(10) + '| jie0'.padStart(5) + ' | jie3'.padStart(5) + ' | jie6'.padStart(5) + ' | jie9'.padStart(5));
let worst = 0, worstTag = '';
const JIE0 = {};
SCEN.forEach(row => {
  const v = [0, 3, 6, 9].map(j => settleAt(row, j).total);
  JIE0[row.tag] = v[0];
  console.log(row.tag.padEnd(8) + ' | ' + v.map(x => String(x).padStart(5)).join(' | '));
  check(row.tag + ' 单调递增(jie0≤3≤6≤9)', v[0] <= v[1] && v[1] <= v[2] && v[2] <= v[3]);
  check(row.tag + ' 全部 > 0', v[0] > 0 && v[3] > 0);
  const r = v[3] / v[0];
  if (r > worst) { worst = r; worstTag = row.tag; }
});

console.log('\n=== 测试4：高劫膨胀收敛性（K=0.05，删 jie×2）===');
check('最坏倍数 ≤ 4x（原 flat jie×5 为 13x）', worst <= 4, worstTag + ' ' + worst.toFixed(2) + 'x');

console.log('\n=== 测试5：死劫计数贡献生效 ===');
const rowD = { tag: '死劫校验', realm: '元婴', idx: 9, trib: 2, death: 0, cleared: ['huang', 'xuan', 'di', 'tian'], end: '寿元耗尽', keep: ['shou_zhuji', 'shou_jiejin', 'shou_yuanying', 'moya'] };
const withDeath = settleAt(Object.assign({}, rowD, { death: 3 }), 0).total;
const noDeath = settleAt(rowD, 0).total;
check('多通过3次死劫 → +6 点（元婴 jie0）', withDeath - noDeath === 6, '+' + (withDeath - noDeath));

console.log('\n=== 测试6：秘境探索分计入且受封顶（引擎 breakdown.explore）===');
const e1 = settleAt({ tag: 't', realm: '炼气', idx: 0, trib: 0, death: 0, cleared: ['huang'], end: '寿元耗尽', keep: [] }, 0).breakdown.explore;
const e2 = settleAt({ tag: 't', realm: '筑基', idx: 3, trib: 0, death: 0, cleared: ['huang', 'xuan'], end: '寿元耗尽', keep: [] }, 0).breakdown.explore;
const e3 = settleAt({ tag: 't', realm: '炼气', idx: 0, trib: 0, death: 0, cleared: ['huang', 'xuan', 'di', 'tian'], end: '寿元耗尽', keep: [] }, 0).breakdown.explore;
check('炼气首通黄 = 2（封顶4）', e1 === 2, e1);
check('筑基通关黄+玄 = 8（2+4+广度2，封顶8）', e2 === 8, e2);
check('炼气越级刷4秘境被封顶到 4', e3 === 4, e3);

/* ---------- 7. 与方案文档对账：DEDAO_轮回结算重做_方案.md 的两张数字表 ---------- */
console.log('\n=== 测试7：方案文档数字与实算对账（定向，防再次分叉）===');
const DOC = path.join(__dirname, '..', 'DEDAO_轮回结算重做_方案.md');
if (!fs.existsSync(DOC)) {
  console.log('  ⏭  非仓库根（dist 副本无此文档），跳过');
} else {
  const docTxt = fs.readFileSync(DOC, 'utf8');
  const rowRe = new RegExp('^\\|\\s*(' + SCEN.map(s => s.tag).join('|') + ')\\s*\\|.*\\|\\s*(\\d+)\\s*\\|\\s*$', 'm');
  const docJie0 = {};
  docTxt.split('\n').forEach(function (ln) {
    const mm = ln.match(rowRe);
    if (mm) docJie0[mm[1]] = Number(mm[2]);
  });
  SCEN.forEach(function (s) {
    const want = JIE0[s.tag];
    check('§九 平衡表「' + s.tag + '」jie0 = ' + want,
      docJie0[s.tag] === want,
      '文档写 ' + (docJie0[s.tag] === undefined ? '(缺行)' : docJie0[s.tag]) + '，实算 ' + want);
  });
  const flat = docTxt.replace(/\s/g, '');
  check('§7.1「六维核心全满 = 1080」', /六维核心全满=[^小]*1080/.test(flat));
  check('§7.1「全部天赋拉满 = 1296」', flat.indexOf('全部天赋拉满=1296') >= 0);
  check('§九 结论行已更新为 6 / 18 / 37 / 61 / 164',
    /6\s*\/\s*18\s*\/\s*37\s*\/\s*61\s*\/\s*164/.test(docTxt));
  check('§7.2 飞升 jie9 = 522', /^\|\s*飞升\s*\|\s*164\s*\|\s*284\s*\|\s*403\s*\|\s*522\s*\|/m.test(docTxt));
}

console.log('\n========== 结果：' + pass + ' 通过 / ' + fail + ' 失败 ==========');
process.exit(fail ? 1 : 0);
