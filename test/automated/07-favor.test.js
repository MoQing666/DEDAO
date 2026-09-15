/* DEDAO 自动化测试 —— 07 仙缘 NPC 缘法系统（立绘/解锁/好感分级/好感奖励/互动/单抽/主线触发）
 * 验证：NPCS 结构、解锁门槛、好感分级奖励、送礼/叙话互动与冷却、仙缘单抽、老乞丐由主线触发、林婉儿等由游历触发。
 */
const { Suite, createGameContext } = require('./_harness');

module.exports = async function build() {
  const S = new Suite('07 仙缘 NPC 缘法系统');
  const G = createGameContext({ seed: 20260910 });
  const E = G.get('Engine');
  const NPCS = G.get('NPCS');
  const MAINLINE = G.get('MAINLINE');
  const TALENTS = G.get('TALENTS') || [];

  function freshState(idx) {
    const s = E.startLife('favor-test');
    E.commitStart(s, TALENTS[0].id);
    if (idx != null) s.idx = idx;
    s.seen = s.seen || {};
    s.flags = s.flags || {};
    s.favor = s.favor || {};
    s.favorReward = s.favorReward || {};
    s.giftCooldown = s.giftCooldown || {};
    s.talkCooldown = s.talkCooldown || {};
    s.actionsLeft = 999;
    s.stone = 1000;
    return s;
  }

  S.case('NPCS 结构与分流正确', (t) => {
    t.eq(Object.keys(NPCS).length, 4, '应有 4 位仙缘 NPC');
    t.eq(NPCS.laoqigai.surface, 'mainline', '老乞丐由主线触发');
    t.eq(NPCS.lin.surface, 'travel', '林婉儿由游历触发');
    t.eq(NPCS.baisu.surface, 'travel', '白素由游历触发');
    t.eq(NPCS.heimao.surface, 'travel', '黑猫由游历触发');
    ['laoqigai', 'lin', 'baisu', 'heimao'].forEach((id) => {
      const n = NPCS[id];
      t.ok(!!n.unlock && !!n.unlock.story, id + ' 应设有解锁剧情');
      t.ok(Array.isArray(n.tiers) && n.tiers.length >= 2, id + ' 应设有好感分级');
      t.ok(!!n.gifts, id + ' 应可送礼');
      t.ok(!!n.talk, id + ' 应可叙话');
      t.ok(!!n.event && !!n.event.id, id + ' 应有效法事件');
    });
    const inMain = MAINLINE.some((ml) => ml.id === 'xian_laoqigai');
    t.ok(inMain, '老乞丐缘法应并入 MAINLINE');
  });

  S.case('解锁门槛：未达成剧情前锁定，达成后解锁', (t) => {
    const s = freshState(3);
    t.ok(!E.npcUnlocked(s, NPCS.lin), '未达成【青梅往事】时林婉儿应锁定');
    s.seen['ml_0_6'] = 1;
    t.ok(E.npcUnlocked(s, NPCS.lin), '达成【青梅往事】后林婉儿应解锁');
    s.seen = {};
    t.ok(!E.npcUnlocked(s, NPCS.baisu), '未达成【云游散修】时白素应锁定');
    s.seen['ml_1_0'] = 1;
    t.ok(E.npcUnlocked(s, NPCS.baisu), '达成【云游散修】后白素应解锁');
  });

  S.case('好感分级奖励：送礼跨级发放一次性奖励', (t) => {
    const s = freshState(3);
    s.seen['ml_0_6'] = 1;                       // 解锁林婉儿
    const wu0 = s.wu + (s.wuAcc || 0);
    const r1 = E.giveGift(s, 'lin', 'wine');     // +3 好感 → 跨过 min3 的「相识」奖励
    t.ok(r1.ok, '送礼应成功: ' + r1.msg);
    t.eq(E.favorOf(s, 'lin'), 3, '好感应为 3');
    t.ok((s.wu + (s.wuAcc || 0)) > wu0, '跨过「相识」阈值应发放 悟性+0.5 奖励（wu ' + wu0 + '→' + (s.wu + (s.wuAcc || 0)) + '）');
    t.ok((s.favorReward['lin'] || []).indexOf(1) >= 0, '「相识」奖励应只发放一次（已记录）');
    const r2 = E.giveGift(s, 'lin', 'flower');   // 同年再送 → 年度冷却
    t.ok(!r2.ok && /已赠过礼/.test(r2.msg), '同年二次送礼应被冷却拦截');
  });

  S.case('送礼与叙话的年度冷却', (t) => {
    const s = freshState(3);
    s.seen['ml_0_6'] = 1;
    s.year = 1;
    E.giveGift(s, 'lin', 'flower');
    const r = E.giveGift(s, 'lin', 'flower');    // 同年再送 → 冷却
    t.ok(!r.ok && /已赠过礼/.test(r.msg), '同年二次送礼应被冷却拦截');
    E.talkNpc(s, 'lin');
    const r2 = E.talkNpc(s, 'lin');              // 同年再叙 → 冷却
    t.ok(!r2.ok && /已叙话/.test(r2.msg), '同年二次叙话应被冷却拦截');
    s.year = 2;                                  // 跨年
    const r3 = E.giveGift(s, 'lin', 'flower');
    t.ok(r3.ok, '跨年后再送礼应成功');
  });

  S.case('仙缘单抽：消耗行动点、每年上限 3', (t) => {
    const s = freshState(3);
    let draws = 0, blocked = 0;
    for (let i = 0; i < 10; i++) {
      const before = s.actionsLeft;
      const r = E.drawXianyuan(s);
      if (typeof r === 'string' && /已尽|不足/.test(r)) { blocked++; continue; }
      if (r && r.id) { draws++; t.ok(s.actionsLeft === before - 1, '单抽应消耗 1 行动点'); }
    }
    t.eq(draws, 3, '每年最多 3 次仙缘单抽（实测 ' + draws + '）');
    t.ok(blocked > 0, '达上限后应提示「仙缘已尽」');
    t.eq(s.xianyuanYearCount, 3, 'xianyuanYearCount 应停在 3');
  });

  S.case('老乞丐由主线触发（需 beggar_met 标记）', (t) => {
    const ev = MAINLINE.find((ml) => ml.id === 'xian_laoqigai');
    t.ok(!!ev, '老乞丐缘法应在 MAINLINE 中');
    t.eq(ev.idx, 0, '老乞丐缘法应为 idx0 触发');
    t.ok(ev.req && ev.req.flags && ev.req.flags.beggar_met === 1, '老乞丐缘法应要求 beggar_met 标记');
    const s = freshState(0);
    t.ok(!E.evEligible(s, ev), '未结识老乞丐时不该触发');
    s.flags.beggar_met = 1;
    t.ok(E.evEligible(s, ev), 'beggar_met 后老乞丐缘法应可触发');
  });

  // 炼体主线（2026-09-14 用户定稿）：两个选项都「必然学会炼体之法」（习得《锻体诀》），
  // 差别只在属性加成——不允许出现「选了某项就学不到炼体」的分支。
  S.case('老丐传艺：两个选项都必然习得《锻体诀》（差别只在属性加成）', (t) => {
    const ev = MAINLINE.find((ml) => ml.id === 'xian_laoqigai');
    t.ok(!!ev, '老丐传艺应在 MAINLINE 中');
    if (!ev) return;
    t.eq((ev.choices || []).length, 2, '老丐传艺应为两选项');
    (ev.choices || []).forEach((c, i) => {
      const eff = c.effect || {};
      t.eq(eff.flags && eff.flags.duanti, 1, '选项' + (i + 1) + '「' + c.t + '」应习得《锻体诀》（flags.duanti）');
    });
    const a = (ev.choices[0] || {}).effect || {};
    const b = (ev.choices[1] || {}).effect || {};
    t.ok(JSON.stringify([a.ti, a.atk, a.wu]) !== JSON.stringify([b.ti, b.atk, b.wu]), '两选项的属性加成应有差异');
    // 端到端：两个选项各自 applyOps 后，锻体都应处于「已解锁」
    (ev.choices || []).forEach((c, i) => {
      const s = freshState(0);
      delete s.flags.duanti;
      t.ok(!E.duantiInfo(s).unlocked, '未选之前应未解锁锻体');
      E.applyOps(s, c.effect);
      t.ok(E.duantiInfo(s).unlocked, '选选项' + (i + 1) + '「' + c.t + '」后应解锁锻体（duantiInfo.unlocked）');
    });
  });

  S.case('林婉儿可由游历 3 选 1 触发（解锁后）', (t) => {
    let seenUnlocked = 0, seenLocked = 0;
    for (let i = 0; i < 600; i++) {
      const sLocked = freshState(3);
      const rL = E.travel(sLocked);
      if (rL && rL.events) rL.events.forEach((e) => { if (e.id === 'xian_lin') seenLocked++; });
      const sUnlocked = freshState(3);
      sUnlocked.seen['ml_0_6'] = 1;
      const rU = E.travel(sUnlocked);
      if (rU && rU.events) rU.events.forEach((e) => { if (e.id === 'xian_lin') seenUnlocked++; });
    }
    t.eq(seenLocked, 0, '未解锁时游历绝不应出现林婉儿缘法');
    t.ok(seenUnlocked > 0, '解锁后应能在游历中遇到林婉儿（实测 ' + seenUnlocked + ' 次）');
  });

  S.case('探寻仙缘入口：只出 NPC 缘法，年 1 次', (t) => {
    const s = freshState(3);
    s.seen['ml_0_6'] = 1; // 解锁林婉儿
    s.seen['ml_1_0'] = 1; // 解锁白素
    s.seen['ml_0_4'] = 1; // 解锁黑猫
    const r1 = E.seekNpcXianyuan(s);
    t.ok(r1 && r1.id && r1.id.indexOf('xian_') === 0, '首次探寻应触发 NPC 缘法：' + (r1 && r1.id));
    t.ok(s.npcTravelYearCount === 1, '探寻后计数应为 1');
    const r2 = E.seekNpcXianyuan(s);
    t.eq(typeof r2, 'string', '当年再次探寻应被限制：' + r2);
    E.endYear(s);
    t.eq(s.npcTravelYearCount, 0, '年末应重置探寻仙缘计数');
    const r3 = E.seekNpcXianyuan(s);
    t.ok(r3 && r3.id && r3.id.indexOf('xian_') === 0, '次年可再次探寻 NPC 缘法');
  });

  S.case('探寻仙缘：无可寻访 NPC 时不扣点、不占次数', (t) => {
    const s = freshState(3);
    // 不标记任何 ml_0_4/ml_0_6/ml_1_0 —— 无已解锁的 travel NPC
    const ap0 = s.actionsLeft;
    const r = E.seekNpcXianyuan(s);
    t.eq(typeof r, 'string', '应返回提示文案而非事件');
    t.ok(r.indexOf('遍寻不见') < 0, '不应再弹「遍寻不见」死文案：' + r);
    t.eq(s.npcTravelYearCount || 0, 0, '空池不应占用本年探寻次数');
    t.eq(s.actionsLeft, ap0, '空池不应扣除行动点');
    // 同年再点也不应累计次数（避免连点刷屏）
    E.seekNpcXianyuan(s);
    t.eq(s.npcTravelYearCount || 0, 0, '空池连点仍不占次数');
  });

  return S;
};
