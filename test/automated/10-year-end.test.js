/* DEDAO 自动化测试 —— 10 年末结算（回满血蓝 / 岁增 / 行动点重置）
 * 覆盖：岁增、气血与灵力「每年回满」这条唯一恢复机制、行动点按当年上限重置。
 * 之所以单列一册：这条机制在 UI 上没有任何显式提示，极易被误判为「没实装」。
 */
const { Suite, createGameContext } = require('./_harness');

module.exports = async function build() {
  const S = new Suite('10 年末结算（回满血蓝/岁增/行动点）');
  const G = createGameContext({ seed: 20260911 });
  const E = G.get('Engine');

  function started() {
    const s = E.startLife('年末测试');
    E.commitStart(s, 'wuxing'); // 任意天赋，确保初始化
    return s;
  }

  S.case('年末：气血与灵力尽数回满（全年唯一回满机制）', (t) => {
    const s = started();
    E.refreshStats(s);
    s.hp = Math.max(1, Math.round(s.hpMax * 0.25));
    s.mp = Math.round(s.mpMax * 0.15);
    t.lt(s.hp, s.hpMax, '前置：气血应未满');
    t.lt(s.mp, s.mpMax, '前置：灵力应未满');
    const y0 = s.year, a0 = s.age;
    const r = E.endYear(s);
    t.eq(r, 'ok', 'endYear 应正常推进一年（实际返回 ' + r + '）');
    t.eq(s.year, y0 + 1, '年份应 +1');
    t.eq(s.age, a0 + 1, '年龄应 +1');
    t.eq(s.hp, s.hpMax, '年末气血应回满（实装点：engine.endYear 内 s.hp = s.hpMax）');
    t.eq(s.mp, s.mpMax, '年末灵力应回满（实装点：engine.endYear 内 s.mp = s.mpMax）');
  });

  S.case('年末：进入秘境中被打残，跨年后同样回满', (t) => {
    const s = started();
    s.actionsLeft = 6;
    const r = E.startAdventure(s, 'huang', { ap: 2, items: [] });
    t.ok(r.ok, '进入秘境失败: ' + (r.msg || ''));
    E.refreshStats(s);
    s.hp = 1;                                    // 秘境里被打到只剩一口气
    s.mp = 0;
    const yr = E.endYear(s);
    t.ok(yr === 'ok' || yr === 'end', 'endYear 返回异常: ' + yr);
    if (yr === 'ok') {
      t.eq(s.hp, s.hpMax, '跨年后气血应回满（不因秘境残留低血而卡住）');
      t.eq(s.mp, s.mpMax, '跨年后灵力应回满');
    }
  });

  S.case('年末：行动点重置为当年上限', (t) => {
    const s = started();
    s.actionsLeft = 0;
    E.endYear(s);
    t.gt(s.actionsLeft, 0, '行动点应在年末重置（不应为 0）');
    t.eq(s.actionsLeft, E.actionPoints(s), '行动点应等于当年上限');
  });

  S.case('年末：写入年度自动存档（autoSaveYear + 自动存档位）', (t) => {
    const s = started();
    const ls = G.get('localStorage');
    ls.removeItem('dedao_save');
    const r = E.endYear(s);
    t.eq(r, 'ok', 'endYear 应正常推进一年（实际 ' + r + '）');
    t.eq(s.autoSaveYear, s.year, 'autoSaveYear 应等于推进后的年份');
    const raw = ls.getItem('dedao_save');
    t.ok(!!raw, '年末应写入自动存档位 dedao_save（中途退出即续这一份）');
    const parsed = raw ? JSON.parse(raw) : null;
    t.eq(parsed && parsed.autoSaveYear, s.year, '自动存档内容应含 autoSaveYear');
    t.eq(parsed && parsed.year, s.year, '自动存档应记录推进后的年份（读回来才接得上）');
    t.note('实装点：engine.endYear 末尾 s.autoSaveYear = s.year; saveState(s)；UI 会提示「进度已自动存档 · 第 N 年」');
  });

  return S;
};
