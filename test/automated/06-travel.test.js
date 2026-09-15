/* DEDAO 自动化测试 —— 06 游历 3 选 1（travel / 年度上限 / 独立池）
 * 验证：三桩际遇择一、年度上限 5、带权不放回、与 MAINLINE/npc 不互通、年末归零。
 */
const { Suite, createGameContext } = require('./_harness');

module.exports = async function build() {
  const S = new Suite('06 游历 3 选 1');
  const G = createGameContext({ seed: 20260906 });
  const E = G.get('Engine');
  const TALENTS = G.get('TALENTS') || [];

  function freshState(idx) {
    const s = E.startLife('travel-test');
    E.commitStart(s, TALENTS[0].id);
    if (idx != null) s.idx = idx;
    s.seen = s.seen || {};
    s.travelYearCount = 0;
    s.actionsLeft = 99;   // 充足行动点，使「年度上限 5」成为唯一约束（否则每年 AP 先耗尽）
    return s;
  }

  S.case('游历返回三桩际遇（multi，1~3 个且互不相同，不含 npc）', (t) => {
    const counts = {};
    let badMulti = 0, badDup = 0, sawNpc = 0;
    for (let i = 0; i < 300; i++) {
      const s = freshState(3);
      const r = E.travel(s);
      if (!r || !r.multi) { badMulti++; continue; }
      counts[r.events.length] = (counts[r.events.length] || 0) + 1;
      const ids = r.events.map(e => e.id);
      if (new Set(ids).size !== ids.length) badDup++;
      r.events.forEach(e => { if (e.tag === 'npc') sawNpc++; });
    }
    t.ok(badMulti === 0, '每次游历都应返回 multi 三选一（异常 ' + badMulti + ' 次）');
    t.ok(badDup === 0, '同一游历内的三桩际遇应互不相同（重复 ' + badDup + ' 次）');
    t.ok(sawNpc === 0, '游历池不应混入 npc（主线缘法）事件');
    t.note('三选一数量分布=' + JSON.stringify(counts));
  });

  S.case('游历每年上限 5 次（达上限提示「机缘已尽」）', (t) => {
    const s = freshState(3);
    let actions = 0, blocked = 0;
    for (let i = 0; i < 12; i++) {
      const r = E.travel(s);
      if (typeof r === 'string' && /机缘已尽/.test(r)) blocked++;
      else if (r && r.multi) actions++;
    }
    t.eq(actions, 5, '每年最多 5 次游历（实测 ' + actions + '）');
    t.ok(blocked > 0, '达上限后应提示「机缘已尽」');
    t.eq(s.travelYearCount, 5, 'travelYearCount 应停在 5');
  });

  S.case('游历年末归零（endYear 重置 travelYearCount）', (t) => {
    const s = freshState(3);
    for (let i = 0; i < 5; i++) E.travel(s);
    t.eq(s.travelYearCount, 5, '先打满 5 次');
    E.endYear(s);
    t.eq(s.travelYearCount, 0, 'endYear 后 travelYearCount 应归零');
  });

  return S;
};
