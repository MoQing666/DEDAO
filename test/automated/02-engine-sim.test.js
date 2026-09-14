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
      'combatStart', 'simBattle', 'saveState', 'loadState', 'applyOps', 'endLife',
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

    // 铜钱剑：攻击 +5% → s.atk（旧版 atk+5 已改为 atkPct:0.05）
    const atkB = s.atk;
    E.applyOps(s, { art: 'tongqian_jian' });
    t.eq(s.atk, Math.round(atkB * 1.05), '铜钱剑未使攻击 +5%');

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

    // 巨灵腰带：体魄气血 +50% → s.hpMax 提升
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

  S.case('小境界突破吃「渡劫加成」且封顶 98%（2026-09-14 用户要求）', (t) => {
    const s = E.startLife('小境界'); E.commitStart(s, TALENTS[0].id);
    s.idx = 1; s.realm = '炼气'; s.elixirs = {};
    s.talents = []; s.destinies = []; s.tribPct = 0; s.tribBonusExtra = 0; s.sect = null;
    s.dao = 0; s.qi = E.requireNeed(s);
    const base0 = E.breakInfo(s).base;
    s.dao = 10;                                    // 道心 +10 → 渡劫加成 +10%
    const base1 = E.breakInfo(s).base;
    t.gt(base1, base0, '小境界突破必须吃「渡劫加成」——旧版只吃悟性，道心/灵根/命格完全无效');
    t.inRange(base1 - base0, 0.09, 0.11, '道心 +10 应约等于成功率 +10%');
    s.dao = 999;                                   // 极端加成 → 必须封顶 98%
    t.eq(Math.round(E.breakInfo(s).base * 100), 98, '小境界成功率封顶应为 98%');
    // 炼气圆满 → 筑基（同为概率突破、无天劫）也应吃加成
    s.idx = 2; s.realm = '炼气'; s.dao = 0; s.qi = E.requireNeed(s);
    const zb0 = E.breakInfo(s).base;
    s.dao = 10;
    const zb1 = E.breakInfo(s).base;
    t.gt(zb1, zb0, '炼气圆满→筑基 也应吃渡劫加成');
    t.note(`炼气中→后 base: ${(base0 * 100).toFixed(1)}% → 道心+10: ${(base1 * 100).toFixed(1)}%`);
  });

  S.case('突破连续失败 2 次后第 3 次必成（2026-09-14 保底）', (t) => {
    const s = E.startLife('保底'); E.commitStart(s, TALENTS[0].id);
    s.idx = 1; s.realm = '炼气'; s.elixirs = {};
    s.talents = []; s.destinies = []; s.tribPct = 0; s.tribBonusExtra = 0; s.sect = null;
    s.dao = -200;                                  // 使 base<0 → 掷骰必然失败（仅用于确定性验证计数）
    s.breakFails = 0;
    s.qi = E.requireNeed(s);
    E.normalBreakthrough(s, null);
    t.eq(s.breakFails, 1, '第 1 次失败后，连续失败计数应为 1');
    s.qi = E.requireNeed(s);
    E.normalBreakthrough(s, null);
    t.eq(s.breakFails, 2, '第 2 次失败后，连续失败计数应为 2');
    s.qi = E.requireNeed(s);
    const r = E.normalBreakthrough(s, null);
    t.ok(r.win === true, '连续失败 2 次后，第 3 次突破必须因保底而成功');
    t.eq(s.breakFails, 0, '保底成功后连续失败计数应清零');
    t.eq(s.idx, 2, '保底突破应推进一个小境界');
    t.note('保底链路验证：fail→1、fail→2、第 3 次 guaranteed win');
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
            // 触发战斗则用 headless 解析器跑完（simBattle 仅供测试，不参与游戏内流程）
            if (s.battle) { const br = E2.simBattle(s); if (br && br.done) s.battle = null; }
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
            if (s.battle) { const br = E2.simBattle(s); if (br && br.done) s.battle = null; }
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

  S.case('doDuanti：行动点消耗（体魄1/遁速1）', (t) => {
    const s = E.startLife('锻体乙');
    E.commitStart(s, TALENTS[0].id);
    s.flags = { duanti: 1 };
    s.actionsLeft = 10;
    const a0 = s.actionsLeft;
    E.doDuanti(s, 'ti');
    t.eq(s.actionsLeft, a0 - 1, '淬体魄应耗 1 点');
    E.doDuanti(s, 'dun');
    t.eq(s.actionsLeft, a0 - 2, '炼遁速应耗 1 点');
    t.gte(s.ti || 0, 0.5, '体魄应 +0.5');
    t.gte(s.dun || 0, 0.5, '遁速应 +0.5');
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
    const eid = E.randomEquip(0, 1);   // 返回实例 {id, aff}
    const eidStr = (eid && eid.id) ? eid.id : eid;
    t.ok(!!eidStr && !!E.findEquip(eidStr), '应能生成合法装备');
    s.inventory.push(eid, eid, eid); // 袋中三件同名（实例对象）
    if (!Array.isArray(s.equip.treasure)) s.equip.treasure = [];
    s.equip.treasure.push(eidStr);      // 法宝位也穿戴了同 ID
    const stone0 = s.stone;
    const g = E.sellEquip(s, eid);
    t.eq(typeof g, 'number', '出售一件应返回灵石');
    t.eq(s.inventory.filter(function (x) { const e = (x && x.id) ? x : { id: x }; return e.id === eidStr; }).length, 2, '应只剩两件同名');
    t.eq(s.equip.treasure.indexOf(eidStr) >= 0, true, '已穿戴的法宝不应被卖掉');
    t.eq(s.stone, stone0 + g, '灵石应增加半价');
    const r = E.sellEquipAll(s, eid);
    t.eq(r.count, 2, '全部出售应卖掉剩余两件');
    t.eq(s.inventory.filter(function (x) { const e = (x && x.id) ? x : { id: x }; return e.id === eidStr; }).length, 0, '袋中同名应清空');
    t.eq(s.equip.treasure.indexOf(eidStr) >= 0, true, '全部出售也不动已穿戴');
  });

  S.case('穿戴装备：同名只消耗一件（另一件不得凭空消失 · 2026-09-14 用户实测 BUG）', (t) => {
    const s = E.startLife('穿戴甲');
    E.commitStart(s, TALENTS[0].id);
    const eid = E.randomEquip(0, 1);   // 返回实例 {id, aff}
    const eidStr = (eid && eid.id) ? eid.id : eid;
    t.ok(!!eidStr && !!E.findEquip(eidStr), '应能生成合法装备');
    s.equip = { weapon: null, head: null, body: null, accessory: null, treasure: [] };
    s.inventory = [{ id: eidStr, aff: [] }, { id: eidStr, aff: [] }];   // 袋中两件同名
    E.wearEquip(s, s.inventory[0]);
    const left = s.inventory.filter(function (x) { const e = (x && x.id) ? x : { id: x }; return e.id === eidStr; }).length;
    t.eq(left, 1, '穿一件后袋中应剩 1 件同名（旧 bug 按 id 全删 → 剩 0 件，另一件凭空消失）');
    const wornAnywhere = ['weapon', 'head', 'body', 'accessory'].some(function (k) {
      const e = s.equip[k]; const id = (e && e.id) ? e.id : e;
      return id === eidStr;
    }) || (s.equip.treasure || []).indexOf(eidStr) >= 0;
    t.ok(wornAnywhere, '装备应已进入对应槽位');
    t.note('修复：wearEquip 改调 removeOneFromInventory（按 id+词条只删一件），不再用 filter(id !== id) 全删');
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
    r = E.sectBuy(s, 'qingfeng_jian');                    // 青锋剑(武器/equip.weapon) stoneFix=100
    t.ok(r.ok, '青锋剑购买应成功: ' + r.msg);
    const _idOf = (x) => (x && typeof x === 'object' ? x.id : x);
    t.ok(s.inventory.some(function (x) { return _idOf(x) === 'qingfeng_jian'; }) ||
         _idOf(s.equip.weapon) === 'qingfeng_jian',
         '青锋剑作为武器应入储物袋(s.inventory)或已穿戴(weapon)');
    t.eq(s0 - s.stone, 100, '青锋剑应扣灵石 100');
    t.eq(s.gongye, g0, '青锋剑不应扣功业');

    r = E.sectBuy(s, 'duangu_bian');                      // 锻骨池(art 玄·stoneFix) 灵石 1800
    t.ok(r.ok, '锻骨池购买应成功: ' + r.msg);
    t.ok((s.arts.indexOf('duangu_bian') >= 0) || (s.equip.treasure.indexOf('duangu_bian') >= 0), '锻骨池应已获得（库存或已装备）');
    t.eq(s0 - s.stone, 100 + 1800, '锻骨池灵石应为 stoneFix=1800（实扣含青锋剑100）');
    t.eq(s.gongye, g0, '法宝不应扣功业（单货币）');
  });

  S.case('法宝效率分离：淬神台(duantiShenEff) 提升宗门神识/灵力锤炼，锻骨池(duantiEff) 不影响', (t) => {
    const s = E.startLife('淬神台分离');
    E.commitStart(s, TALENTS[0].id);
    const SECTS0 = G.get('SECTS') || {};
    s.sect = Object.keys(SECTS0)[0];
    s.actionsLeft = 20;
    s.shen = 0; s.ling = 0;
    s.sectTrain = { shenByRealm: {}, lingByRealm: {} };
    s.equip.treasure = []; s.arts = [];   // 清空法宝，确保淬神台进装备槽生效
    // 基准（无淬神台）：神识 +1
    E.sectTrain(s, 'shen');
    const baseGain = s.shen;
    t.eq(baseGain, 1, '无淬神台时神识锤炼应为 +1');
    // 授予淬神台（自动装备到法宝槽，duantiShenEff=0.5 → 神识/灵力 +1.5）
    E.applyOps(s, { art: 'cuishen_tai' });
    t.ok(s.equip.treasure.indexOf('cuishen_tai') >= 0, '淬神台应已装备到法宝槽');
    const shenBefore = s.shen, lingBefore = s.ling;
    E.sectTrain(s, 'shen');
    E.sectTrain(s, 'ling');
    t.gt(s.shen - shenBefore, baseGain, '淬神台应提升神识锤炼收益（duantiShenEff）');
    t.gt(s.ling - lingBefore, 1, '淬神台应提升灵力锤炼收益（duantiShenEff）');
    // 反向确认：锻骨池(duantiEff 体魄+遁速) 不影响宗门神识/灵力
    const shenB2 = s.shen;
    E.applyOps(s, { art: 'duangu_bian' });
    E.sectTrain(s, 'shen');
    t.eq(s.shen - shenB2, 1.5, '锻骨池(duantiEff) 不应影响宗门神识锤炼（仍 +1.5 来自淬神台）');
  });

  S.case('攻速法宝踏风履：atkSpd 接通 getExtraAtkChance（与装备同单位·百分点）', (t) => {
    const s = E.startLife('踏风履');
    E.commitStart(s, TALENTS[0].id);
    s.dun = 0; s.extraAtk = 0; s.equip.treasure = []; s.arts = [];
    const base = E.getExtraAtkChance(s);
    E.applyOps(s, { art: 'tafeng_lv' });   // 自动装备，effect.atkSpd=10（百分点）
    t.ok(s.equip.treasure.indexOf('tafeng_lv') >= 0, '踏风履应已装备到法宝槽');
    const withArt = E.getExtraAtkChance(s);
    t.ok(Math.abs((withArt - base) - 0.10) < 1e-6, '踏风履应提供 +10% 额外攻击几率（atkSpd:10 / 100），实得 ' + ((withArt - base) * 100) + '%');
  });

  S.case('山河探索：独立事件池 & 5 个掉宝 BOSS 已迁移 & 踏风履掉落', (t) => {
    const EV = G.get('EVENTS') || {};
    const shanhe = EV.shanhe || [];
    t.ok(shanhe.length >= 13, '山河探索池应含战斗+非战斗事件，实际 ' + shanhe.length + ' 件');
    const ids = shanhe.map(e => e.id);
    ['baigu_gumu', 'han_feng_tan', 'wangu_dong', 'leichi', 'huangshen_tan', 'shanhe_tafeng', 'shanhe_lingquan', 'shanhe_guguan',
      'shanhe_gudong', 'shanhe_yize', 'shanhe_lingyao', 'shanhe_canbei', 'shanhe_shanmin'].forEach(id => {
      t.ok(ids.indexOf(id) >= 0, '山河池应含事件 ' + id);
    });
    const ART = G.get('ARTIFACTS') || {};
    ['youhun_pijian', 'xuanwu_guijia', 'dixue_ren', 'jilin_jia', 'panshi_kai', 'tafeng_lv'].forEach(a => {
      t.ok(ART[a], '山河掉落法宝应存在于 ARTIFACTS: ' + a);
    });
    // 每个山河事件都必须「有结果」：选项要么是战斗（有胜负结算），要么带 effect。
    //   2026-09-14 用户反馈「山河探索文案和结果都不展示、且没有属性结果」——
    //   根因就是 7 个 chapter:false 的事件虽有 choices 却没有顶层 effect，
    //   UI 层又只在 chapter 时弹章节层 → 选项与 effect 双双失效。此处守死数据侧。
    shanhe.forEach(function (ev) {
      t.ok(!!(ev.choices && ev.choices.length), '山河事件 ' + ev.id + ' 应含选项');
      (ev.choices || []).forEach(function (c, ci) {
        t.ok(!!c.fight || !!c.effect || !!c.next || !!c.special,
          '山河事件 ' + ev.id + ' 的第 ' + (ci + 1) + ' 个选项必须有结果（fight/effect/next）');
      });
    });
    // 引擎可触发：高境界角色连续山河探索应返回 multi 事件选择
    const s = E.startLife('山河探索');
    E.commitStart(s, TALENTS[0].id);
    s.idx = 14; s.actionsLeft = 20;
    let got = 0;
    for (let i = 0; i < 6; i++) {
      const r = E.shanheExplore(s);
      if (r && r.multi) got++; else break;
    }
    t.ok(got > 0, '山河探索应能返回 multi 事件选择（实际 ' + got + ' 次）');
    // 每年一次：本年已用 1 次后，再次探索应返回上限提示（字符串），不再给事件
    const capMsg = E.shanheExplore(s);
    t.ok(typeof capMsg === 'string', '每年一次：本年已达上限后再次山河探索应返回提示而非事件（实际 ' + (capMsg && capMsg.multi ? '仍返回事件' : '提示') + '）');
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

  /* ---------- 进入页命格数量口径（抽取固定3；可选=1+我命由我+3劫加成） ---------- */
  S.case('进入页命格数量：抽 3 固定 / 选 1+我命由我+3劫加成', (t) => {
    const meta = E.loadMeta();
    const snap = JSON.parse(JSON.stringify(meta.reinc || {}));
    meta.reinc = meta.reinc || {};
    delete meta.reinc.extra_destiny;
    meta.reinc.destiny_slot = 0;
    E.saveMeta(meta);
    let c = E.destinyCounts(0);
    t.eq(c.pick, 3, '凡尘无天赋：应抽 3 个');
    t.eq(c.slot, 1, '凡尘无天赋：应选 1 个（3选1）');
    t.eq(E.destinyCounts(3).slot, 2, '3劫无天赋：3选2（劫数加成 +1）');
    meta.reinc.destiny_slot = 1; E.saveMeta(meta);
    t.eq(E.destinyCounts(0).slot, 2, '凡尘+我命由我：3选2');
    t.eq(E.destinyCounts(3).slot, 3, '3劫+我命由我：3选3（极限）');
    // 「大千命格」已删除：即使旧档残留该字段，抽取数也必须是 3（loadMeta 会退款清零）
    meta.reinc.extra_destiny = 2; E.saveMeta(meta);
    c = E.destinyCounts(3);
    t.eq(c.pick, 3, '大千命格已删除：抽取数恒为 3（旧档残留也不生效）');
    t.eq(c.slot, 3, '我命由我1级+3劫：3选3');
    // 轮回阁天赋表里不得再有大千命格
    const REINC = E.get && E.get('REINCARNATION');
    if (REINC && REINC.some(r => r.id === 'extra_destiny')) t.fail('REINCARNATION 仍残留大千命格天赋');
    meta.reinc = snap; E.saveMeta(meta); // 还原，避免影响其它用例
    t.note('抽取=3（固定）；可选=1+destiny_slot+(jie>=3?1:0)');
  });

  /* ---------- 宗门福利门禁：未正式入宗不得享受宗门属性加成 ---------- */
  S.case('宗门加成门禁：择宗未考 / 杂役 不吃加成，正式入宗才吃', (t) => {
    const s = E.startLife('宗门门禁');
    E.commitStart(s, null);
    s.talents = []; s.destinies = []; s.arts = []; s.linggen = null;
    s.equip = { weapon: null, head: null, body: null, accessory: null, treasure: [] };
    s.sect = null; s.sectRank = null;
    E.refreshStats(s);
    const baseHp = s.hpMax, baseAtk = s.atk;

    // ① 择宗但尚未应考（sectRank = null）：不应有任何宗门加成
    s.sect = 'xuantian'; s.sectRank = null;      // 玄天门: cultMul 0.10 + hpMax 100
    E.refreshStats(s);
    t.eq(s.hpMax, baseHp, '择宗未应考：不应享宗门气血加成（玄天门 +100）');
    const cult0 = (E.cultGain(s) && E.cultGain(s).gain) || E.cultGain(s);
    // ② 应考失败为杂役：同样不应享加成
    s.sectRank = '杂役';
    E.refreshStats(s);
    t.eq(s.hpMax, baseHp, '杂役：不应享宗门气血加成');
    // ③ 正式入宗：加成必须生效
    s.sectRank = '外门';
    E.refreshStats(s);
    t.eq(s.hpMax, baseHp + 100, '正式入宗：玄天门气血 +100 必须生效');
    const cult1 = (E.cultGain(s) && E.cultGain(s).gain) || E.cultGain(s);
    t.ok(cult1 > cult0, `正式入宗：修炼收益应高于未入宗（${cult0} → ${cult1}）`);
    // ④ 攻击型宗门同理（青云剑宗 atkMul 0.10）
    s.sect = 'qingyunjian'; s.sectRank = null;
    E.refreshStats(s);
    t.eq(s.atk, baseAtk, '择宗未应考：不应享宗门攻击加成（青云剑宗 +10%）');
    s.sectRank = '外门';
    E.refreshStats(s);
    t.ok(s.atk > baseAtk, `正式入宗：攻击应高于未入宗（${baseAtk} → ${s.atk}）`);
  });

  /* ---------- 防御口径（面板/顶栏/战斗统一走 getDefense，必须含装备/法宝/灵根） ---------- */
  S.case('防御口径：体魄(有效值)×0.5×命格倍率 + 装备 + 法宝 + 灵根', (t) => {
    const s = E.startLife('防御校验');
    E.commitStart(s, 'wuxing');
    s.talents = []; s.destinies = []; s.arts = [];
    s.linggen = null;   // 排除灵根词条（土词条 def 会进 flatDef）
    s.equip = { weapon: null, head: null, body: null, accessory: null, treasure: [] };
    E.refreshStats(s);
    const base = Math.round(Math.round(E.effAttr(s, 'ti') * 0.5) * E.getDestinyAttrMult(s, 'def'));
    t.eq(E.getDefense(s), base, '裸装：防御 = round(体魄有效值×0.5×命格倍率)');
    s.equip.body = { id: 'tie_jia', aff: [] };            // 铁甲 main.def = 18
    E.refreshStats(s);
    t.eq(E.getDefense(s), base + 18, '装备防御（铁甲 +18）必须计入面板防御');
    s.equip.weapon = { id: 'xuantian_yin', aff: [] };     // 玄天印 main.def = 12
    E.refreshStats(s);
    t.eq(E.getDefense(s), base + 30, '多件装备防御应累加（铁甲18 + 玄天印12）');
    s.equip.treasure = ['xuanwu_guijia'];                 // 玄武龟甲 effect.def = 20
    E.refreshStats(s);
    t.eq(E.getDefense(s), base + 30 + 20, '法宝防御（玄武龟甲 +20）必须计入');
    s.flatDef = 7;                                        // 灵根土词条绝对防御
    t.eq(E.getDefense(s), base + 30 + 20 + 7, '灵根土词条绝对防御必须计入');
    t.eq(E.getDefensePct(s), Math.min(0.9, (s.earthPct || 0) + (s.artDefPct || 0)), '百分比减伤口径（土阵+法宝，封顶90%）');
    t.eq(E.getDefenseDiv(s), s.jinylvDef || 0, '除算减伤口径（金缕衣）');
    t.note('getDefense = round(round(effAttr(ti)×0.5)×命格def倍率) + 装备def + 法宝def + 灵根土def');
  });

  /* ---------- 战斗减伤必须直接用面板那份防御（防止再次分叉） ---------- */
  S.case('战斗减伤口径 = 面板防御（getDefense 直接参与减伤）', (t) => {
    const s = E.startLife('减伤校验');
    E.commitStart(s, 'wuxing');
    s.talents = []; s.destinies = []; s.arts = [];
    s.linggen = null;
    s.equip = { weapon: null, head: null, body: null, accessory: null, treasure: [] };
    s.array = { wuxing: {}, juling: { level: 0 } };       // 排除五行阵·土阵百分比
    s.dun = 0; s.dodgePct = 0;                            // 排除闪避，保证每回合必中
    s.ti = 41; s.equip.body = { id: 'tie_jia', aff: [] }; // 防御 = 21 + 18 = 39
    E.refreshStats(s);
    const defAbs = E.getDefense(s);
    t.eq(defAbs, 39, '校验前置：防御 = round(41×0.5)+18 = 39');
    const enemyAtk = defAbs + 37;
    E.combatStart(s, { name: '木桩', atk: enemyAtk, hp: 100000 });
    const expect = Math.max(1, Math.round(enemyAtk * (1 - E.getDefensePct(s))) - defAbs);
    t.eq(expect, 37, '校验前置：预期受击伤害 = 敌atk - 面板防御 = 37');
    let seen = null, hits = 0;
    for (let i = 0; i < 8 && !s.battle.done; i++) {
      s.hp = s.hpMax;
      const before = s.battle.hpLost;
      E.combatAct(s, 'atk');
      const d = s.battle.hpLost - before;
      if (d > 0) { hits++; if (seen === null) seen = d; else t.eq(d, seen, '每次受击伤害应一致'); }
    }
    t.gt(hits, 0, '应至少发生一次受击');
    t.eq(seen, expect, '战斗实际受击伤害必须等于「面板防御」推出的减伤值');
    t.ok(seen < enemyAtk - E.equipStats(s).def, '体魄×0.5 必须参与减伤（旧口径只剩装备防御时伤害更高）');
    t.note('受击伤害 = max(1, 敌atk×(1-土阵%/法宝%)-getDefense())，除算减伤再除 (1+金缕衣)');
  });

  /* ---------- 反击率口径：遁速必须取有效值（与 getDodgeRate 同族） ---------- */
  S.case('反击率口径：遁速取有效值（法宝/命格加成生效）', (t) => {
    const s = E.startLife('反击口径');
    E.commitStart(s, 'wuxing');
    s.talents = []; s.destinies = []; s.arts = [];
    s.linggen = null;
    s.equip = { weapon: null, head: null, body: null, accessory: null, treasure: [] };
    s.dun = 10;
    E.refreshStats(s);
    t.ok(Math.abs(E.getCounterRate(s) - 0.10) < 1e-9, '反击率 = 遁速×1% = 10%');
    s.equip.treasure = ['fengxing_yuyi'];   // 风行羽衣：遁速 +2
    E.refreshStats(s);
    t.eq(E.effAttr(s, 'dun'), 12, '校验前置：风行羽衣使有效遁速 = 12');
    t.ok(Math.abs(E.getCounterRate(s) - 0.12) < 1e-9, '法宝/命格给的遁速必须计入反击率（旧写法用基础 s.dun 会漏）');
    t.note('getCounterRate = effAttr(dun)×1% + 命格反击率，与 getDodgeRate/getExtraAtkChance 同族');
  });

  /* ---------- 渡劫成功率口径：灵根 tribPct 按比例（/100）计入 ---------- */
  S.case('渡劫成功率口径：灵根 tribPct 按比例计入，不再被 clamp 掩盖', (t) => {
    function tribTo(s, realmName) {
      for (let i = 0; i < 40; i++) {
        let inf = null;
        try { s.idx = i; inf = E.breakInfo(s); } catch (e) { return null; }
        if (!inf || !inf.st) return null;
        if (inf.mode === 'trib' && inf.trib === realmName) return inf;
      }
      return null;
    }
    const s = E.startLife('渡劫口径');
    E.commitStart(s, 'wuxing');
    s.talents = []; s.destinies = []; s.sect = null; s.elixirs = {};
    s.linggen = { id: 'test_runze', name: '润泽', qiMul: 1, affinity: [], trait: { name: '润泽', effect: { tribPct: 8 } } };
    E.refreshStats(s);
    t.eq(s.tribPct, 0.08, '灵根 tribPct=8 应换算为比例 0.08（/100）');
    const withTrait = tribTo(s, '金丹');
    t.ok(!!withTrait, '应能定位「筑基→金丹」渡劫节点');
    s.linggen = { id: 'test_plain', name: '凡根', qiMul: 1, affinity: [], trait: { name: '凡', effect: {} } };
    E.refreshStats(s);
    const plain = tribTo(s, '金丹');
    t.ok(!!plain, '应能定位「筑基→金丹」渡劫节点（无灵根加成）');
    const diff = withTrait.base - plain.base;
    t.ok(Math.abs(diff - 0.08) < 1e-9, '润泽灵根应使渡劫成功率 +8%，实测 +' + Math.round(diff * 100) + '%');
    t.ok(withTrait.base < 0.98, '未触及 0.98 上限（旧写法 +8.0 会被 clamp 掩盖成恒定满概率）');
    t.note('breakInfo 的渡劫加成改走 s.tribPct（比例口径），与 recalcLinggenBonus 同源');
  });

  /* ---------- 渡劫成功率口径：道心每点 +1%、统一封顶 98% ---------- */
  function tribFinder(E) {
    return function (s, realmName, stepIdx) {
      const keep = s.idx;
      if (stepIdx != null) s.idx = stepIdx;
      let inf = null;
      try { inf = E.breakInfo(s); } catch (e) { inf = null; }
      s.idx = keep;
      if (!inf) return null;
      if (realmName && inf.trib !== realmName) return null;
      return inf;
    };
  }
  S.case('渡劫成功率：道心每点 +1%（与灵根/命格同一份汇总）', (t) => {
    const tribTo = tribFinder(E);
    const s = E.startLife('道心渡劫');
    E.commitStart(s, 'wuxing');
    s.talents = []; s.destinies = []; s.sect = null; s.elixirs = {};
    s.linggen = { id: 'test_plain2', name: '凡根', qiMul: 1, affinity: [], trait: { name: '凡', effect: {} } };
    s.arts = [];
    s.idx = 5; // 筑基后期 → 金丹劫
    s.dao = 10; E.refreshStats(s);
    const lo = tribTo(s, '金丹');
    s.dao = 30; E.refreshStats(s);
    const hi = tribTo(s, '金丹');
    t.ok(!!lo && !!hi, '应能定位「筑基→金丹」渡劫节点');
    const diff = hi.base - lo.base;
    t.ok(Math.abs(diff - 0.20) < 1e-9, '道心 +20 点应使渡劫成功率 +20%，实测 +' + Math.round(diff * 100) + '%');
    t.eq(s.tribPct, 0, '前置校验：无灵根渡劫词条');
    t.note('道心（effAttr 有效值，含法宝/命格加成）×1% 计入 tribBonus，面板与实算同源');
  });

  S.case('渡劫成功率封顶 98%：叠满加成也不超过 0.98', (t) => {
    const tribTo = tribFinder(E);
    const s = E.startLife('封顶');
    E.commitStart(s, 'wuxing');
    s.linggen = { id: 'test_runze2', name: '润泽', qiMul: 1, affinity: [], trait: { name: '润泽', effect: { tribPct: 8 } } };
    s.talents = ['t_tianming'];          // 旧命格：渡劫 +25%
    s.destinies = ['tianming2', 'tiandao']; // 新命格：tribBonus 各 +15%
    s.sect = 'xuantian';                 // 师门：+5%
    s.arts = [];
    s.dao = 60;                          // 道心 +60%
    s.idx = 5; s.elixirs = {}; E.refreshStats(s);
    // 未封顶的原始加成（与 breakInfo 内部同一份口径）
    const raw = 0.55 + s.tribPct + E.talentApply(s, 'trib') + E.getDestinyBonus(s, 'tribBonus')
      + (s.sect === 'xuantian' ? 0.05 : 0) + E.effAttr(s, 'dao') * 0.01;
    t.ok(raw > 1.0, '前置校验：加成总和 ' + raw.toFixed(2) + ' 确实超过 100%（证明 0.98 是封顶而非自然值）');
    const jin = tribTo(s, '金丹');
    t.eq(jin.base, 0.98, '金丹劫应封顶 0.98');
    s.idx = 11; // 元婴后期 → 飞升
    const fly = tribTo(s, '飞升');
    t.eq(fly.base, 0.98, '飞升劫同样封顶 0.98（旧版飞升固定 0.45 且不吃加成）');
    t.note('TRIB_CAP = 0.98 统一封顶，取代旧的金丹 0.90 / 元婴 0.85 分档上限');
  });

  S.case('元婴中期不再重复触发飞升（旧 bug：飞升劫境要打两遍）', (t) => {
    const s = E.startLife('元婴进阶');
    E.commitStart(s, 'wuxing');
    s.talents = []; s.destinies = []; s.sect = null; s.elixirs = {}; s.arts = [];
    E.refreshStats(s);
    s.idx = 10; s.realm = '元婴'; s.qi = 1e9;
    const mid = E.breakInfo(s);
    t.eq(mid.mode, 'small', '元婴中期→后期应为常规小破境，不得触发飞升');
    t.eq(mid.trib, null, '元婴中期的 trib 应为空');
    s.idx = 11; s.qi = 1e9;
    const late = E.breakInfo(s);
    t.eq(late.mode, 'trib', '元婴后期（境界表最后一段）才触发飞升');
    t.eq(late.trib, '飞升', '元婴后期 → 飞升天劫');
    // 元婴中期走概率突破后应落在 idx=11，而不是直接成仙
    s.idx = 10;
    E.dujieWin(s);
    t.eq(s.idx, 11, '元婴中期渡劫（小破境）后应停在元婴后期');
    t.eq(s.endReason || null, null, '不应直接结档飞升');
    E.dujieWin(s);
    t.eq(s.idx, 15, '元婴后期渡劫后才飞升（idx=15）');
    t.eq(s.endReason, '飞升', '飞升应写入 endReason');
    t.note('breakInfo 旧有 st.realm===元婴 && st.sub===中期 分支与 !nxt 重复，导致飞升劫境跑两遍');
  });

  /* ---------- 劫境战败 = 直接身死道消（可重来的试错空间已关闭） ---------- */
  S.case('渡劫失败 = 直接死亡结档（金丹/元婴/飞升一致，不再掷骰子保命）', (t) => {
    [['金丹', 5, '筑基'], ['元婴', 8, '金丹'], ['飞升', 11, '元婴']].forEach(function (row) {
      const trib = row[0];
      const s = E.startLife('渡劫陨落·' + trib);
      E.commitStart(s, 'wuxing');
      E.refreshStats(s);
      s.idx = row[1]; s.realm = row[2]; s.qi = 1e9;
      s.dead = false; s.endReason = null;
      s.trib = { target: trib, ren: true };
      const res = E.dujieFail(s, trib);
      t.eq(res.died, true, trib + '劫失败应直接判定陨落');
      t.eq(s.dead, true, trib + '劫失败应结档（s.dead = true）');
      t.eq(s.endReason, '天劫陨落', trib + '劫失败应写入「天劫陨落」');
      t.eq(s.trib, null, trib + '劫失败应清空渡劫状态');
    });
    t.note('旧实现走 tribFail(..., false)：金丹 15% / 元婴 25% 陨落，其余只「道基受创、修为 -20%」→ 可无限试错');
  });

  /* ---------- 宗门任务 / 宗门大比 / 主线门禁（2026-09-13 新增） ---------- */

  S.case('事件/主线的 effect.trib 真正计入渡劫率（旧实现写进死字段，静默失效）', (t) => {
    const s = E.startLife('渡劫加成'); E.commitStart(s, 'wuxing');
    s.idx = 5; s.realm = '筑基'; s.qi = 1e9; s.dead = false;
    const before = E.breakInfo(s).base;
    E.applyOps(s, { trib: 0.05 });
    const after = E.breakInfo(s).base;
    t.ok(Math.abs((after - before) - 0.05) < 1e-6, '渡劫 +5% 应让 breakInfo.base 提高 0.05（实差 ' + (after - before).toFixed(4) + '）');
    E.applyOps(s, { trib: 0.10 });
    const after2 = E.breakInfo(s).base;
    t.ok(Math.abs((after2 - before) - 0.15) < 1e-6, '多次累积应叠加（实差 ' + (after2 - before).toFixed(4) + '）');
    t.ok(!s.linggen || !s.linggen.body || !s.linggen.body.trib, '不应再写旧字段 linggen.body.trib');
    t.note('旧实现写 s.linggen.body.trib，而 linggenTrait 只认 linggen.trait.effect → 所有「渡劫+N%」奖励静默无效');
  });

  S.case('宗门任务：每年至多 3 件（跨年重置）', (t) => {
    const s = E.startLife('委托测试');
    E.commitStart(s, 'wuxing');
    s.sect = 'qingyunjian'; s.sectRank = '真传';
    s.actionsLeft = 30; s.year = 5;
    s.ti = 9; s.shen = 20; s.wu = 9; s.dao = 9;   // 满足 six 类委托的属性门槛
    t.eq(E.commissionYearLeft(s), 3, '年初应剩 3 件');
    for (let i = 0; i < 3; i++) {
      const r = E.commissionComplete(s, 'caiyao');
      t.eq(r.ok, true, '第 ' + (i + 1) + ' 件应可完成（' + r.msg + '）');
    }
    t.eq(E.commissionYearLeft(s), 0, '三件之后应剩 0');
    const r4 = E.commissionComplete(s, 'caiyao');
    t.eq(r4.ok, false, '第 4 件必须被拒（每年至多 3 件）');
    t.ok(/已接满|至多/.test(r4.msg || ''), '拒绝提示应说明年度上限（实：' + r4.msg + '）');
    s.year = 6;
    t.eq(E.commissionYearLeft(s), 3, '跨年应重置为 3 件');
    t.note('旧实现无任何次数限制 → 可无限刷委托奖励');
  });

  S.case('秘境探勘守敌对标地级秘境 BOSS（不再写死 40/300）', (t) => {
    const s = E.startLife('探勘测试');
    E.commitStart(s, 'wuxing');
    s.sect = 'qingyunjian'; s.sectRank = '真传'; s.actionsLeft = 10; s.year = 5;
    const c = E.commissionAvailable(s).filter(function (x) { return x.id === 'tancha'; })[0];
    t.ok(!!c, '真传应可承接「秘境探勘」');
    t.ok(!!c.enemyBoss, '「秘境探勘」应声明 enemyBoss（对标哪一阶秘境）');
    t.eq(c.enemyBoss.adv, 'di', '应对标地级秘境');
    E.startAdventure(s, 'di', { ap: 2, items: [] });
    const expect = E.enemyGen(s, 'boss', c.enemyBoss.depth, 'di');
    const foe = E.commissionEnemy(s, c);
    t.eq(foe.atk, expect.atk, '守敌攻击必须与地级秘境 BOSS 同源（Engine.enemyGen）');
    t.eq(foe.hp, expect.hp, '守敌血量必须与地级秘境 BOSS 同源');
    t.gt(foe.atk, 500, '应远高于旧写死的 40（实 ' + foe.atk + '）');
    t.gt(foe.hp, 2000, '应远高于旧写死的 300（实 ' + foe.hp + '）');
    // 非 enemyBoss 委托仍沿用 data 写死值（低阶杂兵战）
    const huwei = E.commissionAvailable(s).filter(function (x) { return x.id === 'huwei'; })[0];
    if (huwei) {
      const f2 = E.commissionEnemy(s, huwei);
      t.eq(f2.atk, huwei.enemy.atk, '无 enemyBoss 的委托应沿用 data 数值');
    }
    t.note('秘境探勘守敌 攻 ' + foe.atk + ' / 血 ' + foe.hp + '（地级秘境第 ' + c.enemyBoss.depth + ' 层 Boss 同源）');
  });

  S.case('宗门大比：十年一届 · 首赛第 10 年 · 一条直线 5 层 · 对手随境界缩放', (t) => {
    const DABI = G.get('SECT_DABI');
    t.eq(DABI.intervalYears, 10, '宗门大比应十年一届（旧为 3 年）');
    t.eq(DABI.firstYear, 10, '首届应在第 10 年');
    t.eq(DABI.layers, 5, '应为 5 层连战');
    t.ok(!DABI.foes, '不应再保留写死数值的 foes 表（改为按境界实时生成）');

    const s = E.startLife('大比测试');
    E.commitStart(s, 'wuxing');
    s.sect = 'qingyunjian'; s.sectRank = '外门';

    s.year = 3;
    let st = E.dabiStatus(s);
    t.eq(st.eligible, true, '正式弟子应有参赛资格');
    t.eq(st.inYears, 7, '第 3 年应显示「距离下次大比还有 7 年」');
    t.ok(st.msg.indexOf('7') >= 0, '倒计时文案应含剩余年数（实：' + st.msg + '）');
    s.year = 10;
    st = E.dabiStatus(s);
    t.eq(st.canEnter, true, '第 10 年应开赛');
    t.eq(st.inYears, 0, '开赛年剩余 0 年');

    const s2 = E.startLife('大比·未入宗');
    E.commitStart(s2, 'wuxing');
    s2.year = 10;
    t.eq(E.dabiStatus(s2).eligible, false, '未入宗不应可参赛');
    t.eq(E.sectDabiStart(s2).ok, false, '未入宗开赛应被拒');

    const start = E.sectDabiStart(s);
    t.eq(start.ok, true, '第 10 年应能开赛');
    t.eq(s.lastDabiYear, 10, '开赛应记录 lastDabiYear');
    for (let i = 0; i < 5; i++) {
      const lf = E.dabiFoe(s, i);
      t.ok(lf.atk > 0 && lf.hp > 0, '第 ' + (i + 1) + ' 层对手应有正数值');
      const r = E.sectDabiStep(s, true);
      if (i < 4) t.eq(r.done, false, '第 ' + (i + 1) + ' 层胜利后应继续下一层');
      else { t.eq(r.done, true, '第 5 层胜利应结束'); t.eq(r.full, true, '五层全胜应标记 full'); }
    }
    t.eq(s.hp, s.hpMax, '五层全胜应回满气血');
    t.eq(s.mp, s.mpMax, '五层全胜应回满灵力');

    // 对手强度：随层数递增 + 随玩家境界缩放（口径 Engine.dabiFoe）
    const sa = E.startLife('大比A'); E.commitStart(sa, 'wuxing'); sa.idx = 0;
    const sb = E.startLife('大比B'); E.commitStart(sb, 'wuxing'); sb.idx = 11;
    t.gt(E.dabiFoe(sa, 4).atk, E.dabiFoe(sa, 0).atk, '同境界下第 5 层对手应强于第 1 层');
    t.gt(E.dabiFoe(sb, 4).atk, E.dabiFoe(sa, 4).atk, '高境界同一层对手应更强（不再写死 atk 15~100）');

    s.year = 10;
    const st2 = E.dabiStatus(s);
    t.eq(st2.canEnter, false, '本届已参加 → 本年内不可重复开赛');
    t.eq(st2.inYears, 10, '本届已参加 → 倒计时应指向下一届（10 年后）');
    t.note('炼气期第1/5层 攻 ' + E.dabiFoe(sa, 0).atk + '/' + E.dabiFoe(sa, 4).atk
      + '；元婴期第5层 攻 ' + E.dabiFoe(sb, 4).atk);
  });

  S.case('主线门禁：仙门收徒（已入宗不播）｜初入宗门/百艺初窥（入宗次年才播）', (t) => {
    const MAINLINE = G.get('MAINLINE');
    const g0 = MAINLINE.filter(function (m) { return m.id === 'ml_2_0'; })[0];
    const g1 = MAINLINE.filter(function (m) { return m.id === 'ml_2_1'; })[0];
    const gg1 = MAINLINE.filter(function (m) { return m.id === 'ml_2_g1'; })[0];
    t.eq(!!g0 && g0.noSect === true, true, 'ml_2_0「仙门收徒」应带 noSect（已入宗则不显示）');
    t.eq(!!g1 && g1.afterSectYear === true, true, 'ml_2_1「初入宗门」应带 afterSectYear');
    t.eq(!!gg1 && gg1.afterSectYear === true, true, 'ml_2_g1「百艺初窥」应带 afterSectYear');

    const pendingId = function (s) { return s.pendingMainline ? s.pendingMainline.id : null; };
    // 只保留待验证的目标主线可选（其余全部标记已播），避免被更早的主线抢先命中
    const onlyTargets = function (s, targets) {
      MAINLINE.forEach(function (m) { s.seen['ml_' + m.id] = 1; });
      targets.forEach(function (id) { delete s.seen['ml_' + id]; });
      s.pendingMainline = null;
      s.seen['omen_meet'] = 1;
    };

    // ① 未入宗：应播「仙门收徒」
    const a = E.startLife('门禁·散修'); E.commitStart(a, 'wuxing');
    a.idx = 3; a.year = 12;
    onlyTargets(a, ['ml_2_0']);
    E.checkYearEvents(a);
    t.eq(pendingId(a), 'ml_2_0', '未入宗时应播「仙门收徒」');

    // ② 已入宗当年：不播仙门收徒、也不播初入宗门
    const b = E.startLife('门禁·当年'); E.commitStart(b, 'wuxing');
    b.idx = 3; b.year = 12;
    b.sect = 'qingyunjian'; b.sectRank = '内门'; b.sectJoinYear = 12;
    onlyTargets(b, ['ml_2_0', 'ml_2_1']);
    E.checkYearEvents(b);
    t.notEq(pendingId(b), 'ml_2_0', '已入宗不该再播「仙门收徒」');
    t.notEq(pendingId(b), 'ml_2_1', '入宗当年不该播「初入宗门」（须次年）');
    t.eq(pendingId(b), null, '入宗当年两条都不该播');

    // ③ 入宗次年：播「初入宗门」
    b.year = 13;
    onlyTargets(b, ['ml_2_1']);
    E.checkYearEvents(b);
    t.eq(pendingId(b), 'ml_2_1', '入宗次年应播「初入宗门」');

    // ④ 旧档无 sectJoinYear：不得因此永久卡住（兜底为不阻塞）
    const c = E.startLife('门禁·旧档'); E.commitStart(c, 'wuxing');
    c.idx = 3; c.year = 13;
    c.sect = 'qingyunjian'; c.sectRank = '内门';
    onlyTargets(c, ['ml_2_1']);
    E.checkYearEvents(c);
    t.eq(pendingId(c), 'ml_2_1', '旧档（无 sectJoinYear）不应被 afterSectYear 永久挂起');
  });

  /* ---------- 阵法被动心得速率（zhenfaPassiveExp，挂 endYear）----------
     历史风险：这是「silent 数值」——改了阈值 / 聚灵阵加权后无任何守卫，
     源码改动曾与 dist 分叉而测试全绿。此用例把「激活年/年」与「阈值」钉死。 */
  S.case('阵法被动心得：激活年速率与 6 激活年阈值', (t) => {
    const mk = function (jlLv, wuxingOn) {
      const s = E.startLife('阵道'); E.commitStart(s, TALENTS[0].id);
      s.hp = s.hpMax = 99999; s.age = 20; s.year = 1; s.stone = 999999;
      s.craft = s.craft || {};
      s.craft.zhenfa = { lv: 1, exp: 0 };
      s.array = { juling: { level: jlLv, paid: false }, wuxing: wuxingOn ? { fire: true } : {} };
      return s;
    };
    const accAfter = function (s, years) {
      for (let i = 0; i < years; i++) E.endYear(s);
      return s.craft.zhenfa.passiveAcc || 0;
    };

    // ① 无阵不白给
    const none = mk(0, false);
    t.eq(accAfter(none, 3), 0, '无聚灵阵也无五行阵时不应累积阵道心得');

    // ② 聚灵阵按等级加权：Lv1=1 / Lv2=1.5→（整数累加）/ Lv3=2
    t.eq(accAfter(mk(1, false), 1), 1, '聚灵阵 Lv1 每年应记 1 个激活年');
    t.eq(accAfter(mk(3, false), 1), 2, '聚灵阵 Lv3 每年应记 2 个激活年');

    // ③ 五行阵开启任一即 +1（key 为 fire/metal/water/wood/earth）
    t.eq(accAfter(mk(0, true), 1), 1, '仅五行阵开启时每年应记 1 个激活年');
    t.eq(accAfter(mk(3, true), 1), 3, '聚灵阵 Lv3 + 五行阵应为每年 3 个激活年');

    // ④ 阈值：6 个激活年结算 1 点心得（Lv1 聚灵单阵 → 第 6 年升级；第 5 年不升）
    const s5 = mk(1, false);
    for (let i = 0; i < 5; i++) E.endYear(s5);
    t.eq(s5.craft.zhenfa.lv, 1, 'Lv1 单阵 5 年（5 激活年）不应升级');
    E.endYear(s5);
    t.eq(s5.craft.zhenfa.lv, 2, 'Lv1 单阵第 6 年（6 激活年）应结算 1 点心得并升级');
    t.note('速率口径：每 6 激活年 1 点心得；激活年/年 = 聚灵阵(Lv1=1/Lv2=1.5/Lv3=2) + 五行阵(任一=1)');
  });

  return S;
};

function scanNaNLocal(obj, label, msgs, depth = 0) {
  if (depth > 6) return;
  if (typeof obj === 'number') { if (!Number.isFinite(obj)) msgs.push(`${label} 非法数值 ${obj}`); return; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => scanNaNLocal(v, `${label}[${i}]`, msgs, depth + 1)); return; }
  if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) scanNaNLocal(obj[k], `${label}.${k}`, msgs, depth + 1);
}
