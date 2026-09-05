/* DEDAO 自动化测试 —— 02 引擎单元测试 & 长时模拟
 */
const fs = require('fs');
const path = require('path');
const { ROOT, Suite, createGameContext, makeRandom } = require('./_harness');

/* 不变量检查：任何时刻都必须成立 */
function checkInvariants(t, s, where) {
  if (!s || typeof s !== 'object') { t.fail(`${where}: 状态对象无效`); return; }
  t.noNaN(s, `${where} 状态`);
  t.inRange(s.idx, 0, 15, `${where}: 境界序号 idx`); // 15 = 飞升态（超出 STAGES 12 阶）
  t.gte(s.hp, 0, `${where}: 气血不能为负`);
  t.lte(s.hp, s.hpMax + 0.001, `${where}: 气血超过上限`);
  t.gte(s.qi, 0, `${where}: 修为不能为负`);
  t.gte(s.actionsLeft, 0, `${where}: 行动点不能为负`);
  t.gte(s.stone, 0, `${where}: 灵石不能为负`);
  t.gte(s.age, 0, `${where}: 年龄不能为负`);
  t.gte(s.year, 1, `${where}: 年数从 1 开始`);
  try { JSON.stringify(s); }
  catch (e) { t.fail(`${where}: 状态无法 JSON 序列化（含循环引用/函数）`); }
}

module.exports = async function build() {
  const S = new Suite('02 引擎单元测试 & 长时模拟');
  const G = createGameContext({ seed: 20260905 });
  const E = G.get('Engine');
  const STAGES = G.get('STAGES') || [];
  const TALENTS = G.get('TALENTS') || [];

  /* ---------- 基础生命周期 ---------- */
  S.case('Engine 与核心接口可用', (t) => {
    t.ok(!!E, 'Engine 未导出');
    const need = ['startLife', 'commitStart', 'cultivate', 'breakthrough', 'endYear',
      'combatStart', 'combatAuto', 'saveState', 'loadState', 'applyOps', 'endLife',
      'actionPoints', 'requireNeed', 'equipStats', 'useElixir'];
    const miss = need.filter(k => typeof E[k] !== 'function');
    if (miss.length) t.fail(`缺少接口: ${miss.join(', ')}`);
    t.note(`Engine 暴露 ${Object.keys(E || {}).length} 个成员`);
  });

  S.case('startLife 产出合法初始状态', (t) => {
    const s = E.startLife('测试道人');
    t.eq(s.name, '测试道人', '名字未保存');
    t.eq(s.age, 16, '初始年龄应为 16');
    t.eq(s.year, 1, '初始年份应为 1');
    t.eq(s.idx, 0, '初始境界序号应为 0');
    t.eq(s.qi, 0, '初始修为应为 0');
    t.gt(s.hpMax, 0, '气血上限应为正');
    t.gt(s.lifeMax, 0, '寿元上限应为正');
    t.ok(!s.dead, '初始不应为死亡态');
    checkInvariants(t, s, 'startLife');
  });

  S.case('commitStart 完成开局且属性自洽', (t) => {
    const s = E.startLife('甲');
    const r = E.commitStart(s, TALENTS[0].id);
    t.ok(!!r, 'commitStart 返回空');
    t.eq(r.hp, r.hpMax, '开局气血应满');
    t.gt(r.actionsLeft, 0, '开局应有行动点');
    t.ok(!!r.linggen, '未分配灵根');
    t.ok(Array.isArray(r.talents) && r.talents.length >= 1, '未分配天赋');
    checkInvariants(t, r, 'commitStart');
  });

  S.case('actionPoints 随境界递增（3→6）', (t) => {
    const s = E.startLife('乙');
    const pts = [0, 3, 6, 9].map(i => { s.idx = i; return E.actionPoints(s); });
    t.eq(pts[0], 3, '炼气期应为 3 点');
    t.ok(pts[1] > pts[0], '筑基期应多于炼气期');
    t.ok(pts[2] > pts[1], '金丹期应多于筑基期');
    t.ok(pts[3] > pts[2], '元婴期应多于金丹期');
    t.note(`idx 0/3/6/9 → ${pts.join(' / ')} 点`);
  });

  /* ---------- 修炼 / 突破 ---------- */
  S.case('cultivate 增加修为并消耗行动点', (t) => {
    const s = E.startLife('丙'); E.commitStart(s, TALENTS[0].id);
    s.cultedThisYear = false;
    const before = { qi: s.qi, ap: s.actionsLeft };
    const msg = E.cultivate(s);
    t.ok(typeof msg === 'string' && msg.length > 0, 'cultivate 应返回提示文案');
    t.gt(s.qi, before.qi, '修为未增加');
    t.lt(s.actionsLeft, before.ap, '行动点未消耗');
    t.ok(s.cultedThisYear === true, '未标记本年已修炼');
    const msg2 = E.cultivate(s);
    t.ok(/已修炼/.test(msg2), '同一年二次修炼应被拒绝');
    checkInvariants(t, s, 'cultivate');
  });

  S.case('修为未满时不可突破', (t) => {
    const s = E.startLife('丁'); E.commitStart(s, TALENTS[0].id);
    s.qi = 0;
    const can = E.canBreak(s);
    t.ok(!can, '修为 0 时不应允许突破');
    const info = E.breakInfo(s);
    t.ok(!!info, 'breakInfo 应返回对象');
    t.note(`breakInfo: ${JSON.stringify(info && { need: info.need, rate: info.rate, ok: info.ok })}`);
  });

  S.case('修为拉满后可突破且境界提升', (t) => {
    const s = E.startLife('戊'); E.commitStart(s, TALENTS[0].id);
    let guard = 0, advanced = false;
    while (guard++ < 400) {
      s.qi = E.requireNeed(s);
      s.broken = 0;
      const before = s.idx;
      // breakthrough 只返回突破方式选项，真正推进境界需调用 normalBreakthrough
      const choice = E.breakthrough(s);
      t.ok(choice && choice.needChoice === true, 'breakthrough 应返回突破方式选择');
      E.normalBreakthrough(s);
      if (s.idx > before) { advanced = true; break; }
      if (s.dead || s.endReason) break;
    }
    t.ok(advanced, `反复尝试突破 400 次仍未提升境界（最终 idx=${s.idx}）`);
    t.note(`成功推进至 idx=${s.idx}（${(STAGES[s.idx] || {}).realm || '飞升'}），尝试 ${guard} 次`);
    checkInvariants(t, s, 'breakthrough');
  });

  /* ---------- 战斗 ---------- */
  S.case('战斗可正常终止且数值不越界', (t) => {
    const s = E.startLife('己'); E.commitStart(s, TALENTS[0].id);
    let rounds = 0;
    let rr = null;
    try {
      E.combatStart(s, { name: '测试妖兽', atk: Math.max(1, Math.round(s.atk * 0.5)), hp: Math.round(s.hpMax * 2), loot: {} });
      // 逐回合推进，便于每回合校验数值不变量
      while (rounds++ < 300) {
        if (!s.battle) break;
        t.gte(s.battle.hp, 0, `第 ${rounds} 回合敌方气血为负`);
        t.gte(s.hp, 0, `第 ${rounds} 回合我方气血为负`);
        const act = rounds % 3 === 0 ? 'atk' : (rounds % 3 === 1 ? 'guard' : 'spell');
        rr = E.combatAct(s, act);
        if (rr && rr.done) break;
      }
      t.ok(rr && rr.done, '战斗未正常结束');
      if (rounds >= 300) t.fail('战斗 300 回合未结束，疑似死循环');
      t.note(`战斗 ${rounds} 回合结束，win=${rr && rr.win} lost=${rr && rr.lost}`);
    } catch (e) {
      t.fail('战斗过程抛出异常: ' + e.message);
    }
    checkInvariants(t, s, 'combat');
  });

  /* ---------- 装备 ---------- */
  S.case('装备获取 / 穿戴 / 属性计算', (t) => {
    const s = E.startLife('庚'); E.commitStart(s, TALENTS[0].id);
    const ART = G.get('ARTIFACTS') || {};
    const ids = Object.keys(ART);
    if (!ids.length) { t.note('无装备数据，跳过'); return; }
    let gained = null;
    for (const id of ids) {
      const before = (s.inventory || []).length;
      E.gainEquip(s, id);
      if ((s.inventory || []).length > before) { gained = id; break; }
    }
    if (!gained) { t.note('未能获得任何装备（可能有境界限制），跳过穿戴测试'); return; }
    const atkBefore = s.atk;
    E.wearEquip(s, gained);
    E.refreshStats(s);
    t.ok(!!s.equip, 'equip 结构缺失');
    const st = E.equipStats(s);
    t.ok(st && typeof st === 'object', 'equipStats 未返回对象');
    t.noNaN(st, 'equipStats');
    t.note(`装备 ${ART[gained].name}，攻击 ${atkBefore} → ${s.atk}`);
    checkInvariants(t, s, 'equip');
  });

  /* ---------- 存档 ---------- */
  S.case('存档写入 / 读取往返一致', (t) => {
    const s = E.startLife('辛'); E.commitStart(s, TALENTS[0].id);
    s.stone = 12345; s.qi = 777;
    E.saveState(s);
    const back = E.loadState();
    t.ok(!!back, '读档返回空');
    t.eq(back.stone, 12345, '灵石未正确保存');
    t.eq(back.qi, 777, '修为未正确保存');
    t.eq(back.name, '辛', '名字未正确保存');
    t.ok(E.slotExists != null, 'slotExists 未导出');
  });

  S.case('空存档读取返回 null 而不崩溃', (t) => {
    const g2 = createGameContext({ seed: 7 });
    const E2 = g2.get('Engine');
    let r;
    try { r = E2.loadState(); } catch (e) { t.fail('空存档读取抛异常: ' + e.message); }
    t.ok(r === null || r === undefined, `空存档应返回 null，实际 ${JSON.stringify(r)}`);
  });

  /* ---------- 丹药 ---------- */
  S.case('丹药使用扣除数量且生效', (t) => {
    const s = E.startLife('壬'); E.commitStart(s, TALENTS[0].id);
    const ELX = G.get('ELIXIRS') || {};
    const id = Object.keys(ELX)[0];
    if (!id) { t.note('无丹药数据，跳过'); return; }
    s.elixirs[id] = 1;
    const lifeBefore = s.lifeMax;
    const ok = E.useElixir(s, id);
    t.ok(ok !== false, 'useElixir 执行失败');
    t.eq(s.elixirs[id] || 0, 0, '丹药数量未扣除');
    t.noNaN(s, 'useElixir 后状态');
    t.note(`服用 ${ELX[id].name}，寿元 ${lifeBefore} → ${s.lifeMax}`);
  });

  /* ---------- 年份推进 ---------- */
  S.case('endYear 推进年份与年龄', (t) => {
    const s = E.startLife('癸'); E.commitStart(s, TALENTS[0].id);
    const y = s.year, a = s.age;
    try { E.endYear(s); } catch (e) { t.fail('endYear 抛异常: ' + e.message); return; }
    t.eq(s.year, y + 1, '年份未推进');
    t.eq(s.age, a + 1, '年龄未增长');
    t.eq(s.cultedThisYear, false, '新的一年应重置修炼标记');
    checkInvariants(t, s, 'endYear');
  });

  /* ---------- 长时模拟 ---------- */
  S.case('100 局全流程随机模拟：无崩溃、无 NaN、不变量恒成立', (t) => {
    const rnd = makeRandom(987654321);
    const LIVES = 100;
    let totalYears = 0, deaths = 0, errors = [], violMsgs = [];
    const realmTop = new Array(16).fill(0);
    let maxAge = 0;

    for (let L = 0; L < LIVES; L++) {
      const g2 = createGameContext({ seed: 1000 + L });
      const E2 = g2.get('Engine');
      const TAL = G.get('TALENTS') || [];
      let s;
      try {
        s = E2.startLife('模拟' + L);
        E2.commitStart(s, (TAL[Math.floor(rnd() * TAL.length)] || {}).id);
      } catch (e) { errors.push(`第${L}局开局: ${e.message}`); continue; }

      for (let yr = 0; yr < 200; yr++) {
        if (s.dead) break;
        let guard = 0;
        while (s.actionsLeft > 0 && !s.dead && guard++ < 30) {
          const r = rnd();
          try {
            let res;
            if (r < 0.45) res = E2.cultivate(s);
            else if (r < 0.62) res = E2.explore(s);
            else if (r < 0.78) res = E2.social(s);
            else if (r < 0.9) res = E2.jiyuan(s);
            else {
              const need = E2.requireNeed(s);
              if (s.qi >= need) { E2.breakthrough(s); res = E2.normalBreakthrough(s); }
              else res = E2.cultivate(s);
            }
            if (res && typeof res === 'object') {
              if (res.ops) E2.applyOps(s, res.ops);
            }
            // 触发战斗则自动打完（combatAuto 内部跑完整场）
            if (s.battle) { const br = E2.combatAuto(s); if (br && br.done) s.battle = null; }
          } catch (e) {
            errors.push(`第${L}局 y${s.year} action: ${e.message}`);
            s.actionsLeft = 0;
          }
          // 每步校验不变量
          const before = violMsgs.length;
          checkInvariants({ 
            ok: (c, m) => { if (!c) violMsgs.push(`第${L}局 y${s.year}: ${m}`); },
            eq: (a, b, m) => { if (a !== b) violMsgs.push(`第${L}局 y${s.year}: ${m}`); },
            notEq: () => {}, gt: (a, b, m) => { if (!(a > b)) violMsgs.push(`第${L}局 y${s.year}: ${m}`); },
            gte: (a, b, m) => { if (!(a >= b)) violMsgs.push(`第${L}局 y${s.year}: ${m}`); },
            lt: (a, b, m) => { if (!(a < b)) violMsgs.push(`第${L}局 y${s.year}: ${m}`); },
            lte: (a, b, m) => { if (!(a <= b)) violMsgs.push(`第${L}局 y${s.year}: ${m}`); },
            inRange: (v, lo, hi, m) => { if (!(v >= lo && v <= hi)) violMsgs.push(`第${L}局 y${s.year}: ${m}`); },
            noNaN: (o, l) => { const arr = []; scanNaNLocal(o, l, arr); arr.forEach(x => violMsgs.push(`第${L}局 y${s.year}: ${x}`)); },
            throws: () => {}, note: () => {}, fail: (m) => violMsgs.push(`第${L}局 y${s.year}: ${m}`),
          }, s, 'sim');
          if (violMsgs.length - before > 0) break;
        }
        try { E2.endYear(s); } catch (e) { errors.push(`第${L}局 endYear: ${e.message}`); break; }
        totalYears++;
        if (s.age > maxAge) maxAge = s.age;
        if (s.dead) { deaths++; realmTop[Math.min(s.idx, 15)]++; break; }
        if (yr === 199) realmTop[Math.min(s.idx, 15)]++;
      }
    }

    t.note(`共模拟 ${LIVES} 局 / ${totalYears} 年，死亡 ${deaths} 局，最高年龄 ${maxAge}`);
    if (errors.length) t.fail(`运行期异常 ${errors.length} 类，例如: ${[...new Set(errors)].slice(0, 5).join(' ;; ')}`);
    if (violMsgs.length) t.fail(`不变量违规 ${violMsgs.length} 处，例如: ${[...new Set(violMsgs)].slice(0, 5).join(' ;; ')}`);
    t.note(`终局境界分布 idx0..11: ${realmTop.join(',')}`);
  });

  /* ---------- 数值平衡抽样 ---------- */
  S.case('数值平衡抽样：境界推进与寿命分布合理', (t) => {
    const rnd = makeRandom(24680);
    const N = 60;
    const ages = [], idxs = [];
    for (let L = 0; L < N; L++) {
      const g2 = createGameContext({ seed: 5000 + L });
      const E2 = g2.get('Engine');
      const TAL = G.get('TALENTS') || [];
      const s = E2.startLife('平衡' + L);
      E2.commitStart(s, (TAL[Math.floor(rnd() * TAL.length)] || {}).id);
      for (let yr = 0; yr < 150 && !s.dead; yr++) {
        let guard = 0;
        while (s.actionsLeft > 0 && !s.dead && guard++ < 20) {
          try {
            const r = rnd();
            if (r < 0.6) E2.cultivate(s);
            else if (r < 0.75) E2.explore(s);
            else if (r < 0.9) E2.social(s);
            else { const need = E2.requireNeed(s); if (s.qi >= need) { E2.breakthrough(s); E2.normalBreakthrough(s); } else E2.cultivate(s); }
            if (s.battle) { const br = E2.combatAuto(s); if (br && br.done) s.battle = null; }
          } catch (e) { s.actionsLeft = 0; }
        }
        try { E2.endYear(s); } catch (e) { break; }
      }
      ages.push(s.age); idxs.push(s.idx);
    }
    const avg = a => (a.reduce((x, y) => x + y, 0) / a.length);
    const avgAge = avg(ages), avgIdx = avg(idxs);
    const maxIdx = Math.max(...idxs), minIdx = Math.min(...idxs);
    t.note(`${N} 局：平均寿命 ${avgAge.toFixed(1)} 岁，平均境界序号 ${avgIdx.toFixed(2)}，最高 ${maxIdx}，最低 ${minIdx}`);
    t.gt(avgAge, 16, '平均寿命过低（角色开局即死？）');
    t.lt(avgAge, 200, '平均寿命异常高（可能存在无法死亡的问题）');
    t.gt(maxIdx, 0, '所有角色都停留在初始境界，突破链路可能失效');
  });

  return S;
};

function scanNaNLocal(obj, label, msgs, depth = 0) {
  if (depth > 6) return;
  if (typeof obj === 'number') { if (!Number.isFinite(obj)) msgs.push(`${label} 非法数值 ${obj}`); return; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => scanNaNLocal(v, `${label}[${i}]`, msgs, depth + 1)); return; }
  if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) scanNaNLocal(obj[k], `${label}.${k}`, msgs, depth + 1);
}
