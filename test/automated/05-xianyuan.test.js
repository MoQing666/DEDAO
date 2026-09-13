/* DEDAO 自动化测试 —— 05 仙缘统一触发（rollXianyuan / evEligible）
 * 验证：统一池 XIANYUAN、概率门、每年上限、once 不重复、min/max 门槛、权重生效。
 */
const fs = require('fs');
const path = require('path');
const { ROOT, Suite, createGameContext } = require('./_harness');

module.exports = async function build() {
  const S = new Suite('05 仙缘统一触发');
  const G = createGameContext({ seed: 20260905 });
  const E = G.get('Engine');
  const XIANYUAN = G.get('XIANYUAN') || [];
  const TALENTS = G.get('TALENTS') || [];

  function freshState(idx) {
    const s = E.startLife('xianyuan-test');
    E.commitStart(s, TALENTS[0].id);
    if (idx != null) s.idx = idx;
    s.seen = s.seen || {};
    s.xianyuanYearCount = 0;
    return s;
  }

  S.case('统一仙缘池 XIANYUAN 含游历与 NPC 事件', (t) => {
    t.ok(XIANYUAN.length > 0, 'XIANYUAN 不应为空');
    const tags = {};
    XIANYUAN.forEach(function (e) { tags[e.tag] = (tags[e.tag] || 0) + 1; });
    const travelLike = (tags['jiyuan'] || 0) + (tags['shejiao'] || 0);
    t.ok(travelLike > 0, '应含游历机缘（tag=jiyuan/shejiao）');
    t.ok(tags['npc'] > 0, '应含仙缘 NPC（tag=npc）');
    t.note('XIANYUAN 共 ' + XIANYUAN.length + ' 条，分布=' + JSON.stringify(tags));
  });

  S.case('rollXianyuan 概率门（命中率≈chance=0.35）', (t) => {
    t.ok(typeof E.rollXianyuan === 'function', 'rollXianyuan 应导出');
    const N = 600;
    let hits = 0;
    for (let i = 0; i < N; i++) {
      const s = freshState(0);          // 每次重置 seen/yearCount，隔离 once/上限 噪声
      if (E.rollXianyuan(s)) hits++;
    }
    const rate = hits / N;
    t.note('实测命中率 ' + rate.toFixed(3) + '（设计 chance=0.35）');
    t.ok(rate > 0.25 && rate < 0.45, '命中率应接近 0.35（实际 ' + rate.toFixed(3) + '）');
  });

  S.case('rollXianyuan 每年上限（perYearMax=3）', (t) => {
    const s = freshState(0);
    s.xianyuanYearCount = 3;             // 已达上限
    t.ok(E.rollXianyuan(s) === null, '达上限时应返回 null');
    s.xianyuanYearCount = 2;
    const ev = E.rollXianyuan(s);
    if (ev) t.eq(s.xianyuanYearCount, 3, '命中后应计数自增到 3');
    // 同一「年」内连续触发次数应 ≤ 3
    const s2 = freshState(0);
    let cnt = 0;
    for (let i = 0; i < 20; i++) if (E.rollXianyuan(s2)) cnt++;
    t.ok(cnt <= 3, '同一「年」内仙缘触发次数应 ≤ 3（实测 ' + cnt + '）');
  });

  /* ⚠️ 2026-09-13 用户实测修复「仙缘的缘法可以无限刷」：
     旧实现只对 ev.once 为真的事件做去重，仙缘池 72 个事件里有 29 个漏标 once，
     导致同一桩机缘可被反复抽中、反复发奖励（实测 60 年内「天降陨铁」触发 11 次）。
     现语义：**默认本世仅触发一次**，只有显式 repeat:true 的事件才允许重复。 */
  S.case('rollXianyuan 触发后写入 seen（本世不重复 · 堵无限刷）', (t) => {
    const s = freshState(0);
    const ids = [];
    for (let i = 0; i < 80; i++) {
      s.xianyuanYearCount = 0;           // 绕过每年上限，多采样
      const ev = E.rollXianyuan(s);
      if (ev) ids.push(ev.id);
    }
    const seen = new Set();
    const dup = [];
    ids.forEach(function (id) {
      const ev = XIANYUAN.find(function (e) { return e.id === id; });
      if (ev && ev.repeat) return;       // 显式标 repeat 的日常事件豁免
      if (seen.has(id)) dup.push(id);
      seen.add(id);
    });
    t.eq(dup.length, 0, '同一事件不应被重复触发（实测重复 ' + dup.slice(0, 5).join(',') + '）');
    t.gt(ids.length, 0, '应能抽到事件');
    ids.forEach(function (id) { t.ok(s.seen[id] === 1, '触发事件应写入 seen: ' + id); });
  });

  S.case('仙缘池：未标 once 的事件也默认一次性（repeat:true 才可重复）', (t) => {
    const noOnce = XIANYUAN.filter(function (e) { return !e.once && !e.repeat; });
    t.gt(noOnce.length, 0, '应存在「未标 once」的事件用于回归');
    const s = freshState(14);
    noOnce.forEach(function (e) { s.seen[e.id] = 1; });
    const leaked = noOnce.filter(function (e) { return E.evEligible(s, e); });
    t.eq(leaked.length, 0, '未标 once 的事件触发过后仍被判为可见（可无限刷）：' + leaked.slice(0, 5).map(function (e) { return e.id; }).join(','));
    // 显式 repeat 的事件不受影响（取一个适用于 idx=14 且无 req 的事件做样本）
    const sample = XIANYUAN.find(function (e) {
      return (e.min || 0) <= 14 && (e.max == null || e.max >= 14) && !e.req;
    });
    t.ok(!!sample, '应存在适用于 idx=14 的样本事件');
    const bak = { once: sample.once, repeat: sample.repeat };
    sample.repeat = true; delete sample.once;
    const s2 = freshState(14); s2.seen[sample.id] = 1;
    t.ok(E.evEligible(s2, sample), 'repeat:true 的事件即使已触发也应保持可见（' + sample.id + '）');
    if (bak.once !== undefined) sample.once = bak.once; else delete sample.once;
    if (bak.repeat === undefined) delete sample.repeat; else sample.repeat = bak.repeat;
  });

  /* 守卫：机缘耗尽 / 无可触发事件时**不得白扣行动点**。
     用户 2026-09-13 反馈「山河探索实际效果空」——炼气期（idx=0）时 shanhe 池
     所有事件 min>=1，池子为空却被扣了 1 点行动，玩家端只有一句"无所遇"。 */
  S.case('无可用机缘时不消耗行动点（仙缘 / 游历 / 山河）', (t) => {
    // 制造「无可用机缘」用 min 屏蔽（2026-09-13：改 repeat 后 seen 已盖不住日常小事，
    //   seen 只能排除一次性事件，repeat 事件永远可见 → 必须用境界区间把它们挡在外面）
    const s = freshState(14);
    const bakMin = XIANYUAN.map(function (e) { return e.min; });
    XIANYUAN.forEach(function (e) { e.min = 999; });
    // ① 仙缘
    const before = s.actionsLeft;
    const r = E.drawXianyuan(s);
    t.ok(typeof r === 'string', '池空时应返回提示字符串，实际：' + (typeof r));
    t.eq(s.actionsLeft, before, '仙缘池空时不应扣行动点');
    // ② 游历同理
    const b2 = s.actionsLeft;
    const r2 = E.travel(s);
    t.ok(typeof r2 === 'string', '游历池空时应返回提示字符串');
    t.eq(s.actionsLeft, b2, '游历池空时不应扣行动点');
    XIANYUAN.forEach(function (e, i) { e.min = bakMin[i]; });
    // ③ 山河：炼气期（idx=0）无可触发事件 → 不扣点
    const s0 = freshState(0);
    const b3 = s0.actionsLeft;
    const r3 = E.shanheExplore(s0);
    t.ok(typeof r3 === 'string', '炼气期山河无可探时应返回提示字符串，实际：' + JSON.stringify(r3 && r3.events ? r3.events.length : r3));
    t.eq(s0.actionsLeft, b3, '山河探索无可触发事件时不应扣行动点');
    // ④ 但行动点不足时仍应被 canAction 挡下
    const s4 = freshState(14);
    s4.actionsLeft = 0;
    t.eq(E.drawXianyuan(s4), '行动点不足，无法叩问仙缘。', '行动点不足时仍应拦截');
  });

  S.case('rollXianyuan 遵守 min/max 门槛', (t) => {
    const s = freshState(0);
    for (let i = 0; i < 50; i++) {
      s.xianyuanYearCount = 0; s.seen = {};
      const ev = E.rollXianyuan(s);
      if (ev) t.ok(ev.min <= s.idx, '触发事件应满足 min<=idx（' + ev.id + ' min=' + ev.min + '）');
    }
  });

  S.case('evEligible 正确校验 min/max/once/req', (t) => {
    t.ok(typeof E.evEligible === 'function', 'evEligible 应导出');
    const hi = XIANYUAN.find(function (e) { return (e.min || 0) >= 6; });
    if (hi) {
      const s0 = freshState(0);
      t.ok(!E.evEligible(s0, hi), '低境界不应满足高门槛事件 ' + hi.id);
      const s1 = freshState(8);
      t.ok(E.evEligible(s1, hi), '高境界应满足高门槛事件 ' + hi.id);
    }
    const anyEv = XIANYUAN.find(function (e) { return !e.repeat; });
    if (anyEv) {
      const s = freshState(0);
      s.seen[anyEv.id] = 1;
      t.ok(!E.evEligible(s, anyEv), '已 seen 的事件应判为不可见（本世不重复）');
    }
  });

  S.case('权重真正生效（高 weight 出现显著更多）', (t) => {
    // 独立上下文，构造仅含两事件的受控池，避免 once/池耗尽干扰
    const G2 = createGameContext({ seed: 777 });
    const E2 = G2.get('Engine');
    const XY = G2.get('XIANYUAN') || [];
    const A = XY.reduce(function (m, e) { return (e.weight > (m ? m.weight : 0)) ? e : m; }, null);
    const B = XY.filter(function (e) { return e !== A; }).reduce(function (m, e) { return (e.weight > 0 && (!m || e.weight < m.weight)) ? e : m; }, null);
    t.ok(!!A && !!B && A !== B, '应能取到两个不同权重的事件');
    // 构造受控池：仅 A、B 可见且始终可抽（屏蔽 min/max/once/req 干扰，专测权重）
    A.min = A.max = 0; A.req = null; A.once = false; A.repeat = true;   // repeat 才能反复命中，专测权重
    B.min = B.max = 0; B.req = null; B.once = false; B.repeat = true;
    const s = E2.startLife('权重测试');
    E2.commitStart(s, (G2.get('TALENTS') || [])[0].id);
    s.idx = 0; s.seen = {};
    XY.forEach(function (e) { if (e !== A && e !== B) s.seen[e.id] = 1; });
    let a = 0, b = 0;
    for (let i = 0; i < 400; i++) {
      s.xianyuanYearCount = 0;           // 绕过每年上限，纯测权重
      const ev = E2.rollXianyuan(s);
      if (ev === A) a++; else if (ev === B) b++;
    }
    t.note('权重 A(' + A.weight + ') 命中 ' + a + '，权重 B(' + B.weight + ') 命中 ' + b);
    t.ok(a > b, '高权重事件应出现显著更多（A=' + a + ' > B=' + b + '）');
    if (a + b > 0) t.ok(a / (a + b) > 0.7, '高权重占比应明显偏高');
  });

  /* 守卫：日常小事（repeat:true）白名单 —— 2026-09-13 用户定稿
     铁律：只有「纯资源小收益」的事件才允许 repeat。一旦 repeat 事件带
     法宝 / 功法 / 装备 / 属性点 / 寿元 / 渡劫加成，就等于无限刷数值（同类事故见上一条用例）。 */
  S.case('日常小事（repeat）仅限白名单，且收益不得含成长类资源', (t) => {
    const ALLOW = ['lingquan', 'tianjiang_yuntie', 'xianhe_songyao', 'qiaoyu_sansan', 'women_zhi', 'yeling_caiyao'];
    const rep = XIANYUAN.filter(function (e) { return e.repeat; });
    const ids = rep.map(function (e) { return e.id; }).sort();
    t.eq(ids.join(','), ALLOW.slice().sort().join(','), 'repeat 事件应恰为白名单 6 件，实际：' + ids.join(','));

    const BAD = ['art', 'tech', 'equip', 'life', 'trib', 'hpMax', 'qi', 'wu', 'ti', 'dun', 'shen', 'dao', 'ling', 'elixirs', 'flags', 'sect'];
    rep.forEach(function (e) {
      const eff = e.effect || {};
      const bad = Object.keys(eff).filter(function (k) { return BAD.indexOf(k) >= 0; });
      t.eq(bad.length, 0, '日常小事「' + e.title + '」收益含成长类字段：' + bad.join(','));
    });

    // repeat 生效：触发过后仍可见
    const s = freshState(14);
    rep.forEach(function (e) { s.seen[e.id] = 1; });
    const still = rep.filter(function (e) { return E.evEligible(s, e); });
    t.eq(still.length, rep.length, 'repeat 事件触发过后应保持可见（repeat 未生效）');

    // 长期跑：一次性事件被 seen 掏空后，后期池子只剩日常小事，应能反复命中
    const counter = {};
    for (let y = 0; y < 60; y++) {
      s.actionsLeft = 99999;
      for (let i = 0; i < 3; i++) {
        const r = E.drawXianyuan(s);
        if (typeof r === 'string') break;
        counter[r.id] = (counter[r.id] || 0) + 1;
      }
      s.xianyuanYearCount = 0;
    }
    const hits = rep.filter(function (e) { return (counter[e.id] || 0) > 0; }).length;
    t.gt(hits, 0, '日常小事应能在多年间反复命中');
    t.note('60 年叩问命中：' + rep.map(function (e) { return e.title + '×' + (counter[e.id] || 0); }).join('，'));
  });

  return S;
};
