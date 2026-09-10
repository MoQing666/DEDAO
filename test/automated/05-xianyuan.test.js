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

  S.case('rollXianyuan 触发后写入 seen（once 不重复）', (t) => {
    const s = freshState(0);
    const ids = [];
    for (let i = 0; i < 40; i++) {
      s.xianyuanYearCount = 0;           // 绕过每年上限，多采样
      const ev = E.rollXianyuan(s);
      if (ev) ids.push(ev.id);
    }
    // 仅对 once 事件校验不重复（非 once 事件允许重复出现）
    const onceSeen = new Set();
    let dup = 0;
    ids.forEach(function (id) {
      const ev = XIANYUAN.find(function (e) { return e.id === id; });
      if (ev && ev.once) { if (onceSeen.has(id)) dup++; onceSeen.add(id); }
    });
    t.ok(dup === 0, '已触发的 once 事件不应重复出现（实测重复 ' + dup + '）');
    ids.forEach(function (id) { t.ok(s.seen[id] === 1, '触发事件应写入 seen: ' + id); });
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
    const anyOnce = XIANYUAN.find(function (e) { return e.once; });
    if (anyOnce) {
      const s = freshState(0);
      s.seen[anyOnce.id] = 1;
      t.ok(!E.evEligible(s, anyOnce), '已 seen 的 once 事件应判为不可见');
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
    A.min = A.max = 0; A.req = null; A.once = false;
    B.min = B.max = 0; B.req = null; B.once = false;
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

  return S;
};
