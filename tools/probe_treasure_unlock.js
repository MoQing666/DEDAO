/* 实测：法宝栏槽位解锁是否随「有效」道心/神识（基础+命格+法宝）达标而解锁
 * 复现 DEDAO_ROOT 默认 = 仓库根；仅加载 data.js + engine.js。
 */
const path = require('path');
const { createGameContext } = require(path.join(__dirname, '..', 'test', 'automated', '_harness'));
const G = createGameContext({ seed: 20260905, files: ['js/data.js', 'js/engine.js'] });
const Engine = G.get('Engine');
const DESTINIES = G.get('DESTINIES');

function mk(over) {
  const s = {
    idx: 3,                 // 金丹（bigIdxOf=1 → 基础 3+1=4 槽）
    dao: 0, shen: 0, wu: 0, ti: 0, dun: 0, ling: 0,
    stone: 0, hp: 100, hpMax: 100, qi: 0,
    arts: [], equip: { treasure: [] },
    destinies: [], reinc: {},
  };
  return Object.assign(s, over);
}

function report(tag, s) {
  const maxT = Engine.maxTreasure(s);
  const effDao = Engine.effAttr(s, 'dao');
  const effShen = Engine.effAttr(s, 'shen');
  // 修复后：maxTreasure 用有效值，故 bonus 应取自 effAttr
  const daoBonus = Math.min(3, Math.floor(effDao / 10));
  const shenBonus = Math.min(3, Math.floor(effShen / 10));
  console.log(`\n[${tag}]`);
  console.log(`  原始 道心=${s.dao} 神识=${s.shen}  → 当前 maxTreasure=${maxT}`);
  console.log(`  有效 道心=${effDao} 神识=${effShen}（面板显示值，解锁判定以此为准）`);
  console.log(`  道心bonus=${daoBonus} 神识bonus=${shenBonus}`);
  return { maxT, effDao, effShen, daoBonus, shenBonus };
}

// 用例1：原始道心/神识 真的达到 12（事件/选项/轮回天赋写入）→ 应解锁
const a = mk({ dao: 12, shen: 12 });
const ra = report('A 原始值达标 dao=12 shen=12', a);

// 用例2：原始道心=7，但法宝带来 +5 道心（有效=12）；原始神识=7，法宝带来 +3 神识（有效=10）
// 面板显示 道心12/神识10，但 maxTreasure 只看原始值 → 不解锁
const b = mk({ dao: 7, shen: 7, artAttr: { dao: 5, shen: 3 } });
const rb = report('B 有效值达标但原始值未达标（法宝加成）', b);

console.log('\n=== 结论（2026-09-18 修复后）===');
console.log('A: 原始达标 → maxTreasure=6（daoBonus=1 shenBonus=1，正常）');
console.log('B: 面板显示 道心12/神识10 已达门槛 → 修复后 maxTreasure=6（同样解锁）。');
console.log('   ⇒ 修复前 B 的 maxTreasure=4（用原始值7/7，未解锁）；现改用 effAttr，与面板口径一致。');
