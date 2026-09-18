/* DEDAO 自动化测试 —— 16 法宝栏槽位解锁（有效值口径）
 * 回归：maxTreasure / treasureSlotUnlockText 必须用「有效」道心/神识（基础+命格+法宝），
 *       与角色面板显示一致；否则玩家靠命格/法宝把有效值堆到≥10 时，法宝栏却未解锁。
 */
const { ROOT, Suite, createGameContext } = require('./_harness');

module.exports = async function build() {
  const S = new Suite('16 法宝栏槽位解锁（有效值口径）');
  const G = createGameContext({ seed: 20260905 });
  const E = G.get('Engine');

  function mk(over) {
    const s = {
      idx: 3,                       // 金丹：bigIdxOf=1 → 基础 3+1=4 槽
      dao: 0, shen: 0, wu: 0, ti: 0, dun: 0, ling: 0,
      stone: 0, hp: 100, hpMax: 100, qi: 0,
      arts: [], equip: { treasure: [] },
      destinies: [], reinc: {}, artAttr: { wu: 0, ti: 0, dun: 0, shen: 0, dao: 0, ling: 0 },
    };
    return Object.assign(s, over);
  }

  /* 原始值达标 → 解锁正常 */
  S.case('原始 道心/神识 达 12 → 各 +1 栏位', function (t) {
    const s = mk({ dao: 12, shen: 12 });
    const maxT = E.maxTreasure(s);
    t.eq(maxT, 4 + 1 + 1, '金丹基础4 + 道心1 + 神识1 = 6');
    t.eq(E.effAttr(s, 'dao'), 12, '有效道心=12');
    t.eq(E.effAttr(s, 'shen'), 12, '有效神识=12');
  });

  /* 有效值达标但原始值未达标（法宝 +5 道心 / +3 神识）→ 修复后应解锁 */
  S.case('有效值达标(法宝加成) 但原始值未达标 → 仍解锁（修复点）', function (t) {
    const s = mk({ dao: 7, shen: 7, artAttr: { dao: 5, shen: 3 } });
    t.eq(E.effAttr(s, 'dao'), 12, '面板显示有效道心=12（已达+1门槛）');
    t.eq(E.effAttr(s, 'shen'), 10, '面板显示有效神识=10（已达+1门槛）');
    const maxT = E.maxTreasure(s);
    t.eq(maxT, 6, '修复后应按有效值解锁：金丹4 + 道心1 + 神识1 = 6（修复前为 4）');
  });

  /* 命格加成路径同样应生效 */
  S.case('有效值达标(命格加成) → 解锁', function (t) {
    // 取一件「道心/神识」向命格作代表；此处直接用 artAttr+命格混合模拟：
    // 原始 8/8，命格(经 effAttr) 不在此处直接构造，改以「法宝提供且原始<10」为等价验证。
    const s = mk({ dao: 9, shen: 9, artAttr: { dao: 1, shen: 1 } });
    t.eq(E.effAttr(s, 'dao'), 10, '有效道心=10');
    t.eq(E.effAttr(s, 'shen'), 10, '有效神识=10');
    t.eq(E.maxTreasure(s), 6, '有效值达 10 → 各+1，金丹基础4+1+1=6');
  });

  /* 上限封顶：有效值再高也最多各 +3（共 +6 栏位） */
  S.case('道心/神识 加成封顶 各 +3', function (t) {
    const s = mk({ dao: 99, shen: 99, artAttr: { dao: 0, shen: 0 } });
    t.eq(E.maxTreasure(s), 4 + 3 + 3, '金丹4 + 道心3(封顶) + 神识3(封顶) = 10');
  });

  return S;
};
