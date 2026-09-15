/* DEDAO 自动化测试 —— 08 五劫主线 / 灾劫玉符 / 渡劫劫境 / 隐藏线
 * 覆盖：五劫年表与劫主角色卡、劫主立绘可解析性与占位回落、玉符逐年倒计时与裂纹累加、
 *       五劫尽渡、隐藏线解锁（仅需难度系数 ≥ 6）、渡劫劫境按突破档位映射、
 *       劫身角色卡、三类劫境（死劫/渡劫/隐藏）地图可启动。
 */
const fs = require('fs');
const path = require('path');
const { ROOT, Suite, createGameContext } = require('./_harness');

module.exports = async function build() {
  const S = new Suite('08 五劫主线（玉符/渡劫/隐藏线）');
  const G = createGameContext({ seed: 20260911 });
  const E = G.get('Engine');
  const DEATH_EVENTS = G.get('DEATH_EVENTS');
  const DEATH_SCALES = G.get('DEATH_SCALES');
  const DEATH_IDX_REALM = G.get('DEATH_IDX_REALM');
  const OMEN_TALISMAN = G.get('OMEN_TALISMAN');
  const TRIB_TRIALS = G.get('TRIB_TRIALS');
  const TRIB_BOSSES = G.get('TRIB_BOSSES');
  const HIDDEN_BOSS = G.get('HIDDEN_BOSS');

  const YEARS = [18, 36, 49, 64, 81];
  const P = (k) => path.join(ROOT, 'assets', 'img', 'portrait', k + '.png');

  function fresh() {
    const s = E.startLife('五劫测试');
    E.commitStart(s, 'wuxing');
    return s;
  }

  /* ---------------------------------------------------------------- */
  S.case('五劫年表：恰好 5 个死劫，年份 18/36/49/64/81', (t) => {
    t.ok(Array.isArray(DEATH_EVENTS), 'DEATH_EVENTS 未加载');
    t.eq(DEATH_EVENTS.length, 5, '死劫数量应为 5');
    t.eq(DEATH_EVENTS.map(e => e.year).join(','), YEARS.join(','), '死劫年份序列不符');
    t.eq(DEATH_SCALES.length, 5, 'DEATH_SCALES 应为 5 档');
    t.eq(DEATH_IDX_REALM.length, 5, 'DEATH_IDX_REALM 应为 5 档');
    for (let i = 1; i < DEATH_SCALES.length; i++) {
      t.gte(DEATH_SCALES[i].atkMul, DEATH_SCALES[i - 1].atkMul, '攻击系数应逐劫递增');
      t.gte(DEATH_SCALES[i].hpMul, DEATH_SCALES[i - 1].hpMul, '血量系数应逐劫递增');
    }
  });

  S.case('每位劫主都有完整角色卡（称号/立绘/登场白/台词/机制）', (t) => {
    DEATH_EVENTS.forEach((ev, i) => {
      const tag = '第' + (i + 1) + '劫';
      t.eq(ev.id, 'jie' + (i + 1), tag + ' id 序列异常');
      t.ok(ev.chapter === true, tag + ' 应为主线章节');
      t.gte((ev.lines || []).length, 3, tag + ' 缺剧情 lines');
      const b = ev.boss || {};
      t.ok(!!b.name, tag + ' 缺劫主姓名');
      t.ok(!!b.title, tag + ' 缺劫主称号');
      t.ok(!!b.portrait, tag + ' 缺劫主立绘');
      t.ok(!!b.intro && !!b.line, tag + ' 缺劫主登场白');
      t.gte((b.taunt || []).length, 1, tag + ' 缺劫主台词');
      t.ok(!!ev.resultWin && !!ev.resultLose, tag + ' 缺胜负文案');
      t.ok(!!ev.omenCrack, tag + ' 缺玉符裂纹文案');
      const tr = ev.trial || {};
      t.ok(!!tr.name && tr.cols >= 4, tag + ' 缺劫境主题（名称/列数）');
      t.gte((tr.types || []).length, 3, tag + ' 劫境节点池过窄');
      t.gte((tr.settings || []).length, 3, tag + ' 劫境环境文案过少');
    });
  });

  S.case('劫主立绘可解析（自绘 3 张 + 占位回落既有素材）', (t) => {
    const keys = DEATH_EVENTS.map(e => e.boss.portrait)
      .concat([HIDDEN_BOSS.boss.portrait, OMEN_TALISMAN.portrait]);
    t.eq(keys.length, 7, '七位劫主/老道各需一个立绘 key');
    // 全部 key 必须能解析到实际文件（自绘或占位均可），否则战斗里会空白
    keys.forEach(k => t.ok(fs.existsSync(P(k)), '缺少立绘 assets/img/portrait/' + k + '.png'));
    // 自绘立绘：仅五劫前两劫 + 算命老道（劫3/4/5 与魔祖仙帝按用户要求作废，回落既有 5 档 BOSS 素材占位）
    const BESPOKE = ['boss_jie1', 'boss_jie2', 'npc_laodao'];
    const TIER_ART = ['boss_huang', 'boss_xuan', 'boss_di', 'boss_tian', 'boss_xian'];
    BESPOKE.forEach(k => t.ok(fs.existsSync(P(k)), '自绘立绘丢失：' + k));
    t.ok(BESPOKE.every(k => keys.indexOf(k) >= 0), '自绘立绘未被任何劫主引用');
    // 除自绘 3 张外，其余必须落在既有 5 档 BOSS 素材集合内（占位），不得再指向已作废的 key
    keys.filter(k => BESPOKE.indexOf(k) < 0).forEach(k => {
      t.ok(TIER_ART.indexOf(k) >= 0, '劫主立绘既非自绘也非既有素材占位：' + k);
    });
    // 已作废的四张不得再被引用
    ['boss_jie3', 'boss_jie4', 'boss_jie5', 'boss_dixian'].forEach(k => {
      t.ok(keys.indexOf(k) < 0, '已作废的立绘仍被引用：' + k);
      t.ok(!fs.existsSync(P(k)), '已作废的立绘文件未清理：' + k);
    });
    t.note('自绘 ' + BESPOKE.join('/') + '；占位 ' + [...new Set(keys.filter(k => BESPOKE.indexOf(k) < 0))].join('/'));
  });

  S.case('灾劫玉符：第 3 年坊市相遇，两幕线性剧情', (t) => {
    const om = OMEN_TALISMAN;
    t.eq(om.name, '灾劫玉符');
    t.eq(om.meetYear, 3, '相遇年份应为第 3 年');
    t.ok(!!om.portrait, '玉符剧情缺老道立绘');
    t.gte(om.meet.lines.length, 4, '第一幕（坊市相遇）剧情过短');
    t.ok(!om.meet.choices, '文案已改为线性，不应再保留分支选项');
    const aft = om.meet.after;
    t.ok(!!aft && Array.isArray(aft.lines), '缺第二幕（清醒之后）');
    t.gte(aft.lines.length, 6, '第二幕剧情过短');
    // {omen} 占位必须存在且唯一，否则识海黑字无处注入
    const holder = aft.lines.filter(l => l.indexOf('{omen}') >= 0);
    t.eq(holder.length, 1, '第二幕应有且仅有一行承载识海黑字（{omen} 占位）');
    // 玩家指定文案的关键信息点必须保留
    const all = om.meet.lines.concat(aft.lines).join('');
    [['笑眯眯的算命老道', '老道形象'], ['紫微斗数', '紫微斗数'], ['六壬正法', '六壬正法'],
     ['天机不可泄露', '天机不可泄露'], ['神念入侵', '神念入侵'], ['无影无踪', '老道消失'],
     ['正午', '天色变化'], ['神台识海', '玉符入识海'], ['魔气', '疑似魔气'],
     ['宗门', '宗门未检出'], ['变强的道心', '坚定道心']].forEach((kw) => {
      t.ok(all.indexOf(kw[0]) >= 0, '指定文案关键点丢失：' + kw[1] + '（' + kw[0] + '）');
    });
    t.ok(!!om.tick && !!om.tickNear && !!om.tickNow, '倒计时模板缺失');
    t.ok(!!om.afterAll && !!om.hiddenOpen, '尽渡/隐藏线文案缺失');
  });

  S.case('识海黑字逐年递减：还剩 N 年 → 近了 → 就是今年', (t) => {
    const s = fresh();
    t.eq(E.omenText(s), '', '未获玉符时不应显示黑字');
    E.grantOmen(s);
    t.eq(!!s.omen.got, true, 'grantOmen 未生效');
    t.eq(s.omen.cracks, 0, '初始裂纹应为 0');
    s.year = 3;  t.eq(E.omenText(s), '死劫还剩 15 年', '第 3 年倒计时错误');
    s.year = 10; t.eq(E.omenText(s), '死劫还剩 8 年', '第 10 年倒计时错误');
    s.year = 17; t.eq(E.omenText(s), '死劫还剩 1 年（近了）', '临劫年份提示错误');
    s.year = 18; t.eq(E.omenText(s), '就是今年', '当年提示错误');
    // 第 1 劫触发（UI 播放剧情时写入 seen）→ 指向第 36 年
    s.seen = s.seen || {};
    s.seen['death_18'] = 1;
    t.eq(E.omenText(s), '死劫还剩 18 年', '渡过第一劫后应指向第 36 年');
    s.year = 19; t.eq(E.omenText(s), '死劫还剩 17 年', '越过一劫后应指向第 36 年');
    t.eq(E.omenYearsLeft(s), 17, 'omenYearsLeft 计算错误');
  });

  S.case('每渡一劫玉符多一道裂纹，五劫尽渡转「飞升天劫·无期」', (t) => {
    const s = fresh();
    E.grantOmen(s);
    for (let i = 0; i < 4; i++) {
      E.omenOnDeathPassed(s, i);
      t.eq(s.omen.cracks, i + 1, '裂纹累加错误（第' + (i + 1) + '劫）');
      t.eq(!!s.omen.allPassed, false, '第' + (i + 1) + '劫后不应判定为尽渡');
    }
    E.omenOnDeathPassed(s, 4);
    t.eq(s.omen.cracks, 5, '五劫尽渡后裂纹应为 5');
    t.eq(!!s.omen.allPassed, true, '五劫尽渡未生效');
    s.year = 82;
    t.eq(E.omenText(s), '飞升天劫 · 无期', '尽渡后文案错误');
  });

  S.case('隐藏线解锁：仅需难度系数 ≥ 6（外加五劫尽渡的剧情前提）', (t) => {
    const s = fresh();
    E.grantOmen(s);
    for (let i = 0; i < 5; i++) E.omenOnDeathPassed(s, i);
    s.jie = 5;
    t.eq(E.omenHiddenReady(s), false, '5 劫难度不应解锁隐藏线');
    t.eq(E.omenText(s), '飞升天劫 · 无期', '未解锁时应维持「无期」');
    s.jie = 6;
    t.eq(E.omenHiddenReady(s), true, '6 劫难度应解锁隐藏线');
    t.eq(E.omenText(s), '轮回之外……', '解锁后玉符文案错误');
    E.openOmenHidden(s);
    t.eq(!!s.omen.hiddenOpen, true, 'openOmenHidden 未生效');
    t.eq(E.omenHiddenReady(s), false, '已开启后不应重复触发');
    // 未渡满五劫时即便难度达标也不开启（剧情前提）
    const s0 = fresh();
    E.grantOmen(s0);
    s0.jie = 6;
    t.eq(E.omenHiddenReady(s0), false, '未渡五劫时不应解锁');
  });

  S.case('渡劫劫境按突破档位映射（练气→筑基无劫）', (t) => {
    const ks = Object.keys(TRIB_TRIALS);
    t.eq(ks.length, 3, '渡劫档位应为 3 档（金丹/元婴/飞升）');
    ['金丹', '元婴', '飞升'].forEach(k => t.ok(ks.indexOf(k) >= 0, '缺少档位 ' + k));
    t.ok(ks.indexOf('炼气') < 0 && ks.indexOf('筑基') < 0, '练气→筑基不应有劫境');
    t.eq(TRIB_TRIALS['金丹'].stages.join(','), 'xinmo', '筑基→金丹应为心魔秘境');
    t.eq(TRIB_TRIALS['元婴'].stages.join(','), 'xinmo,tianjie', '金丹→元婴应为心魔+天劫');
    t.eq(TRIB_TRIALS['飞升'].stages.join(','), 'xinmo,guard,feisheng', '元婴→飞升应为心魔+仙界守卫+飞升天劫');
    Object.keys(TRIB_TRIALS).forEach(k => {
      const cfg = TRIB_TRIALS[k];
      t.gte((cfg.openLines || []).length, 1, k + ' 缺开场白');
      cfg.stages.forEach(st => t.ok(!!TRIB_BOSSES[st], k + ' 引用了不存在的劫身 ' + st));
    });
  });

  S.case('劫身角色卡完整且立绘可解析', (t) => {
    ['xinmo', 'tianjie', 'guard', 'feisheng'].forEach(k => {
      const b = TRIB_BOSSES[k];
      t.ok(!!b, '缺少劫身 ' + k);
      t.ok(!!b.name && !!b.title, k + ' 缺姓名/称号');
      t.gte((b.taunt || []).length, 1, k + ' 缺台词');
      const p = b.portrait === 'me' ? 'me' : b.portrait;
      t.ok(fs.existsSync(P(p)), k + ' 立绘不可解析: ' + b.portrait);
    });
    t.ok(!TRIB_BOSSES.xinmo.mechanic, '心魔不应带战斗机制（专属 xinmoSpec）');
    t.ok(!!TRIB_BOSSES.guard.mechanic, '守卫应带荆棘机制');
    t.ok(!!TRIB_BOSSES.feisheng.noFlee, '飞升天劫应禁止逃跑');
    // 心魔机制只能由 xinmoSpec 生成（扰神 suppress：概率令玩家空过一次出手）
    const xm = E.xinmoSpec(fresh());
    t.eq(xm.mechanic, 'suppress', '心魔机制应由 xinmoSpec 注入 suppress');
  });

  S.case('三类劫境均可启动（死劫 / 渡劫 / 隐藏线）', (t) => {
    // 死劫
    const a = fresh();
    let r = E.startTrial(a, 'death', { deathIdx: 0, dev: DEATH_EVENTS[0] });
    t.eq(!!r && r.ok, true, '死劫劫境启动失败');
    t.eq(a.adv.trial, 'death');
    t.ok(!!a.adv.map && !!a.adv.map.byId['boss'], '死劫劫境地图异常');
    t.eq(a.adv.trialBoss.name, DEATH_EVENTS[0].boss.name, '死劫劫主姓名不符');
    t.eq(a.adv.exploreMax, 1, '试炼不应有探索度门槛');
    // 渡劫
    const b = fresh();
    r = E.startTrial(b, 'trib', { trib: '元婴', stage: 'xinmo' });
    t.eq(!!r && r.ok, true, '渡劫劫境启动失败');
    t.eq(b.adv.trialBoss.name, TRIB_BOSSES.xinmo.name, '渡劫劫身不符');
    // 隐藏线
    const c = fresh();
    c.jie = 6;
    r = E.startTrial(c, 'hidden', {});
    t.eq(!!r && r.ok, true, '隐藏线劫境启动失败');
    t.eq(c.adv.trialBoss.name, HIDDEN_BOSS.boss.name, '隐藏线 BOSS 不符');
    t.ok(c.adv.trialBoss.atk > 0 && c.adv.trialBoss.hp > 0, '隐藏线 BOSS 数值非法');
  });

  S.case('死劫难度嵌入难度系数：jie 越高，劫主越强', (t) => {
    const weak = fresh(); weak.jie = 0;
    const boss0 = E.trialBossDeath(weak, 4);
    const hard = fresh(); hard.jie = 9;
    const boss9 = E.trialBossDeath(hard, 4);
    t.gt(boss9.atk, boss0.atk, '高难度下劫主攻击应更高');
    t.gt(boss9.hp, boss0.hp, '高难度下劫主血量应更高');
    // 五劫劫主强度应逐劫递增
    const a1 = E.trialBossDeath(weak, 0), a5 = E.trialBossDeath(weak, 4);
    t.gt(a5.atk * a5.hp, a1.atk * a1.hp, '第五劫应明显强于第一劫');
  });

  return S;
};
