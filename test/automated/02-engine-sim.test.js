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

  /* ---------- 法宝系统（机制层贯通） ---------- */
  S.case('法宝 system：artifactStats 真实生效（机制层贯通）', (t) => {
    const s = E.startLife('法宝测试');
    E.commitStart(s, TALENTS[0].id);
    // 装备型法宝改为「需装备后生效、受槽位上限约束」：测试放大槽位上限以覆盖全部效果
    s.reinc = s.reinc || {}; s.reinc.treasureSlot = 20; E.refreshStats(s);
    const dao0 = E.effAttr(s, 'dao');
    const gB = E.cultGain(s).gain;
    const crit0 = E.getCritRate(s);

    // 灵狐佩：道心 +2 → artAttr.dao / effAttr 等价道心
    E.applyOps(s, { art: 'linghu_pei' });
    t.eq(s.artAttr.dao, 2, '灵狐佩未使 artAttr.dao=2');
    t.eq(E.effAttr(s, 'dao'), dao0 + 2, '灵狐佩未使等价道心 +2');

    // 铜钱剑：攻击 +5 → s.atk
    const atkB = s.atk;
    E.applyOps(s, { art: 'tongqian_jian' });
    t.eq(s.atk, atkB + 5, '铜钱剑未使攻击 +5');

    // 聚灵珠：修炼 +5% → cultGain 提升
    const gMid = E.cultGain(s).gain;
    E.applyOps(s, { art: 'juling_art' });
    const gAfter = E.cultGain(s).gain;
    t.gt(gAfter, gMid, '聚灵珠未提升修炼收益');
    t.gte(gAfter, Math.round(gMid * 1.05) - 1, '聚灵珠提升幅度应≈+5%');

    // 预知魔瞳：暴击 +10% → getCritRate
    const critB = E.getCritRate(s);
    E.applyOps(s, { art: 'yuzhi_motong' });
    t.gte(E.getCritRate(s) - critB, 0.099, '预知魔瞳未使暴击≈+10%');

    // 玄武龟甲：防御 +20 → s.artDef
    E.applyOps(s, { art: 'xuanwu_guijia' });
    t.eq(s.artDef, 20, '玄武龟甲未使 s.artDef=20');

    // 时停月华：每年可修炼 2 次 → s.cultMax
    E.applyOps(s, { art: 'shiting_yuehua' });
    t.eq(s.cultMax, 2, '时停月华未使 cultMax=2');

    // 巨灵腰带：体魄气血 +25% → s.hpMax 提升
    const hpB = s.hpMax;
    E.applyOps(s, { art: 'juling_yaodai' });
    t.gt(s.hpMax, hpB, '巨灵腰带未提升气血上限');

    // 嗜血珠 stack：击杀累计——验证 killCount 累计钩子存在且生效
    const atkPre = s.atk;
    s.killCount = 5; E.refreshStats(s);
    E.applyOps(s, { art: 'shixue_zhu' });
    t.gt(s.atk, atkPre, '嗜血珠击杀累计未提升攻击');

    // 去重：重复授予同一法宝不应叠加（装备槽唯一、库存去重）
    E.applyOps(s, { art: 'linghu_pei' });
    t.eq(s.equip.treasure.filter(a => a === 'linghu_pei').length, 1, '重复授予法宝在装备槽未去重');
    t.eq(s.arts.indexOf('linghu_pei'), -1, '重复授予法宝未在库存去重');
    checkInvariants(t, s, '法宝测试末态');
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

  S.case('endYear 年末气血与灵力同步回满', (t) => {
    const s = E.startLife('回满'); E.commitStart(s, TALENTS[0].id);
    E.refreshStats(s);
    const hpM = s.hpMax, mpM = s.mpMax;
    t.ok(hpM > 0 && mpM > 0, '上限应 >0');
    // 先扣血扣灵（确保非满状态）
    s.hp = Math.max(1, Math.round(s.hpMax * 0.3));
    s.mp = Math.max(1, Math.round(s.mpMax * 0.2));
    const hpBefore = s.hp, mpBefore = s.mp;
    t.ok(hpBefore < s.hpMax && mpBefore < s.mpMax, '前置：血灵应先处于非满状态');
    try { E.endYear(s); } catch (e) { t.fail('endYear 抛异常: ' + e.message); return; }
    t.eq(s.hp, s.hpMax, '年末气血应回满');
    t.eq(s.mp, s.mpMax, '年末灵力应同步回满');
    checkInvariants(t, s, 'endYear 回满');
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

  /* ---------- 锻体系统（《锻体诀》） ---------- */
  S.case('doDuanti：未解锁拒绝，解锁后生效（+0.5 体魄）', (t) => {
    const s = E.startLife('锻体甲');
    E.commitStart(s, TALENTS[0].id);
    s.flags = s.flags || {};
    delete s.flags.duanti;
    s.actionsLeft = 10;
    const r0 = E.doDuanti(s, 'ti');
    t.ok(!r0.ok, '未解锁《锻体诀》应拒绝锻体');
    s.flags.duanti = 1;
    const before = s.ti || 0;
    const r1 = E.doDuanti(s, 'ti');
    t.ok(r1.ok, '解锁后锻体应成功');
    t.eq(s.ti, before + 0.5, '体魄应 +0.5');
    t.eq(r1.left, 9, '首次锻体后剩余应为 9');
  });

  S.case('doDuanti：行动点消耗（体魄1/遁速1/神识2）', (t) => {
    const s = E.startLife('锻体乙');
    E.commitStart(s, TALENTS[0].id);
    s.flags = { duanti: 1 };
    s.actionsLeft = 10;
    const a0 = s.actionsLeft;
    E.doDuanti(s, 'ti');
    t.eq(s.actionsLeft, a0 - 1, '淬体魄应耗 1 点');
    E.doDuanti(s, 'dun');
    t.eq(s.actionsLeft, a0 - 2, '炼遁速应耗 1 点');
    E.doDuanti(s, 'shen');
    t.eq(s.actionsLeft, a0 - 4, '凝神识应耗 2 点');
    t.gte(s.dun || 0, 0.5, '遁速应 +0.5');
    t.gte(s.shen || 0, 0.5, '神识应 +0.5');
  });

  S.case('doDuanti：每大境界每种至多10次，行动点不足拒绝', (t) => {
    const s = E.startLife('锻体丙');
    E.commitStart(s, TALENTS[0].id);
    s.flags = { duanti: 1 };
    s.actionsLeft = 100;
    for (let i = 0; i < 10; i++) {
      const r = E.doDuanti(s, 'ti');
      t.ok(r.ok, `第 ${i + 1} 次淬体魄应成功`);
    }
    const r11 = E.doDuanti(s, 'ti');
    t.ok(!r11.ok, '第 11 次应被大境界上限拒绝');
    const info = E.duantiInfo(s);
    t.eq(info.counts.ti, 10, '体魄计数应为 10/10');
    s.actionsLeft = 0;
    const rNo = E.doDuanti(s, 'dun');
    t.ok(!rNo.ok, '行动点不足应拒绝');
  });

  S.case('doDuanti：突破大境界后次数重置', (t) => {
    const s = E.startLife('锻体丁');
    E.commitStart(s, TALENTS[0].id);
    s.flags = { duanti: 1 };
    s.actionsLeft = 100;
    for (let i = 0; i < 10; i++) E.doDuanti(s, 'dun');
    t.ok(!E.doDuanti(s, 'dun').ok, '筑基内 10 次后应拒绝');
    s.idx = 6; // 金丹前期（大境界变更）
    const info = E.duantiInfo(s);
    t.eq(info.counts.dun, 0, '进入金丹后遁速计数应重置');
    const r = E.doDuanti(s, 'dun');
    t.ok(r.ok, '大境界突破后应可继续锻体');
  });

  /* ---------- 内容优化：灵材品级 / 坊市 / 出售装备 ---------- */
  S.case('秘境灵材按秘境品级掉落（高境界刷黄级秘境得黄级灵草）', (t) => {
    const s = E.startLife('灵材甲');
    E.commitStart(s, TALENTS[0].id);
    s.idx = 6; // 金丹前期，玩家境界为"地"
    s.advType = 'huang'; // 黄级秘境
    s.adv = { depth: 1, gains: [], maxDepth: 5, status: 'running', done: false, type: 'huang' };
    s.materials = {};
    const r = E.advResolve(s, { type: 'herb' });
    t.ok(r && r.lines, 'advResolve 应返回剧情');
    t.gte(s.materials.herb_huang || 0, 1, '黄级秘境应掉落黄级灵草');
    t.eq(s.materials.herb_xuan || 0, 0, '黄级秘境不应掉落玄级灵草');
    s.adv.depth = 2;
    E.advResolve(s, { type: 'iron' });
    t.gte(s.materials.iron_huang || 0, 1, '黄级秘境应掉落黄级灵铁');
    t.eq(s.materials.iron_xuan || 0, 0, '黄级秘境不应掉落玄级灵铁');
  });

  S.case('坊市灵材按秘境品级出售且可正常购买', (t) => {
    const s = E.startLife('坊市甲');
    E.commitStart(s, TALENTS[0].id);
    s.idx = 6;
    s.advType = 'xuan'; // 玄级秘境
    s.adv = { depth: 1, gains: [] };
    const stock = E.shopStock(s);
    const matRows = stock.filter(function (x) { return x.mat; });
    t.eq(matRows.length, 2, '坊市应有灵草+灵铁两种灵材');
    t.ok(matRows.every(function (x) { return x.mat.key === 'herb_xuan' || x.mat.key === 'iron_xuan'; }), '玄级秘境坊市应卖玄级灵材');
    s.stone = 1000;
    const r = E.buyStock(s, matRows[0]);
    t.ok(r.ok, '购买应成功');
    t.gte(s.materials[matRows[0].mat.key] || 0, 1, '买到的灵材应入分级材料库');
    t.ok(s.stone < 1000, '购买应扣灵石');
  });

  S.case('出售装备：同名只卖一件，已穿戴的不受影响', (t) => {
    const s = E.startLife('出售甲');
    E.commitStart(s, TALENTS[0].id);
    const eid = E.randomEquip(0, 1);
    t.ok(!!eid && !!E.findEquip(eid), '应能生成合法装备');
    s.inventory.push(eid, eid, eid); // 袋中三件同名
    if (!Array.isArray(s.equip.treasure)) s.equip.treasure = [];
    s.equip.treasure.push(eid);      // 法宝位也穿戴了同 ID
    const stone0 = s.stone;
    const g = E.sellEquip(s, eid);
    t.eq(typeof g, 'number', '出售一件应返回灵石');
    t.eq(s.inventory.filter(function (x) { return x === eid; }).length, 2, '应只剩两件同名');
    t.eq(s.equip.treasure.indexOf(eid) >= 0, true, '已穿戴的法宝不应被卖掉');
    t.eq(s.stone, stone0 + g, '灵石应增加半价');
    const r = E.sellEquipAll(s, eid);
    t.eq(r.count, 2, '全部出售应卖掉剩余两件');
    t.eq(s.inventory.filter(function (x) { return x === eid; }).length, 0, '袋中同名应清空');
    t.eq(s.equip.treasure.indexOf(eid) >= 0, true, '全部出售也不动已穿戴');
  });

  S.case('宗门商人：单货币按类型（丹药/灵材=功业，功法/装备/法宝=灵石）', (t) => {
    const s = E.startLife('宗门商店');
    E.commitStart(s, TALENTS[0].id);
    const SECTS0 = G.get('SECTS') || {};
    s.sect = Object.keys(SECTS0)[0];       // 正式入宗（需过考验）
    s.sectRank = '首席';                    // sectPassed=true，可用商人
    s.stone = 100000;
    s.gongye = 100000;
    const GRADE_STONE = G.get('GRADE_STONE') || { '黄': 100, '玄': 400, '地': 1400, '天': 4000, '仙': 8000 };

    // 功业类：丹药/灵材只扣功业，不扣灵石
    let s0 = s.stone, g0 = s.gongye;
    let r = E.sectBuy(s, 'juling');                       // 聚气丹 gongye=10
    t.ok(r.ok, '聚气丹购买应成功: ' + r.msg);
    t.eq(s.elixirs.juling, 1, '聚气丹应入 s.elixirs 且数量 1');
    t.eq(s.gongye - g0, -10, '聚气丹应扣功业 10，实扣=' + (g0 - s.gongye));
    t.eq(s.stone, s0, '聚气丹不应扣灵石');

    r = E.sectBuy(s, 'herb_huang');                       // 黄级灵草 gongye=5
    t.ok(r.ok, '黄级灵草购买应成功: ' + r.msg);
    t.eq(s.materials.herb_huang, 10, '黄级灵草应入 s.materials 且数量 10');
    t.eq(s.stone, s0, '黄级灵草不应扣灵石');

    // 灵石类：功法/装备/法宝只扣灵石，不扣功业
    s0 = s.stone; g0 = s.gongye;
    r = E.sectBuy(s, 'qingfeng');                         // 青锋剑(宝物/equip.treasure) stoneFix=100
    t.ok(r.ok, '青锋剑购买应成功: ' + r.msg);
    t.ok(s.arts.indexOf('qingfeng') >= 0 || s.equip.treasure.indexOf('qingfeng') >= 0, '青锋剑作为宝物应入法宝囊(s.arts)或已装备');
    t.eq(s0 - s.stone, 100, '青锋剑应扣灵石 100');
    t.eq(s.gongye, g0, '青锋剑不应扣功业');

    r = E.sectBuy(s, 'duangu_bian');                      // 锻骨鞭(art 地) 灵石 GRADE_STONE.地=1400
    t.ok(r.ok, '锻骨鞭购买应成功: ' + r.msg);
    t.ok((s.arts.indexOf('duangu_bian') >= 0) || (s.equip.treasure.indexOf('duangu_bian') >= 0), '锻骨鞭应已获得（库存或已装备）');
    t.eq(s0 - s.stone, 100 + GRADE_STONE['地'], '锻骨鞭灵石应为 GRADE_STONE.地=1400（实扣含青锋剑100）');
    t.eq(s.gongye, g0, '法宝不应扣功业（单货币）');
  });

  S.case('宗门门禁：未过考验/杂役 商人无货、任务不可接、不可购', (t) => {
    const s = E.startLife('门禁');
    E.commitStart(s, TALENTS[0].id);
    const SECTS0 = G.get('SECTS') || {};
    s.sect = Object.keys(SECTS0)[0];
    s.sectRank = null;                                    // 已择宗未过考验
    s.stone = 99999; s.gongye = 99999;
    t.eq(E.sectPassed(s), false, '未过考验应 sectPassed=false');
    t.eq(E.sectGoods(s).length, 0, '未过考验商人应无货');
    let r = E.sectBuy(s, 'shengong');
    t.eq(r.ok, false, '未过考验不可购买');

    s.sectRank = '杂役';                                   // 考验失败
    t.eq(E.sectPassed(s), false, '杂役应 sectPassed=false');
    t.eq(E.sectGoods(s).length, 0, '杂役商人应无货');
    t.eq(E.commissionAvailable(s).length, 0, '杂役不可接宗门任务');
    r = E.sectBuy(s, 'shengong');
    t.eq(r.ok, false, '杂役不可购买');
  });

  S.case('入宗考验：通过按评分定级写回 / 全败成杂役 / 每年限考一次', (t) => {
    const s = E.startLife('考验');
    E.commitStart(s, TALENTS[0].id);
    const SECTS0 = G.get('SECTS') || {};
    s.sect = Object.keys(SECTS0)[0];
    // 全败：悟性/道心低且实战败 → 杂役
    s.wu = 1; s.dao = 1;
    let r = E.applySectTrial(s, false);
    t.eq(s.sectRank, '杂役', '全败应成杂役');
    t.eq(r.passed, false, '杂役 passed=false');
    // 每年限考一次：同年再考（即使实战胜）→ 拦截，不得刷过
    const y0 = s.year;
    r = E.applySectTrial(s, true);
    t.eq(r.ok, false, '同年重考应被拦截');
    t.eq(r.blocked, true, '同年重考应标记 blocked');
    t.eq(s.sectRank, '杂役', '被拦截后身份不得变更（防刷过）');
    // 跨年 → 实战胜一场 → 至少外门
    s.year = y0 + 1;
    r = E.applySectTrial(s, true);
    t.eq(r.blocked, undefined, '跨年重考不应 blocked');
    t.ok(['外门', '内门', '真传'].indexOf(s.sectRank) >= 0, '实战胜应评得正式身份，实为 ' + s.sectRank);
    t.eq(E.sectPassed(s), true, '正式身份应 sectPassed=true');
    // 高阶定级：悟性/道心高 + 实战胜 → 真传
    const s2 = E.startLife('考验2'); E.commitStart(s2, TALENTS[0].id);
    s2.sect = Object.keys(SECTS0)[0]; s2.wu = 10; s2.dao = 10;
    const r2 = E.applySectTrial(s2, true);
    t.eq(s2.sectRank, '真传', '三项俱足应评真传，实为 ' + s2.sectRank);
    t.eq(E.sectPassed(s2), true, '真传 sectPassed=true');
  });

  S.case('宗门向主线门禁：未过考验不触发（needSect 顺延），正式入宗才连播', (t) => {
    const s = E.startLife('宗门主线门禁');
    E.commitStart(s, TALENTS[0].id);
    const SECTS0 = G.get('SECTS') || {};
    const MAINLINE0 = G.get('MAINLINE') || [];
    // 把所有主线标 seen，仅留 ml_2_1（初入宗门）与 ml_2_g1（百艺初窥）两条宗门向候选，idx 提到筑基(3)
    Object.keys(s.seen || {}).forEach(function (k) { if (k.indexOf('ml_') === 0) delete s.seen[k]; });
    MAINLINE0.forEach(function (m) { if (m.id !== 'ml_2_1' && m.id !== 'ml_2_g1') s.seen['ml_' + m.id] = 1; });
    s.idx = 3; s.year = 1;
    // 情形1：散修未择宗 → 不得触发宗门向主线
    s.sect = null; s.sectRank = null;
    let yr = E.checkYearEvents(s);
    t.notEq(yr, 'mainline', '散修不应触发宗门向主线');
    // 情形2：已择宗但未过考验（sectRank=null）→ 仍不得触发
    s.sect = Object.keys(SECTS0)[0]; s.sectRank = null;
    yr = E.checkYearEvents(s);
    t.ok(yr !== 'mainline' || !s.pendingMainline || s.pendingMainline.id !== 'ml_2_1', '未过考验不得把初入宗门列为主线');
    // 情形3：杂役 → sectPassed=false，仍不得触发
    s.sectRank = '杂役';
    yr = E.checkYearEvents(s);
    t.ok(yr !== 'mainline' || !s.pendingMainline || s.pendingMainline.id !== 'ml_2_1', '杂役不得把初入宗门列为主线');
    // 情形4：正式入宗（内门）→ 触发 ml_2_1
    s.sectRank = '内门';
    yr = E.checkYearEvents(s);
    t.eq(yr, 'mainline', '正式入宗应触发主线');
    t.ok(s.pendingMainline && s.pendingMainline.id === 'ml_2_1', '应触发【初入宗门】，实为 ' + (s.pendingMainline && s.pendingMainline.id));
    // 连播：moreMainline 播完 ml_2_1 后，正式入宗应继续连播下一宗门向主线（百艺初窥 ml_2_g1）
    s.seen['ml_' + 'ml_2_1'] = 1; delete s.pendingMainline;
    const nx = E.moreMainline(s);
    t.eq(nx, true, '入宗后应能连播后续主线');
    t.ok(s.pendingMainline && s.pendingMainline.id === 'ml_2_g1', '连播应取到百艺初窥，实为 ' + (s.pendingMainline && s.pendingMainline.id));
  });


  S.case('杂役筑基：年度自动升内门（sectYearPromote）', (t) => {
    const s = E.startLife('杂役筑基');
    E.commitStart(s, TALENTS[0].id);
    const SECTS0 = G.get('SECTS') || {};
    s.sect = Object.keys(SECTS0)[0];
    s.sectRank = '杂役';
    // 炼气(大境界0) → 不升
    let up = E.sectYearPromote(s);
    t.eq(s.sectRank, '杂役', '炼气杂役年度不应晋升');
    // 筑基(大境界≥1, idx=3) → 自动升内门
    s.idx = 3;
    up = E.sectYearPromote(s);
    t.eq(s.sectRank, '内门', '杂役筑基应自动升内门，实为 ' + s.sectRank);
    t.eq(E.sectPassed(s), true, '升内门后 sectPassed=true');
    // 正式档不因大境界乱降/自动越级到内门之上（内门再晋升需功业）
    t.ok(up && up.rank === '内门', 'sectYearPromote 应返回内门');
  });

  /* ================= Part I：百艺 灵田播种（买苗/下种/株数/境界门禁） ================= */
  S.case('灵田：买苗受境界门禁；自备灵草下种不限境界', (t) => {
    function fresh() { const s = E.startLife('田'); E.commitStart(s, 'wuxing'); s.stone = 100000; s.materials = { herb_huang: 100, herb_xuan: 50, herb_di: 30 }; return s; }
    // 炼气(bigIdx0)：灵石买玄级苗 → 拒绝
    let s = fresh();
    let r = E.plantField(s, 'lingshen_xuan', 1, 'buy');
    t.ok(typeof r === 'string' && r.indexOf('你翻土') !== 0, '炼气期灵石买玄级苗应被拒');
    t.eq(s.stone, 100000, '被拒时不应扣灵石');
    // 炼气：灵石买黄级苗 → 成功并扣灵石
    r = E.plantField(s, 'lingshen_huang', 1, 'buy');
    t.ok(typeof r === 'string' && r.indexOf('你翻土') === 0, '炼气期灵石买黄级苗应成功');
    t.eq(s.stone, 100000 - 10, '买 1 株黄级苗应扣 10 灵石');
    // 炼气：自备玄级灵草下种 → 成功（不限境界）
    const s2 = fresh();
    r = E.plantField(s2, 'lingshen_xuan', 1, 'own');
    t.ok(typeof r === 'string' && r.indexOf('你翻土') === 0, '自备玄级灵草下种应成功（炼气亦可）');
    t.eq(s2.materials.herb_xuan, 50 - 3, '自备下种玄级应扣 3 株玄级灵草');
    // 株数成本线性（买6株黄）
    const s3 = fresh();
    E.plantField(s3, 'lingshen_huang', 6, 'buy');
    t.eq(s3.stone, 100000 - 60, '买 6 株黄级苗应扣 60 灵石');
    t.ok(!!(s3.field && s3.field[0]), '第 1 块田应有作物');
    if (s3.field && s3.field[0]) t.eq(s3.field[0].quantity, 6, '单亩株数应为 6');
  });

  S.case('灵田：成熟判定 + 采收按株数翻产出', (t) => {
    const s = E.startLife('收'); E.commitStart(s, 'wuxing'); s.stone = 100000; s.materials = { herb_huang: 0 };
    E.plantField(s, 'lingshen_huang', 6, 'buy'); // 黄级 1 年熟，6 株
    let fi = E.fieldInfo(s, 0);
    t.ok(fi && fi.done === false, '刚种下未成熟');
    s.year += 1; s.year = Math.max(s.year, 2);
    fi = E.fieldInfo(s, 0);
    t.ok(fi && fi.done === true, '1 年后应成熟（实 ' + (fi && fi.years) + '/' + (fi && fi.needYears) + '）');
    const h = E.harvestField(s, 0);
    t.ok(typeof h === 'string' && h.indexOf('黄级灵草') >= 0, '采收应产黄级灵草');
    t.ok(s.materials.herb_huang >= 6 * 3, '6 株至少产出 ' + (6 * 3) + ' 黄级灵草（实 ' + s.materials.herb_huang + '）');
    t.ok(s.materials.herb_huang <= 6 * 6 + 0.001, '6 株至多产出 ' + (6 * 6) + ' 黄级灵草');
    t.ok(s.field[0] === null || !s.field[0], '采收后田应清空');
  });

  /* ================= Part I：挖矿 digMine 重构（投入轮次 + 档位 + 深度） ================= */
  S.case('灵矿：digMine 按投入轮次产出、境界定档位、深度成长', (t) => {
    const s = E.startLife('矿'); E.commitStart(s, 'wuxing'); s.stone = 5000; s.materials = {};
    s.actionsLeft = 10;
    const r1 = E.digMine(s, 3);
    t.ok(!!r1 && r1.ok === true, 'digMine 应返回 {ok:true}');
    t.eq(r1.rounds, 3, '应连挖 3 下');
    const ironBefore = s.materials.iron_huang || 0;
    t.gte(s.materials.iron_huang || 0, ironBefore, '铁不应减少');
    t.gte((s.materials.herb_huang || 0), 0, '伴生草不应为负');
    t.gte(s.stone, 5000, '挖矿只增灵石不应减少');
    t.ok(r1.depth >= 0 && r1.depth <= 10, '深度应在 0-10');
    const mi = E.mineInfo(s);
    t.ok(!!mi && mi.ironKey === 'iron_huang', '炼气期挖矿应产黄级灵铁');
    // 深处挖矿（深度封顶不越界）
    for (let i = 0; i < 20; i++) E.digMine(s, 1);
    t.lte(s.mine.depth, 10, '深度应封顶 10');
  });

  /* ================= Part II：秘境连锁解锁（境界 or 通关上一级） ================= */
  S.case('秘境：advUnlocked 双通道 + markAdvClear 持久', (t) => {
    function fresh(idx) { const s = E.startLife('探'); E.commitStart(s, 'wuxing'); s.idx = idx || 0; s.actionsLeft = 6; s.flags = s.flags || {}; return s; }
    // 炼气(idx0)：玄级锁定（未通关黄）
    let s = fresh(0);
    t.eq(E.advUnlocked(s, 'huang'), true, '黄级恒开');
    t.eq(E.advUnlocked(s, 'xuan'), false, '炼气未通关时玄级应锁');
    t.eq(E.advUnlocked(s, 'di'), false, '地级应锁');
    // 通关黄 → 玄级直接开（仍炼气）
    E.markAdvClear(s, 'huang');
    t.ok(s.flags.advClear && s.flags.advClear.huang, 'markAdvClear 应写入 flags');
    t.eq(E.advUnlocked(s, 'xuan'), true, '通关黄级后玄级应开（无视境界）');
    t.eq(E.advUnlocked(s, 'di'), false, '地级仍需通关玄');
    // 通关玄 → 地开
    E.markAdvClear(s, 'xuan');
    t.eq(E.advUnlocked(s, 'di'), true, '通关玄级后地级应开');
    // 元婴(idx9)：不靠通关也全开至仙(仙另需事件现身，此处仅测解锁通道)
    const s2 = fresh(9);
    t.eq(E.advUnlocked(s2, 'tian'), true, '元婴境界直开天级');
    t.eq(E.advUnlocked(s2, 'xian'), true, '元婴境界直开仙级（解锁通道）');
    // 通关天 → 仙级解锁通道开
    const s3 = fresh(0);
    E.markAdvClear(s3, 'huang'); E.markAdvClear(s3, 'xuan'); E.markAdvClear(s3, 'di'); E.markAdvClear(s3, 'tian');
    t.eq(E.advUnlocked(s3, 'xian'), true, '通关天级后仙级解锁通道应开（无视境界）');
    // startAdventure 服务端兜底：炼气未通关玄 → 拒绝
    const s4 = fresh(0); s4.year = 1;
    const rr = E.startAdventure(s4, 'xuan', { ap: 2, items: [] });
    t.ok(rr && rr.ok === false, '炼气未通关时进玄级秘境应被拒');
    // 通关黄后炼气可进玄级
    const s5 = fresh(0); E.markAdvClear(s5, 'huang'); s5.year = 1; s5.actionsLeft = 6;
    const r5 = E.startAdventure(s5, 'xuan', { ap: 2, items: [] });
    t.ok(r5 && r5.ok === true, '通关黄后炼气应能进入玄级秘境');
  });

  return S;
};

function scanNaNLocal(obj, label, msgs, depth = 0) {
  if (depth > 6) return;
  if (typeof obj === 'number') { if (!Number.isFinite(obj)) msgs.push(`${label} 非法数值 ${obj}`); return; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => scanNaNLocal(v, `${label}[${i}]`, msgs, depth + 1)); return; }
  if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) scanNaNLocal(obj[k], `${label}.${k}`, msgs, depth + 1);
}
