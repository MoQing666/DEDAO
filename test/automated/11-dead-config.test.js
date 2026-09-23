/* DEDAO 自动化测试 —— 11 死配置实装（数据定义了但引擎从不读的字段）
 * 覆盖：
 *   旧命格 TALENTS.apply  —— tiMul / shenMul / dunMul / doubleHit / trib / growDun
 *   新命格 DESTINIES.effect —— techTypeBonus（万剑归宗）/ tribBonus / controlImmune
 *   旧命格 战斗向 —— critDmgBoost（致命一击）/ execute（一剑封喉）
 *   心法   —— reduceDmg（玄武真经减伤）/ craftTimeReduce（丹道真解缩短炼丹）
 *   法术   —— buff（atkUp/defUp/critUp）/ debuff（atkDown）/ stun / dotBurn / dotPoison / disaster / heal / mpRestore / lifesteal
 *   黄阶机制 —— 8 条黄阶法术挂载五大机制（2026-09-15）；无属性·剑气诀不挂；免控消耗 = min(3, 本档上限)
 * 口径铁律：这些字段此前只写在 data 里、引擎从不读取，等于玩家拿到手是「空命格/空法术」。
 */
const { Suite, createGameContext } = require('./_harness');

module.exports = async function build() {
  const S = new Suite('11 死配置实装（命格/心法/法术）');
  const G = createGameContext({ seed: 20260912 });
  const E = G.get('Engine');
  const T = G.get('TECHNIQUES');

  /* 清空一切外部加成，得到「裸体」状态，便于做精确等式断言 */
  function bare(name) {
    const s = E.startLife(name || '死配置校验');
    E.commitStart(s, 'wuxing');
    s.talents = []; s.destinies = []; s.arts = [];
    s.linggen = null;
    s.equip = { weapon: null, head: null, body: null, accessory: null, treasure: [] };
    s.array = { wuxing: {}, juling: { level: 0 } };
    s.sect = null; s.elixirs = {};
    s.dun = 0; s.dodgePct = 0; s.atkPct = 0; s.critPct = 0; s.earthPct = 0;
    s.ti = 0; s.shen = 0; s.dao = 0; s.dun = 0;
    E.refreshStats(s);
    return s;
  }

  /* 造一个「打不死的木桩」，并返回一次交战实际掉血 */
  function dummyFight(s, atk, hp) {
    s.hp = s.hpMax;
    E.combatStart(s, { name: '木桩', atk: atk, hp: hp || 1000000 });
    s.battle.hp = hp || 1000000;
    s.battle.hpMax = hp || 1000000;
    return s.battle;
  }

  /* ---------------------------------------------------------------- */
  /* 1. 旧命格 TALENTS.apply 六项全部实装                               */
  /* ---------------------------------------------------------------- */
  S.case('旧命格 apply 实装①：金刚不坏 tiMul（体魄对气血影响翻倍）', (t) => {
    const s = bare('金刚不坏');
    s.ti = 40;
    E.refreshStats(s);
    const hp0 = s.hpMax;
    t.eq(E.talentApply(s, 'tiMul'), 0, '未选命格时 tiMul 应为 0');
    s.talents = ['t_ti_amplify'];
    E.refreshStats(s);
    t.eq(E.talentApply(s, 'tiMul'), 2, '金刚不坏 tiMul=2');
    t.eq(s.hpMax - hp0, 40 * 50, '体魄 40 的系数 50 应翻倍为 100（+2000 气血）');
    t.note('calcHpMax: tiCoeff = 50 × 法宝tiHpBonus × talentApply(tiMul)');
  });

  S.case('旧命格 apply 实装②：天眼通 shenMul（神识对暴击率翻倍）', (t) => {
    const s = bare('天眼通');
    s.shen = 30;
    E.refreshStats(s);
    t.ok(Math.abs(E.getCritRate(s) - 0.30) < 1e-9, '无命格：暴击率 = 神识30×1% = 30%');
    s.talents = ['t_shen_amplify'];
    E.refreshStats(s);
    t.ok(Math.abs(E.getCritRate(s) - 0.60) < 1e-9, '天眼通：神识×1% 翻倍 = 60%');
  });

  S.case('旧命格 apply 实装③：风驰电掣 dunMul（遁速对闪避/额外攻击翻倍）', (t) => {
    const s = bare('风驰电掣');
    s.dun = 10;
    E.refreshStats(s);
    t.ok(Math.abs(E.getDodgeRate(s) - 0.20) < 1e-9, '无命格：闪避 = 遁速10×2% = 20%');
    t.ok(Math.abs(E.getExtraAtkChance(s) - 0.10) < 1e-9, '无命格：额外攻击 = 遁速10×1% = 10%');
    s.talents = ['t_dun_amplify'];
    E.refreshStats(s);
    t.ok(Math.abs(E.getDodgeRate(s) - 0.40) < 1e-9, '风驰电掣：闪避翻倍 = 40%');
    t.ok(Math.abs(E.getExtraAtkChance(s) - 0.20) < 1e-9, '风驰电掣：额外攻击翻倍 = 20%');
  });

  S.case('旧命格 apply 实装④：疾风连击 doubleHit（15% 追加攻击）', (t) => {
    const s = bare('疾风连击');
    s.dun = 10;
    E.refreshStats(s);
    s.talents = ['t_lianji'];
    E.refreshStats(s);
    t.eq(E.talentApply(s, 'doubleHit'), 0.15, '疾风连击 doubleHit=0.15');
    t.ok(Math.abs(E.getExtraAtkChance(s) - (0.10 + 0.15)) < 1e-9, '额外攻击 = 遁速1% + 疾风连击15% = 25%');
  });

  S.case('旧命格 apply 实装⑤：天命之子 trib（+25% 渡劫成功率）', (t) => {
    function tribTo(s, realmName) {
      for (let i = 0; i < 40; i++) {
        let inf = null;
        try { s.idx = i; inf = E.breakInfo(s); } catch (e) { return null; }
        if (!inf || !inf.st) return null;
        if (inf.mode === 'trib' && inf.trib === realmName) return inf;
      }
      return null;
    }
    const s = bare('天命之子');
    const plain = tribTo(s, '金丹');
    t.ok(!!plain, '应能定位「筑基→金丹」渡劫节点');
    s.talents = ['t_tianming'];
    const withT = tribTo(s, '金丹');
    t.ok(Math.abs((withT.base - plain.base) - 0.25) < 1e-9, '天命之子应把渡劫成功率基准 +25%');
    t.note('breakInfo.trib 段：base += s.tribPct + talentApply(trib) + 命格 tribBonus + 渡劫丹 + 宗门');
  });

  S.case('旧命格 apply 实装⑥：御风化影 growDun（每年遁速 +0.5，永久）', (t) => {
    const s = bare('御风化影');
    t.eq(E.talentApply(s, 'growDun'), 0, '校验前置：未选命格时 growDun = 0');
    s.talents = ['t_grow_dun'];
    t.eq(E.talentApply(s, 'growDun'), 0.5, '御风化影 growDun=0.5/年');
    const d0 = s.dun;
    E.endYear(s);
    // 第一年：0.5 未满 1，用浮点暂存，绝不因取整而丢弃
    t.eq(s.dun, d0, '第 1 年不足以进位，遁速本体不变');
    t.ok(Math.abs((s.dunGrowAcc || 0) - 0.5) < 1e-9, '第 1 年应暂存 0.5 遁速（不被取整吃掉）');
    E.endYear(s);
    t.eq(s.dun - d0, 1, '第 2 年累计满 1，遁速 +1');
    t.ok(Math.abs(s.dunGrowAcc || 0) < 1e-9, '进位后暂存清零');
  });

  /* ---------------------------------------------------------------- */
  /* 2. 新命格 DESTINIES.effect：noElemSpellMul / swordCritRate / tribBonus */
  /* ---------------------------------------------------------------- */
  S.case('新命格 effect：万剑归宗 noElemSpellMul / swordCritRate（无属性剑法 +50% 伤害 / +50% 暴击）', (t) => {
    // ⚠ 用独立上下文：本用例要跑 120 次施法，会大量消耗随机数流；
    //   若复用套件共享的 E，会改变后续用例（眩晕 stun 等）的确定性随机结果。
    const G2 = createGameContext({ seed: 20260914 });
    const E2 = G2.get('Engine');
    const bare2 = function () {
      const s = E2.startLife('万剑归宗');
      E2.commitStart(s, 'wuxing');
      s.talents = []; s.destinies = []; s.arts = []; s.linggen = null;
      s.equip = { weapon: null, head: null, body: null, accessory: null, treasure: [] };
      s.array = { wuxing: {}, juling: { level: 0 } };
      s.sect = null; s.elixirs = {};
      s.dun = 0; s.dodgePct = 0; s.atkPct = 0; s.critPct = 0; s.earthPct = 0;
      s.ti = 0; s.shen = 0; s.dao = 0;
      s.ling = 100;                            // 让 atk 由灵力主导，隔离「命格+3神识」带来的 atk 抬升
      E2.refreshStats(s);
      return s;
    };
    // 单次释放剑气诀（element:'无'，青云剑宗剑法），返回 { 掉血, 是否真暴击 }
    const castJianqi = function (destinies, times) {
      const s = bare2();
      s.destinies = destinies;
      E2.refreshStats(s);
      const out = [];
      for (let i = 0; i < times; i++) {
        s.mp = 9999;
        s.hp = s.hpMax;
        E2.combatStart(s, { name: '木桩', atk: 1, hp: 1000000 });
        s.battle.hp = 1000000; s.battle.hpMax = 1000000;
        const before = s.battle.hp;
        const r = E2.combatAct(s, 'spell', 'jianqi');
        out.push({
          dmg: before - s.battle.hp,
          // 真暴击战报只有两种（与「法术附带 critUp 暴击率+8%」的增益行区分开）
          crit: (r.lines || []).some(function (l) { return /暴击！|暴击连击/.test(l); })
        });
      }
      return out;
    };
    const avg = function (arr) { return arr.reduce(function (a, x) { return a + x.dmg; }, 0) / arr.length; };

    // 数值口径：字段确实被引擎读到
    t.eq(E2.getDestinyBonus({ destinies: ['wanjian'] }, 'noElemSpellMul'), 0.5, '万剑归宗 noElemSpellMul = 0.5');
    t.eq(E2.getDestinyBonus({ destinies: ['wanjian'] }, 'swordCritRate'), 0.5, '万剑归宗 swordCritRate = 0.5');

    // 行为：无属性剑法伤害至少 ×1.5（atk 抬升只占 ~3%，不足以解释 1.45 倍）
    const N = 60;
    const baseArr = castJianqi([], N), upArr = castJianqi(['wanjian'], N);
    const a0 = avg(baseArr), a1 = avg(upArr);
    t.ok(a0 > 0, '无命格时剑气诀应造成伤害');
    t.ok(a1 >= a0 * 1.45, '万剑归宗应令剑法伤害 ≥ +50%（均值 ' + a0.toFixed(1) + ' → ' + a1.toFixed(1) + '）');

    // 行为：剑法暴击率显著提升（基础 ≈ 剑气诀自身 critUp 8%，命格再 +50%）
    const c0 = baseArr.filter(function (x) { return x.crit; }).length / N;
    const c1 = upArr.filter(function (x) { return x.crit; }).length / N;
    t.ok(c1 - c0 > 0.25, '万剑归宗应显著提高剑法暴击率（' + Math.round(c0 * 100) + '% → ' + Math.round(c1 * 100) + '%）');
    t.note('无属性（青云剑宗剑法：剑气诀/万剑归宗/破天一击）在 combatAct 法术分支 ×(1+noElemSpellMul)，并经 playerHit 的 extraCrit 叠加 swordCritRate');
  });

  S.case('新命格 effect：天命之子 tribBonus（+15% 渡劫成功率）', (t) => {
    function tribTo(s, realmName) {
      for (let i = 0; i < 40; i++) {
        let inf = null;
        try { s.idx = i; inf = E.breakInfo(s); } catch (e) { return null; }
        if (!inf || !inf.st) return null;
        if (inf.mode === 'trib' && inf.trib === realmName) return inf;
      }
      return null;
    }
    const s = bare('天命 tribBonus');
    const plain = tribTo(s, '金丹');
    s.destinies = ['tianming2'];
    const boosted = tribTo(s, '金丹');
    t.eq(E.getDestinyBonus(s, 'tribBonus'), 0.15, '天命之子（新命格）effect.tribBonus = 0.15，不再被 type 限制挡住');
    // 实测差值 = tribBonus 0.15 + 该命格 attr.dao(3) 带来的道心渡劫加成 0.03
    t.ok(Math.abs((boosted.base - plain.base) - 0.18) < 1e-9,
      '渡劫基准应 +18%（tribBonus 15% + 道心 3 点×1%），实测 +' + Math.round((boosted.base - plain.base) * 100) + '%');
    t.note('命格 attr.dao 与 effect.tribBonus 两条都生效，且都汇总进 breakInfo.base');
  });

  S.case('新命格 effect：厚土之体 defMul（绿阶·type:attr 的防御 +5% 不再被 type 限制挡死）', (t) => {
    const s = bare('厚土 defMul');
    t.eq(E.getDestinyAttrMult(s, 'def'), 1.0, '无命格：防御倍率基准确为 1.0');
    const def0 = E.getDefense(s);
    s.destinies = ['houtu'];
    E.refreshStats(s);
    // 核心回归点：type:'attr' 命格携带的 defMul 必须被读取（此前被 type==='combat' 限制挡死 = 永远 1.0）
    t.ok(Math.abs(E.getDestinyAttrMult(s, 'def') - 1.05) < 1e-9,
      '厚土之体（type:attr）effect.defMul:0.05 必须生效，不再被 type 限制挡死（实际 ' + E.getDestinyAttrMult(s, 'def') + '）');
    // 面板防御应高于无命格时（厚土之体 ti+2 与 defMul 5% 同向抬升防御）
    t.ok(E.getDefense(s) > def0, '面板防御应高于无命格时（' + def0 + ' → ' + E.getDefense(s) + '）');
    // 不污染其他倍率通道
    t.eq(E.getDestinyAttrMult(s, 'atk'), 1.0, '厚土之体不影响 atkMul 通道');
    t.note('与 09-18 修掉的 tribBonus（天命之子/天道宠儿，同为 type:attr）同类：getDestinyAttrMult 去掉 type===\'combat\' 限制');
  });

  /* ---------------------------------------------------------------- */
  /* 3. 旧命格战斗向：critDmgBoost / execute                            */
  /* ---------------------------------------------------------------- */
  S.case('旧命格战斗向①：致命一击 critDmgBoost（暴击 200%→300%）', (t) => {
    const s = bare('致命一击');
    s.shen = 100;                                  // 暴击率 100%，排除随机
    s.destinies = []; s.talents = [];
    E.refreshStats(s);
    t.gte(E.getCritRate(s), 1, '校验前置：暴击率 ≥ 100%');
    const atk = s.atk;

    dummyFight(s, 1, 1000000);
    E.combatAct(s, 'atk');
    const d0 = 1000000 - s.battle.hp;
    t.eq(d0, Math.round(atk * 2), '未选命格：暴击伤害 = 攻击×200%');

    s.talents = ['t_baoji_boost'];
    E.refreshStats(s);
    t.eq(E.talentApply(s, 'critDmgBoost'), 1.0, '致命一击 critDmgBoost=1.0');
    const atk2 = s.atk;
    dummyFight(s, 1, 1000000);
    E.combatAct(s, 'atk');
    const d1 = 1000000 - s.battle.hp;
    t.eq(d1, Math.round(atk2 * 3), '致命一击：暴击伤害 = 攻击×300%');
  });

  S.case('旧命格战斗向②：一剑封喉 execute（气血<20% 直接斩杀）', (t) => {
    const s = bare('一剑封喉');
    s.shen = 0;
    s.talents = ['t_zhanmie'];
    E.refreshStats(s);
    t.eq(E.talentApply(s, 'execute'), 0.20, '一剑封喉 execute=0.20');

    // 气血 15% → 直接斩杀
    dummyFight(s, 1, 1000);
    s.battle.hp = 150; s.battle.hpMax = 1000;
    const r1 = E.combatAct(s, 'atk');
    t.eq(s.battle.hp, 0, '气血 15%（<20%）应被一剑封喉直接斩杀');
    t.ok(s.battle.win, '斩杀应立即判胜');
    t.ok(r1.lines.join('|').indexOf('一剑封喉') >= 0, '战报应出现「一剑封喉」');

    // 气血 25% → 不触发斩杀，走正常伤害
    const s2 = bare('一剑封喉·未触发');
    s2.shen = 0;
    s2.talents = ['t_zhanmie'];
    E.refreshStats(s2);
    dummyFight(s2, 1, 1000);
    s2.battle.hp = 250; s2.battle.hpMax = 1000;
    E.combatAct(s2, 'atk');
    t.lt(s2.battle.hp, 250, '气血 25% 应受正常伤害');
    t.gt(s2.battle.hp, 0, '气血 25%（>20%）不应被斩杀');
    t.note('与命格 executeBonus（气血<30% 提升伤害）区分：execute 是阈值以内直接斩杀');
  });

  /* ---------------------------------------------------------------- */
  /* 4. 心法：reduceDmg（减伤） / craftTimeReduce（缩短炼丹）            */
  /* ---------------------------------------------------------------- */
  S.case('心法①：玄武真经 反伤(thorns) 替代减伤，guard 常驻减伤通道', (t) => {
    const s = bare('玄武减伤');
    s.equip.body = { id: 'tie_jia', aff: [] };      // 铁甲 def = 18
    E.refreshStats(s);
    const defAbs = E.getDefense(s);
    const enemyAtk = 100;

    // 基准：受击 = 100 - 18 = 82
    dummyFight(s, enemyAtk, 1000000);
    let base = null;
    for (let i = 0; i < 5 && !s.battle.done; i++) {
      s.hp = s.hpMax;
      const b0 = s.battle.hpLost;
      E.combatAct(s, 'atk');
      const d = s.battle.hpLost - b0;
      if (d > 0) { base = d; break; }
    }
    t.eq(base, enemyAtk - defAbs, '校验前置：基准受击 = 敌atk - 面板防御 = 82');

    // 装玄武真经（v5：移除 reduceDmg，改 thorns 0.15 反伤；guard 0.20 常驻减伤）→ 100×0.80 = 80 - 18 = 62
    s.techs = ['xt_xinfa4'];
    s.techEquip = { xinfa: 'xt_xinfa4', shufa: [], dunshu: null };
    E.refreshStats(s);
    t.eq(E.getXinfaThorns(s), 0.15, '玄武真经 thorns = 0.15（v5 反伤替代减伤）');
    t.eq(E.getXinfaGuard(s), 0.20, '玄武真经 guard = 0.20（玄天门系常驻减伤）');
    t.eq(E.getXinfaHpMax(s), 150, '玄武真经 hpMax = +150');
    dummyFight(s, enemyAtk, 1000000);
    const b0 = s.battle.hpLost;
    for (let i = 0; i < 5 && !s.battle.done; i++) {
      s.hp = s.hpMax;
      const bb = s.battle.hpLost;
      E.combatAct(s, 'atk');
      const d = s.battle.hpLost - bb;
      if (d > 0) {
        t.eq(d, Math.max(1, Math.round(enemyAtk * 0.80) - defAbs), '心法常驻减伤 20%（仅 guard，reduceDmg 已移除）= 80-18=62');
        break;
      }
    }
    t.ok(s.battle.hpLost - b0 >= 0, '受击统计应正常累加');
  });

  S.case('心法②：丹道真解 craftTimeReduce（炼丹时间 -1 年）', (t) => {
    const s = bare('丹道真解');
    s.techs = ['dx_xinfa3'];
    s.techEquip = { xinfa: 'dx_xinfa3', shufa: [], dunshu: null };
    E.refreshStats(s);
    t.eq(E.getXinfaCraftReduce(s, '丹'), 1, '丹道真解：炼丹 -1 年');
    t.eq(E.getXinfaCraftReduce(s, '装备'), 0, '丹道真解不减炼器时间');

    // 集成：zhuji_pill 原始 3 年 → 实排 2 年
    s.materials = { herb_xuan: 10 };
    const reincReduce = (s.reinc && s.reinc.alchemyTimeReduce) || 0;
    const r = E.startCraft(s, 'zhuji_pill');
    t.eq(r.ok, true, '材料充足，应能开始炼制');
    const job = s.craftQueue[s.craftQueue.length - 1];
    t.eq(job.endYear - s.year, Math.max(0, 3 - reincReduce - 1), '实际排期应缩短 1 年（3→2）');
    t.note('startCraft: craftYears = max(0, 原年数 - 丹药/炼器轮回天赋 - getXinfaCraftReduce)');
  });

  S.case('心法③：宗门心法 atkSpd（青云）/ spellMul / hpMax（玄天）全部实装', (t) => {
    const s = bare('宗门心法');
    s.techs = ['qy_xinfa4'];                        // 太虚剑典（v5）：atkSpd 0.20、spellMul 0.10（攻击%已改为攻速%）
    s.techEquip = { xinfa: 'qy_xinfa4', shufa: [], dunshu: null };
    E.refreshStats(s);
    t.eq(E.getXinfaAtkSpd(s), 0.20, '太虚剑典 atkSpd = 0.20（v5 攻速替代攻击%）');
    t.eq(E.getXinfaSpellMul(s), 0.10, '太虚剑典 spellMul = 0.10');
    const atkSpdWith = E.getExtraAtkChance(s);
    s.techs = []; s.techEquip = { xinfa: null, shufa: [], dunshu: null };
    E.refreshStats(s);
    const atkSpdWithout = E.getExtraAtkChance(s);
    // 攻速转化为额外出手几率（v5：青云剑宗攻击% → 攻速%）
    t.ok(Math.abs(atkSpdWith - atkSpdWithout - 0.20) < 1e-6, '心法 atkSpd 应转化为额外出手几率（+20%）');

    // 玄天门系 hpMax：玄武真经 +150（守护/天罡心法依次 +50/+100）
    const s2 = bare('玄天心法');
    const hp0 = s2.hpMax;
    s2.techs = ['xt_xinfa2'];                       // 护山心经 hpMax 50、guard 0.10
    s2.techEquip = { xinfa: 'xt_xinfa2', shufa: [], dunshu: null };
    E.refreshStats(s2);
    t.eq(E.getXinfaHpMax(s2), 50, '护山心经 hpMax = +50');
    t.eq(E.getXinfaGuard(s2), 0.10, '护山心经 guard = 0.10');
    t.eq(s2.hpMax - hp0, 50, '心法固定气血应计入气血上限');
    t.note('宗门心法附加效果（青云剑宗 atkSpd/spellMul、玄天门 guard/hpMax/thorns、丹霞谷 spellMul）此前全是死配置，v5 已接通：青云由攻击%改为攻速%、玄天门增反伤');
  });

  /* ---------------------------------------------------------------- */
  /* 5. 法术 buff / debuff / stun / DoT / disaster / heal                */
  /* ---------------------------------------------------------------- */
  S.case('法术①：回血类法术 heal 生效（木灵治愈 15% 气血上限 · 治愈已减半）', (t) => {
    const s = bare('木灵治愈');
    s.techs = ['muyuling'];
    s.techEquip = { xinfa: null, shufa: ['muyuling'], dunshu: null };
    E.refreshStats(s);
    dummyFight(s, 0, 1000000);                  // 敌方攻击 0，排除反击掉血干扰
    s.mp = 300;                                 // 灵力充足：木灵治愈新版耗蓝 50，确保可施展
    s.hp = 1;                                   // 压到极低，确保回复不被「满血上限」封顶
    const hpMax = s.hpMax;
    E.combatAct(s, 'spell', 'muyuling');
    t.eq(s.hp - 1, Math.round(hpMax * 0.15), '木灵治愈应回复 15% 气血上限（原 30% 减半）');
    t.note('治愈类全部减半：木灵治愈 0.15 / 水灵术 0.125 / 生机盎然 0.25 / 万木回春 0.40');
  });

  S.case('法术②：防御类 buff defUp 生效（岩甲术 -40% 受击）', (t) => {
    const s = bare('岩甲术');
    s.equip.body = { id: 'tie_jia', aff: [] };     // def 18
    E.refreshStats(s);
    const defAbs = E.getDefense(s);
    const enemyAtk = 200;
    s.techs = ['yanjia'];
    s.techEquip = { xinfa: null, shufa: ['yanjia'], dunshu: null };
    E.refreshStats(s);
    dummyFight(s, enemyAtk, 1000000);
    s.mp = 300;                                 // 灵力充足：岩甲术新版耗蓝 50
    E.combatAct(s, 'spell', 'yanjia');
    // 施法当回合的敌方回击即应吃到护盾：200×0.6 = 120 - 18 = 102
    t.eq(s.battle.hpLost, Math.round(enemyAtk * 0.6) - defAbs, '岩甲术 -40% 应在施法当回合即生效');
    t.note('applySpellFx 在 counter() 之前结算，护盾当回合生效');
  });

  S.case('法术③：藤蔓术 lifesteal 吸血生效（本次伤害 30% 转气血）', (t) => {
    const s = bare('藤蔓术');
    s.techs = ['tengman'];
    s.techEquip = { xinfa: null, shufa: ['tengman'], dunshu: null };
    E.refreshStats(s);
    dummyFight(s, 0, 1e9);                  // 敌攻 0（反击仅 1 点），气血极高避免被击杀
    s.mp = 300;                             // 灵力充足：藤蔓术新版耗蓝 30
    s.hp = Math.max(20, s.hpMax - 50);        // 留出回血空间，且足够扛住敌方反击（1 点）
    const hpBefore = s.hp;
    const enemyBefore = s.battle.hp;
    E.combatAct(s, 'spell', 'tengman');
    const dmgDealt = enemyBefore - s.battle.hp;
    const expHeal = Math.round(dmgDealt * 0.30);
    t.ok(dmgDealt > 0, '藤蔓术应造成正伤害（实际 ' + dmgDealt + '）');
    t.eq(s.hp, hpBefore + expHeal - s.battle.hpLost, '藤蔓术：吸血=本次伤害30%，再扣敌方反击（hpLost=' + s.battle.hpLost + '）');
    t.eq(s.battle.fxAtkDown.amt, 0, '重写后藤蔓术不再带 atkDown debuff');
  });

  S.case('法术⑤：金系暴击增益 critUp 生效（金刃术 暴击率 +8% / 2 回合）', (t) => {
    const s = bare('金刃术');
    s.techs = ['jinren'];
    s.techEquip = { xinfa: null, shufa: ['jinren'], dunshu: null };
    E.refreshStats(s);
    dummyFight(s, 0, 1e9);
    s.mp = 300;                             // 灵力充足：金刃术新版耗蓝 40
    E.combatAct(s, 'spell', 'jinren');
    t.eq(s.battle.fxCritUp.amt, 8, '金刃术应挂 fxCritUp.amt=8');
    t.eq(s.battle.fxCritUp.turns, 1, '金刃术 fxCritUp 持续 2 回合：本回合生效、回合末 tick 递减为 1（仍覆盖下一回合）');
    t.eq(s.battle.fxAtkDown.amt, 0, '金刃术不带 atkDown');
    t.eq(s.battle.fxAtkUp.amt, 0, '金刃术不带 atkUp');
  });

  S.case('法术⑥：水系回灵 mpRestore 生效（水弹术 回复灵力上限 10%）', (t) => {
    const s = bare('水弹术');
    s.techs = ['shuidan'];
    s.techEquip = { xinfa: null, shufa: ['shuidan'], dunshu: null };
    E.refreshStats(s);
    const mpMax = s.mpMax;
    dummyFight(s, 0, 1e9);
    s.mp = 50;                              // ≥ 消耗 35（水弹术新版耗蓝），且留出回灵空间（不被封顶）
    E.combatAct(s, 'spell', 'shuidan');
    t.eq(s.mp, 50 - 35 + Math.round(mpMax * 0.10), '水弹术：先扣 35 灵力，再回灵力上限 10%');
    t.eq(s.battle.fxCritUp.amt, 0, '水弹术不带 critUp');
  });

  S.case('新机制①：眩晕 stun（裂地诀 概率命中 → 敌方下回合无法行动）', (t) => {
    // ⚠ 必须 stub「沙箱内」的 Math：引擎在 vm 沙箱里跑，用的是沙箱自己的 Math，
    //   直接改宿主 Node 的 Math.random 对引擎无效（旧写法一直空转，靠随机数运气过关，
    //   2026-09-14 因随机流位置变动而暴露 → 改为 stub 沙箱 Math，用例真正确定化）。
    const SMath = G.get('Math');
    const realRandom = SMath.random;
    function castLieDi(forceHit) {
      const s = bare('裂地诀');
      s.ling = 200;                                  // 抬升灵力上限，确保 55 点消耗必能施展
      E.refreshStats(s);
      s.techs = ['lie_di'];
      s.techEquip = { xinfa: null, shufa: ['lie_di'], dunshu: null };
      E.refreshStats(s);
      dummyFight(s, 100, 1000000);
      s.mp = s.mpMax;
      SMath.random = () => (forceHit ? 0 : 0.99);     // 0 < 20% 命中；0.99 > 20% 未中
      const r = E.combatAct(s, 'spell', 'lie_di');
      SMath.random = realRandom;
      return { s: s, lines: r.lines.join('|') };
    }
    const hit = castLieDi(true);
    t.ok(hit.lines.indexOf('眩晕生效') >= 0, '命中时战报应出现「眩晕生效」');
    t.eq(hit.s.battle.hpLost, 0, '敌方被眩晕，本回合未能反击，玩家不掉血');
    const miss = castLieDi(false);
    t.ok(miss.lines.indexOf('未被眩晕命中') >= 0, '未命中时应提示「未被眩晕命中」');
    t.gt(miss.s.battle.hpLost, 0, '未命中眩晕则敌方正常反击，玩家掉血');
  });

  S.case('新机制②：灼烧 dotBurn（烈火焚 每施法叠层，每回合 1 层扣当前生命 10%）', (t) => {
    const s = bare('烈火焚');
    s.ling = 200;
    E.refreshStats(s);
    s.techs = ['lie_huo'];
    s.techEquip = { xinfa: null, shufa: ['lie_huo'], dunshu: null };
    E.refreshStats(s);
    dummyFight(s, 0, 100000);
    s.mp = s.mpMax;
    E.combatAct(s, 'spell', 'lie_huo');
    t.eq(s.battle.dotBurn, 1, '烈火焚（玄级）叠 1 层灼烧');
    const hpAfterCast = s.battle.hp;
    E.combatAct(s, 'guard');                          // 次回合开始结算持续伤害
    t.eq(s.battle.dotBurn, 0, '灼烧结算后层数 -1 → 0');
    const dealt = hpAfterCast - s.battle.hp;
    t.ok(Math.abs(dealt - Math.round(hpAfterCast * 0.10)) <= 2, '扣血 ≈ 当前生命 10%（实扣 ' + dealt + '）');
  });

  S.case('新机制③：中毒 dotPoison 与灼烧独立 —— 同回合各扣一次，不叠加成 20%', (t) => {
    const s = bare('双DoT');
    dummyFight(s, 0, 100000);
    s.battle.dotBurn = 2;
    s.battle.dotPoison = 3;
    const hp0 = s.battle.hp;
    E.combatAct(s, 'guard');
    t.eq(s.battle.dotBurn, 1, '灼烧每回合仅 -1 层（2→1）');
    t.eq(s.battle.dotPoison, 2, '中毒每回合仅 -1 层（3→2）');
    const tick1 = Math.round(hp0 * 0.10);
    const tick2 = Math.round((hp0 - tick1) * 0.10);
    t.eq(hp0 - s.battle.hp, tick1 + tick2, '两类 DoT 同回合各扣一次（' + tick1 + ' + ' + tick2 + '）');
  });

  S.case('新机制④：DoT / 伐灾 叠层上限按阶（黄1 / 玄2 / 地4 / 天8）', (t) => {
    t.eq(E.dotCapByGrade('黄'), 1, '黄级叠层上限 1（2026-09-15 黄阶挂机制后新增）');
    t.eq(E.dotCapByGrade('玄'), 2, '玄级叠层上限 2');
    t.eq(E.dotCapByGrade('地'), 4, '地级叠层上限 4');
    t.eq(E.dotCapByGrade('天'), 8, '天级叠层上限 8');
    t.eq(E.dotCapByGrade(undefined), 1, '非四阶取值回落 1（保持旧版 else 兜底行为）');
  });

  S.case('新机制⑤：伐灾 disaster（叠层 · 净化自身毒灼 · 免控按阶取小）', (t) => {
    const s = bare('伐灾');
    s.ling = 200;
    E.refreshStats(s);
    s.techs = ['po_e'];
    s.techEquip = { xinfa: null, shufa: ['po_e'], dunshu: null };
    E.refreshStats(s);
    dummyFight(s, 0, 100000);
    s.mp = s.mpMax;
    E.combatAct(s, 'spell', 'po_e');
    t.eq(s.battle.disasterStacks, 1, '破厄诀（玄级）叠 1 层伐灾');
    t.eq(s.battle.disasterTurns, 2, '伐灾每栈 3 回合：施法时置 3，本回合结束 tickBattleFx 递减 → 2');
    t.eq(s.battle.disasterCap, 2, '玄级施法后记录本档上限 2（决定免控消耗）');
    // 净化：先给自身挂上毒/灼，再施放伐灾应清空
    s.battle.pDotBurn = 2; s.battle.pDotPoison = 2;
    s.mp = s.mpMax;
    E.combatAct(s, 'spell', 'po_e');
    t.eq(s.battle.pDotBurn, 0, '伐灾应净化自身灼烧');
    t.eq(s.battle.pDotPoison, 0, '伐灾应净化自身中毒');
    t.eq(s.battle.disasterStacks, 2, '二次施法叠至 2 层（玄级上限）');

    // 免控消耗 = min(基准 3, 本档上限)：黄/玄 从「不可达」变可达，地/天 不变，无 cap 回落 3
    t.eq(E.disasterImmuneCost({ disasterCap: 1 }), 1, '黄阶（上限 1）免控消耗 1 层');
    t.eq(E.disasterImmuneCost({ disasterCap: 2 }), 2, '玄阶（上限 2）免控消耗 2 层');
    t.eq(E.disasterImmuneCost({ disasterCap: 4 }), 3, '地阶（上限 4）免控消耗仍为 3 层');
    t.eq(E.disasterImmuneCost({ disasterCap: 8 }), 3, '天阶（上限 8）免控消耗仍为 3 层');
    t.eq(E.disasterImmuneCost({}), 3, '无 cap 记录（旧存档 / 手工置层）回落基准 3 层');

    // ⚠ 必须 stub「沙箱内」的 Math（引擎跑在 vm 沙箱里，改宿主 Math 无效）
    const SMath = G.get('Math');
    const realRandom = SMath.random;
    SMath.random = () => 0;                            // 强制控制判定命中

    // 玄级：本局已记录 cap=2 → 2 层即可免控
    s.battle.disasterStacks = 2; s.battle.pStunNext = false;
    const immune = E.applyPlayerControl(s, s.battle, 1.0);
    t.eq(immune, false, '玄阶伐灾 2 层应免控（不被控）');
    t.eq(s.battle.disasterStacks, 0, '免控消耗 2 层灾厄');
    t.eq(s.battle.pStunNext, false, '免控时不应置玩家被控标记');

    // 黄级：cap=1 → 1 层即可免控（旧版固定 3 层，黄阶上限 1 永远摸不到免控）
    s.battle.disasterCap = 1; s.battle.disasterStacks = 1; s.battle.pStunNext = false;
    const immuneHuang = E.applyPlayerControl(s, s.battle, 1.0);
    t.eq(immuneHuang, false, '黄阶伐灾 1 层应免控（旧版需 3 层 → 不可达）');
    t.eq(s.battle.disasterStacks, 0, '免控消耗 1 层灾厄');

    // 无 cap 记录：回落 3 层 → 2 层不足以免控（保住旧存档行为）
    s.battle.disasterCap = 0; s.battle.disasterStacks = 2; s.battle.pStunNext = false;
    const controlledNoCap = E.applyPlayerControl(s, s.battle, 1.0);
    t.eq(controlledNoCap, true, '无 cap 记录时 2 层不足以免控（回落阈值 3）');
    t.eq(s.battle.pStunNext, true, '被控时置 pStunNext（玩家下回合无法行动）');

    // 灾厄不足阈值则正常被控（双向入口）
    s.battle.disasterCap = 4; s.battle.disasterStacks = 2; s.battle.pStunNext = false;
    const controlled = E.applyPlayerControl(s, s.battle, 1.0);
    SMath.random = realRandom;
    t.eq(controlled, true, '灾厄不足（地阶 2 < 3）应被控');
    t.eq(s.battle.pStunNext, true, '被控时置 pStunNext（玩家下回合无法行动）');
  });

  /* ---------------------------------------------------------------- */
  /* 6. 黄阶法术挂载五大机制（2026-09-15：机制线由「五机制 × 三阶」扩为 × 四阶） */
  /* ---------------------------------------------------------------- */
  const HUANG_MECH = ['stun', 'dotBurn', 'dotPoison', 'disaster'];

  S.case('黄阶机制①：8 条法术逐一挂载字段（无属性·剑气诀必须不挂）', (t) => {
    const want = {
      jinren:    { disaster: 1 },   // 金 → 伐灾
      leiyin:    { disaster: 1 },   // 金 → 伐灾
      huoqiu:    { dotBurn: 1 },    // 火 → 灼烧
      yuhuo:     { dotBurn: 1 },    // 火 → 灼烧
      shuidan:   { stun: 0.10 },    // 水 → 冻结（复用 stun 字段）
      hanshuang: { stun: 0.10 },    // 水 → 冻结
      luoshi:    { stun: 0.10 },    // 土 → 眩晕
      tengman:   { dotPoison: 1 },  // 木 → 中毒
    };
    Object.keys(want).forEach((id) => {
      const sp = T[id];
      t.ok(!!sp, '法术 ' + id + ' 应存在于 TECHNIQUES');
      t.eq(sp.grade, '黄', id + ' 应为黄阶');
      Object.keys(want[id]).forEach((k) =>
        t.eq(sp[k], want[id][k], id + ' 的 ' + k + ' 应为 ' + want[id][k]));
    });
    // 机制与五行必须一一对应，不得串味
    t.eq(T.jinren.element, '金', '金刃术 金 → 伐灾');
    t.eq(T.huoqiu.element, '火', '火球术 火 → 灼烧');
    t.eq(T.shuidan.element, '水', '水弹术 水 → stun 字段（水→冻结文案）');
    t.eq(T.luoshi.element, '土', '落石术 土 → stun 字段（土→眩晕文案）');
    t.eq(T.tengman.element, '木', '藤蔓术 木 → 中毒');
    // 剑气诀：无属性（青云剑宗），不参与五行机制 —— 与万剑归宗 / 破天一击同口径
    HUANG_MECH.forEach((k) =>
      t.ok(T.jianqi[k] === undefined, '剑气诀（无属性）不得有 ' + k));
    // 全表普查：无属性黄阶法术一律不带机制；stun 必须是 (0,1] 合法概率
    Object.keys(T).forEach((id) => {
      const sp = T[id];
      if (sp.grade !== '黄') return;
      if (sp.element === '无') {
        HUANG_MECH.forEach((k) =>
          t.ok(sp[k] === undefined, '无属性黄阶法术 ' + id + ' 不应带 ' + k));
      }
      if (sp.stun !== undefined) {
        t.ok(sp.stun > 0 && sp.stun <= 1, id + ' 的 stun 应是 (0,1] 概率，实为 ' + sp.stun);
      }
    });
    t.note('黄阶机制档位：眩晕/冻结 10%，DoT/伐灾 叠 1 层、上限 1（均取四阶最低档，避免反超玄阶纯机制法术）');
  });

  S.case('黄阶机制②：DoT / 伐灾 叠层被黄阶上限 1 夹住（玄阶仍为 2）', (t) => {
    const s = bare('黄阶上限');
    const b = dummyFight(s, 0, 1000000);
    const out = [];
    // 直接调 applySpellFx 现算，避开 tickDot 在回合开始 -1 层的干扰
    b.dotBurn = 5; b.dotPoison = 5; b.disasterStacks = 5;
    E.applySpellFx(s, b, T.huoqiu, out);
    t.eq(b.dotBurn, 1, '火球术（黄，上限 1）施法后灼烧被夹到 1（旧值 5 + 1 → 1）');
    E.applySpellFx(s, b, T.tengman, out);
    t.eq(b.dotPoison, 1, '藤蔓术（黄，上限 1）施法后中毒被夹到 1');
    E.applySpellFx(s, b, T.jinren, out);
    t.eq(b.disasterStacks, 1, '金刃术（黄，上限 1）施法后伐灾被夹到 1');
    t.eq(b.disasterCap, 1, '金刃术记录本档上限 1 → 免控消耗 1 层');
    // 对照：玄阶同类法术上限 2，证明「夹到 1」是黄阶档位而非全局行为
    b.dotBurn = 5;
    E.applySpellFx(s, b, T.lie_huo, out);
    t.eq(b.dotBurn, 2, '对照：烈火焚（玄，上限 2）同样是 5 + 1 → 2（黄阶夹 1 是档位差异）');
    t.note('黄阶 DoT/伐灾 每施法叠 1 层 → 单次施法烧 1 回合即退；想叠层需上玄阶');
  });

  S.case('黄阶机制③：水弹术（水）确定性命中 → 冻结（stun 字段 + 水系文案）', (t) => {
    const SMath = G.get('Math');           // ⚠ 必须 stub 沙箱 Math，改宿主 Math 对引擎无效
    const realRandom = SMath.random;
    // ① 纯落效果：直接调 applySpellFx，不经回合推进 —— 否则 stunNext 会在敌方跳过行动后被消耗掉
    const s0 = bare('黄阶冻结·落效果');
    const b0 = dummyFight(s0, 0, 1000000);
    const out0 = [];
    SMath.random = () => 0;                // 0 < 10% → 必中
    E.applySpellFx(s0, b0, T.shuidan, out0);
    SMath.random = realRandom;
    t.eq(b0.stunNext, true, '命中时置敌方被控标记 stunNext');
    t.eq(b0.stunKind, 'freeze', '水系控制种类应为 freeze（图标 ❄️冻结）');
    t.ok(out0.join('|').indexOf('冻结生效') >= 0, '战报应出现「冻结生效」（水系文案，非眩晕）');

    // ② 端到端：经 combatAct 打完整回合 —— 敌方被冻结，本回合无法反击
    const s1 = bare('黄阶冻结·整回合');
    s1.ling = 200;
    E.refreshStats(s1);
    s1.techs = ['shuidan'];
    s1.techEquip = { xinfa: null, shufa: ['shuidan'], dunshu: null };
    E.refreshStats(s1);
    dummyFight(s1, 100, 1000000);
    s1.mp = s1.mpMax;
    SMath.random = () => 0;
    const r1 = E.combatAct(s1, 'spell', 'shuidan');
    SMath.random = realRandom;
    t.ok(r1.lines.join('|').indexOf('冻结生效') >= 0, '整回合战报应出现「冻结生效」');
    t.eq(s1.battle.hpLost, 0, '敌方被冻结，本回合未能反击，玩家不掉血');

    // ③ 未命中：不置标记、有明确反馈、敌方正常反击
    const s2 = bare('黄阶冻结·未命中');
    s2.ling = 200;
    E.refreshStats(s2);
    s2.techs = ['shuidan'];
    s2.techEquip = { xinfa: null, shufa: ['shuidan'], dunshu: null };
    E.refreshStats(s2);
    dummyFight(s2, 100, 1000000);
    s2.mp = s2.mpMax;
    SMath.random = () => 0.99;
    const r2 = E.combatAct(s2, 'spell', 'shuidan');
    SMath.random = realRandom;
    t.ok(r2.lines.join('|').indexOf('未被冻结命中') >= 0, '未命中时应提示「未被冻结命中」');
    t.gt(s2.battle.hpLost, 0, '未命中则敌方正常反击，玩家掉血');
    t.note('土系（落石术）共用 stun 字段，文案按 sp.element 自动分流为「眩晕」——见新机制①');
  });

  S.case('黄阶机制④：金刃术（金）伐灾 —— 自叠 1 层 + 净化自身灼烧/中毒', (t) => {
    const s = bare('黄阶伐灾');
    s.ling = 200;
    E.refreshStats(s);
    s.techs = ['jinren'];
    s.techEquip = { xinfa: null, shufa: ['jinren'], dunshu: null };
    E.refreshStats(s);
    dummyFight(s, 0, 1000000);
    s.battle.pDotBurn = 2; s.battle.pDotPoison = 3;   // 先自挂毒·灼
    s.mp = s.mpMax;
    E.combatAct(s, 'spell', 'jinren');
    t.eq(s.battle.disasterStacks, 1, '金刃术（黄）叠 1 层伐灾');
    t.eq(s.battle.disasterCap, 1, '记录本档上限 1');
    t.eq(s.battle.pDotBurn, 0, '伐灾应净化自身灼烧');
    t.eq(s.battle.pDotPoison, 0, '伐灾应净化自身中毒');
    t.eq(s.battle.fxCritUp.amt, 8, '金刃术原有暴击加成不得被机制挤掉（+8%）');
    // 免控：cap=1 → 仅需 1 层即可抵消一次控制（旧版固定 3 层 → 黄阶永远摸不到）
    const SMath = G.get('Math');
    const realRandom = SMath.random;
    SMath.random = () => 0;
    s.battle.pStunNext = false;
    const immune = E.applyPlayerControl(s, s.battle, 1.0);
    SMath.random = realRandom;
    t.eq(immune, false, '黄阶伐灾（cap1）1 层即可免控');
    t.eq(s.battle.disasterStacks, 0, '免控消耗 1 层');
    t.note('金系伐灾为玩家专属：bossCastSpell 不读 sp.disaster，敌人施放金刃术只取伤害');
  });


  /* ---------------------------------------------------------------- */
  /* 7. 万法不侵 controlImmune 免疫心魔扰神                             */
  /* ---------------------------------------------------------------- */
  S.case('万法不侵 controlImmune：完全免疫心魔「扰神」', (t) => {
    function fight(immune) {
      const s = bare(immune ? '万法不侵' : '无免疫');
      s.shen = 0; s.dao = 0;
      if (immune) s.destinies = ['wanfabuqin'];
      E.refreshStats(s);
      E.combatStart(s, E.xinmoSpec(s));
      // 把心魔改成打不死的木桩，专测「扰神」机制本身
      s.battle.hp = 1e9; s.battle.hpMax = 1e9; s.battle.atk = 1;
      let lost = 0, blocked = 0;
      for (let i = 0; i < 200; i++) {
        s.hp = s.hpMax;
        const r = E.combatAct(s, 'atk');
        const txt = (r.lines || []).join('|');
        if (txt.indexOf('心神失守') >= 0) lost++;
        if (txt.indexOf('道心挡在门外') >= 0) blocked++;
        if (s.battle.done) break;
      }
      return { lost, blocked };
    }
    const immune = fight(true);
    t.eq(immune.lost, 0, '万法不侵：200 回合内不应出现任何一次心神失守');
    t.gt(immune.blocked, 0, '万法不侵：应出现「道心挡在门外」的免疫反馈');
    const plain = fight(false);
    t.gt(plain.lost, 0, '无免疫：心魔扰神应真实触发（200 回合内 0.65^200 ≈ 0）');
    t.eq(plain.blocked, 0, '无免疫：不应出现免疫反馈');
    t.note('心魔扰神 = 概率(35%)令下一次出手落空；机制由 xinmoSpec 独家注入 mechanic=suppress');
  });

  /* 仙命【九天玄体】是全局第一个带**负属性**的命格（ti-1 / dun-1）。
     负值若穿透到「体魄×50 = 气血上限」与「体魄×1% = 回复」，极端堆叠会算出 hpMax ≤ 0
     （进场即死、存档不可玩）或负回复（吸血变自残）。此处守死这两条地板。 */
  S.case('负体魄地板：仙命【九天玄体】不得算出 hpMax ≤ 0 或负回复', (t) => {
    // 基线：体魄 1、无仙命 → 80 + 1×50 = 130
    const base = bare('负体魄基线');
    base.ti = 1; E.refreshStats(base);
    t.eq(base.hpMax, 130, '基线（体魄 1）hpMax 应为 130');

    // 线上最坏情况：开局体魄恒为 1，九天玄体 -1 → 有效体魄 0
    const d1 = bare('九天玄体');
    d1.ti = 1; d1.destinies = ['jiutian']; E.refreshStats(d1);
    t.eq(E.effAttr(d1, 'ti'), 0, '体魄1 + 九天玄体(-1) → 有效体魄应为 0');
    t.eq(d1.hpMax, 80, '九天玄体 hpMax 应为 80（不得因负属性塌成 0/负数）');
    t.gte(E.getRecoverPct(d1), 0, '有效体魄 0 → 回复不得为负');

    // 构造性极端：有效体魄 -3（现实内容拿不到，但公式必须有地板）
    const d3 = bare('极端负体魄');
    d3.ti = 0; d3.destinies = ['jiutian', 'jiutian', 'jiutian']; E.refreshStats(d3);
    t.eq(E.effAttr(d3, 'ti'), -3, '应构造出有效体魄 -3');
    t.gt(d3.hpMax, 0, 'hpMax 必须 ≥ 1（实际 ' + d3.hpMax + '）');
    t.eq(E.getRecoverPct(d3), 0, '负体魄时回复应夹到 0，不得变成自残');
    t.note('加固前该极端下 hpMax = -70、getRecoverPct = -0.01（战斗中即为自伤）');
    t.note('2026-09-14 起开局六维为「0~2 劫=1 / 3 劫及以上=2」，故线上最坏为 effAttr(ti)=1 → hpMax=130');
    t.note('地板仍必须保留：它是「日后新增减体魄来源」时的最后一道防线（见 AGENTS.md 负属性安全地图）');
  });

  /* ---------------------------------------------------------------- */
  /* 2026-09-14 二批：殷实/见面礼/延寿 移入开荒「三 经历」；舍生 删除     */
  /* ---------------------------------------------------------------- */
  S.case('开荒 · 三 经历：四项实装结算（含【早夭】负点反向收益）', (t) => {
    const EXPS = E.INIT_EXP;
    t.ok(EXPS && EXPS.length === 4, 'INIT_EXP 应有 4 项（殷实/见面礼/延寿/早夭）');
    const byId = {}; EXPS.forEach(e => { byId[e.id] = e; });
    t.eq(byId.stone.cost, 3, '殷实 = 3 点固定');
    t.eq(byId.juling0.cost, 4, '见面礼 = 4 点固定');
    t.eq(byId.life20.cost, 2, '延寿 = 2 点固定');
    t.eq(byId.zaoyao.cost, -3, '早夭 = -3 点（负值：选它反而增加预算）');

    // 点数折算口径（UI 与引擎共用的唯一真源）
    t.eq(E.initExpCost({ exp: [] }), 0, '未选经历 → 0 点');
    t.eq(E.initExpCost({ exp: ['zaoyao'] }), -3, '只选早夭 → -3 点');
    t.eq(E.initExpCost({ exp: ['stone', 'juling0', 'life20'] }), 9, '殷实+见面礼+延寿 = 3+4+2 = 9 点');

    // 实际结算：殷实 +500 灵石 / 见面礼 聚气丹×3 / 延寿 +20 寿元
    const s = E.startLife('开荒经历');
    const lg = G.get('LINGGEN_POOL')[0], bg = G.get('BACKGROUNDS')[0];
    const baseStone = s.stone + ((bg.flavor && bg.flavor.stone) || 0);
    const baseLife = s.lifeMax + ((bg.flavor && bg.flavor.life) || 0);
    E.applyInit(s, { linggenId: lg.id, bgId: bg.id, points: {}, craft: {}, exp: ['stone', 'juling0', 'life20'] });
    t.eq(s.stone, baseStone + 500, '殷实应结算 +500 灵石（用户定稿值；旧轮回塔为 +100×等级）');
    t.eq(s.elixirs.juling, 3, '见面礼应结算 聚气丹 ×3');
    t.eq(s.lifeMax, baseLife + 20, '延寿应结算 寿元 +20');

    // 早夭：寿元 -30（2026-09-16 定稿，原 -20），且不得把寿元压成 0/负数
    const s2 = E.startLife('早夭');
    E.applyInit(s2, { linggenId: lg.id, bgId: bg.id, points: {}, craft: {}, exp: ['zaoyao'] });
    t.eq(s2.lifeMax, baseLife - 30, '早夭应结算 寿元 -30');
    t.gt(s2.lifeMax, 0, '寿元必须有地板（不得 ≤ 0）');
    t.note('引入负值效果一律补地板——早夭的 -30 与【九天玄体】的体魄-1 同源');
  });

  /* 经历是「取 / 不取」的二值选择 → 每项最多结算一次。
     若不变量被打破，`exp:['zaoyao','zaoyao',…]` 就能量产负点（刷开荒预算）并重复扣寿元。 */
  S.case('开荒 · 三 经历：重复 id 只结算一次（不得刷负点 / 重复扣寿元）', (t) => {
    const L = G.get('LINGGEN_POOL')[0].id, B = G.get('BACKGROUNDS')[0].id;
    const mk = (exp) => {
      const s = E.startLife('经历去重');
      E.applyInit(s, { linggenId: L, bgId: B, points: {}, craft: {}, exp: exp });
      return s;
    };
    t.eq(E.initExpCost({ exp: ['zaoyao'] }), -3, '早夭单次 = -3 点');
    t.eq(E.initExpCost({ exp: ['zaoyao', 'zaoyao', 'zaoyao'] }), -3, '早夭 ×3 仍应为 -3 点（去重）');
    t.eq(E.initExpCost({ exp: ['stone', 'stone', 'zaoyao'] }), 0, '[殷实,殷实,早夭] 应为 3-3 = 0 点');
    t.eq(E.initExpCost({ exp: ['bogus', 'stone'] }), 3, '未知 id 应被忽略（不报错、不计点）');

    const base = mk([]), rep = mk(['zaoyao', 'zaoyao', 'zaoyao']);
    t.eq(rep.lifeMax, base.lifeMax - 30, '重复早夭只扣一次寿元（应为 ' + (base.lifeMax - 30) + '，实 ' + rep.lifeMax + '）');
    t.gt(rep.lifeMax, 0, '寿元地板仍然成立');
    // 正常路径不受影响
    const all = mk(['stone', 'juling0', 'life20', 'zaoyao']);
    t.eq(all.stone - base.stone, 500, '全选四项：殷实照样 +500 灵石');
    t.eq(all.lifeMax, base.lifeMax + 20, '全选四项：延寿与早夭互斥 → 先取的延寿 +20 生效，早夭被丢弃');
    t.eq(all.elixirs.juling, 3, '全选四项：见面礼照样给聚气丹 ×3');
    t.note('去重口径收在 initExpIds(sel)，initExpCost / initExpLife / applyInit 共用同一个「哪几项生效」真源');
  });

  /* 【延寿】+20 与【早夭】-30 一加一减 → 只能取其一（2026-09-16 定稿）。
     互斥若只在 UI 做（点一个摘掉另一个），`applyInit` 这类公开接口仍会被 exp:['life20','zaoyao'] 打穿。 */
  S.case('开荒 · 三 经历：延寿与早夭互斥（先取者生效，后来者整条丢弃）', (t) => {
    const L = G.get('LINGGEN_POOL')[0].id, B = G.get('BACKGROUNDS')[0].id;
    const mk = (exp) => {
      const s = E.startLife('经历互斥');
      E.applyInit(s, { linggenId: L, bgId: B, points: {}, craft: {}, exp: exp });
      return s;
    };
    // 数据表声明
    const byId = {}; E.INIT_EXP.forEach(e => { byId[e.id] = e; });
    t.ok(byId.life20.conflict && byId.life20.conflict.indexOf('zaoyao') >= 0, '延寿须声明与早夭互斥');
    t.ok(byId.zaoyao.conflict && byId.zaoyao.conflict.indexOf('life20') >= 0, '早夭须声明与延寿互斥（双向）');
    t.eq(byId.zaoyao.apply.life, -30, '早夭的寿元增减须为 -30');

    // 引擎侧互斥：两种顺序都只留先取的那一项
    t.eq(E.initExpIds({ exp: ['life20', 'zaoyao'] }).join(','), 'life20', '[延寿,早夭] → 只留延寿');
    t.eq(E.initExpIds({ exp: ['zaoyao', 'life20'] }).join(','), 'zaoyao', '[早夭,延寿] → 只留早夭');
    t.eq(E.initExpCost({ exp: ['life20', 'zaoyao'] }), 2, '互斥后点数 = 2（不是 2-3 = -1）');
    t.eq(E.initExpCost({ exp: ['zaoyao', 'life20'] }), -3, '互斥后点数 = -3（不是 2-3 = -1）');

    // 寿元合计口径 initExpLife（UI「命数总览」唯一真源）
    t.eq(E.initExpLife({ exp: ['zaoyao', 'life20'] }), -30, 'initExpLife：[早夭,延寿] → -30');
    t.eq(E.initExpLife({ exp: ['life20', 'zaoyao'] }), 20, 'initExpLife：[延寿,早夭] → +20');
    t.eq(E.initExpLife({ exp: [] }), 0, 'initExpLife：未选 → 0');

    // 实算：面板与开局一致（防止 UI 自算一遍后与实算分叉）
    const b = mk([]);
    t.eq(mk(['zaoyao', 'life20']).lifeMax, b.lifeMax - 30, '实算：选了早夭再点延寿 → 寿元 -30');
    t.eq(mk(['life20', 'zaoyao']).lifeMax, b.lifeMax + 20, '实算：选了延寿再点早夭 → 寿元 +20');
    t.eq(E.initExpLife({ exp: ['zaoyao', 'life20'] }), mk(['zaoyao', 'life20']).lifeMax - b.lifeMax,
      'initExpLife 与 applyInit 实算必须完全一致（口径唯一化）');
  });

  S.case('轮回塔退役天赋：殷实/见面礼/延寿/舍生 不得残留，旧档按原价退还轮回点', (t) => {
    const REINC = E.REINCARNATION;
    const retired = ['stone', 'juling0', 'life20', 'shesheng'];
    const left = REINC.filter(r => retired.indexOf(r.id) >= 0).map(r => r.id);
    if (left.length) t.fail('REINCARNATION 仍残留退役天赋: ' + left.join(', '));
    t.ok(REINC.some(r => r.id === 'cult') && REINC.some(r => r.id === 'xianling'),
      '其余天赋（道种 / 先天灵宝等）必须保留');

    // 舍生的两条消费点必须一并下线（否则会变成「有字段、无来源」的死配置）
    //   同一状态对象前后翻转 shesheng，排除其它 RNG 因素，断言修炼速度完全不受影响
    const a = bare('舍生探测'); a.reinc = a.reinc || {};
    a.reinc.shesheng = 0; const g0 = E.cultGain(a).gain;
    a.reinc.shesheng = 3; const g1 = E.cultGain(a).gain;
    t.eq(g1, g0, '舍生已删除：s.reinc.shesheng 不得再影响修炼速度（' + g0 + ' → ' + g1 + '）');

    // 旧档退款：stone(2) ×2 级 + shesheng(5) ×1 级 = 2×(1+2) + 5×1 = 11 点
    const meta = { points: 100, lives: 1, reinc: { stone: 2, shesheng: 1, cult: 3 }, achievements: {}, flown: false, maxJie: 0 };
    E.saveMeta(meta);
    const m2 = E.loadMeta();
    t.eq(m2.reinc.stone, undefined, '旧档 stone 字段应被清除');
    t.eq(m2.reinc.shesheng, undefined, '旧档 shesheng 字段应被清除');
    t.eq(m2.reinc.cult, 3, '未退役天赋（道种）不得被动到');
    t.eq(m2.points, 111, '退款应为 2×(1+2) + 5×1 = 11 点（100 → 111），实际 ' + m2.points);
    t.note('退款口径：单价 × (1+2+…+n)，与轮回阁「第 n 级 cost×n」的定价一致');
    // 还原，避免污染后续用例
    E.saveMeta({ points: 0, lives: 0, reinc: {}, achievements: {}, flown: false, maxJie: 0 });
  });

  /* ---------------------------------------------------------------- */
  /* 战斗状态图标（2026-09-14）：battleFxList 数据源 + 控制区分 + 解毒真解 */
  /* ---------------------------------------------------------------- */
  S.case('战斗状态图标①：battleFxList 覆盖全部 15 项（我方 9 / 敌方 6），空状态为空', (t) => {
    // 先验「空状态」——旧版两行都读 s.battle.buffs（全仓库从未写入）→ 徽章恒空；
    //   现在读的是派生函数，无状态时必须返回空列表，避免凭空冒出徽章。
    const s0 = bare('空状态');
    dummyFight(s0, 0, 100000);
    const empty = E.battleFxList(s0, s0.battle);
    t.eq(empty.me.length, 0, '无状态时我方徽章应为 0（实际 ' + empty.me.length + '）');
    t.eq(empty.foe.length, 0, '无状态时敌方徽章应为 0（实际 ' + empty.foe.length + '）');

    // 全状态：把 12 类可变状态一次性点亮
    const s = bare('全状态');
    const b = dummyFight(s, 0, 100000);
    b.fxAtkUp = { amt: 12, turns: 3 };
    b.fxDefUp = { amt: 40, turns: 2 };
    b.fxCritUp = { amt: 8, turns: 2 };
    b.disasterStacks = 3; b.disasterTurns = 3;
    b.guarded = true;
    b.pStunNext = true; b.pStunKind = 'freeze';
    b.pDotBurn = 2; b.pDotPoison = 1;
    b.suppressed = true;
    b.stunNext = true; b.stunKind = 'stun';
    b.dotBurn = 4; b.dotPoison = 2;
    b.fxAtkDown = { amt: 30, turns: 2 };
    b.fxBossDefUp = { amt: 25, turns: 2 };
    b.enraged = true;

    const fx = E.battleFxList(s, b);
    t.eq(fx.me.length, 9, '我方应渲染 9 枚徽章（增益5 + 减益4），实际 ' + fx.me.length);
    t.eq(fx.foe.length, 6, '敌方应渲染 6 枚徽章（减益4 + 增益2），实际 ' + fx.foe.length);
    // 每项必须齐备 { icon, label, bad, tip }，缺一渲染就会出空徽章
    fx.me.concat(fx.foe).forEach(function (x) {
      t.ok(x.icon && x.label && typeof x.bad === 'boolean' && x.tip,
        '徽章项字段应齐备（icon/label/bad/tip）：' + JSON.stringify(x));
    });
    const iconOf = (arr, re) => (arr.find(x => re.test(x.label)) || {}).icon;
    t.eq(iconOf(fx.me, /^攻击 \+/), '⚔️', '攻击提升图标');
    t.eq(iconOf(fx.me, /^减伤/), '🛡️', '受伤减免图标');
    t.eq(iconOf(fx.me, /^暴击/), '🎯', '暴击提升图标');
    t.eq(iconOf(fx.me, /^伐灾/), '✨', '伐灾图标');
    t.eq(iconOf(fx.me, /^防御$/), '🧱', '防御姿态图标');
    t.eq(iconOf(fx.me, /^灼烧/), '🔥', '灼烧图标');
    t.eq(iconOf(fx.me, /^中毒/), '☠️', '中毒图标');
    t.eq(iconOf(fx.me, /^心神失守/), '😵', '心神失守图标');
    t.eq(iconOf(fx.foe, /^攻击 −/), '🔻', '敌方攻击削弱图标');
    t.eq(iconOf(fx.foe, /^狂暴$/), '💢', '狂暴图标');
    // 增益/减益标记（bad → 暗红配色）
    t.eq(fx.me.filter(x => x.bad).length, 4, '我方减益 4 项（冻结/灼烧/中毒/心神失守）');
    t.eq(fx.me.filter(x => !x.bad).length, 5, '我方增益 5 项');
    // 死状态 / 非状态不得进列表
    b.slow = true; b.guard = 0.3; b.mechanic = 'enrage';
    t.eq(E.battleFxList(s, b).me.length, 9, 'b.slow（死状态）/ b.guard（遁术常驻）/ b.mechanic（固有特性）不得进徽章');
  });

  S.case('战斗状态图标②：眩晕 💫 与冻结 ❄️ 按五行区分（旧版共用同一字段、图标无法分辨）', (t) => {
    const s = bare('控制区分');
    const b = dummyFight(s, 0, 100000);
    // 玩家施控 → 敌方侧：水→冻结 / 土→眩晕
    E.applySpellFx(s, b, { name: '凝霜诀', grade: '玄', element: '水', stun: 1 }, []);
    t.eq(b.stunNext, true, '水法应控住敌方');
    t.eq(b.stunKind, 'freeze', '水法应记为冻结');
    t.eq(E.battleFxList(s, b).foe.find(x => /冻结/.test(x.label)).icon, '❄️', '冻结应显示 ❄️');
    b.stunNext = false; b.stunKind = 'stun';
    E.applySpellFx(s, b, { name: '落石术', grade: '玄', element: '土', stun: 1 }, []);
    t.eq(b.stunKind, 'stun', '土法应记为眩晕');
    t.eq(E.battleFxList(s, b).foe.find(x => /眩晕/.test(x.label)).icon, '💫', '眩晕应显示 💫');

    // 敌方施控 → 玩家侧：走 applyPlayerControl 的可选第 4 参
    const s2 = bare('受控区分');
    const b2 = dummyFight(s2, 0, 100000);
    const SMath = G.get('Math'); const realRandom = SMath.random;
    SMath.random = () => 0;                                   // 必定命中
    E.applyPlayerControl(s2, b2, 0.5, 'freeze');
    SMath.random = realRandom;
    t.eq(b2.pStunNext, true, '玩家应被控');
    t.eq(b2.pStunKind, 'freeze', '玩家受控应记为冻结');
    t.eq(E.battleFxList(s2, b2).me.find(x => /冻结/.test(x.label)).icon, '❄️', '玩家侧冻结图标');
    // 旧签名（3 参）必须仍然可用，且默认落到「眩晕」
    const s3 = bare('旧签名');
    const b3 = dummyFight(s3, 0, 100000);
    SMath.random = () => 0;
    E.applyPlayerControl(s3, b3, 0.5);
    SMath.random = realRandom;
    t.eq(b3.pStunNext, true, '三参旧签名应保持可用');
    t.eq(b3.pStunKind, 'stun', '未传 kind 时默认眩晕');
  });

  S.case('战斗状态图标③：解毒丹真解负面（旧版 filter 空列表 = 静默无效）', (t) => {
    const s = bare('解毒');
    const b = dummyFight(s, 0, 100000);
    s.adv = { items: [{ id: 'jiedu', count: 1 }] };
    // 挂满负面状态：毒 / 灼 / 被控 / 心神失守
    b.pDotBurn = 3; b.pDotPoison = 2; b.pStunNext = true; b.pStunKind = 'freeze'; b.suppressed = true;
    // 旧实现在此之前会去 filter 一个恒为空的 s.battle.buffs → 字段纹丝不动
    const r = E.useAdvElixir(s, 'jiedu');
    t.ok(r.ok, '解毒丹应可服用');
    t.eq(b.pDotBurn, 0, '中毒应被真解（旧版无效）');
    t.eq(b.pDotPoison, 0, '灼烧应被真解');
    t.eq(b.pStunNext, false, '控制应被真解');
    t.eq(b.suppressed, false, '心神失守应被真解');
    t.ok(r.lines.join('|').indexOf('负面状态已解除') >= 0, '应提示已解除负面状态');
    t.eq(E.battleFxList(s, b).me.filter(x => x.bad).length, 0, '解毒后我方不应再有减益徽章');
    // 正面状态不得被解毒误伤
    b.fxAtkUp = { amt: 12, turns: 3 }; b.disasterStacks = 2;
    s.adv.items = [{ id: 'jiedu', count: 1 }];
    E.useAdvElixir(s, 'jiedu');
    t.eq(b.fxAtkUp.amt, 12, '解毒不得清掉攻击增益');
    t.eq(b.disasterStacks, 2, '解毒不得清掉伐灾层数');
  });

  /* 2026-09-15：天榜 / 云存档整体下线，改走纯本地。
     退役项必须连「消费点」一起摘干净 —— 只摘数据定义会留下有字段无来源的死配置。
     此用例按源码文本做守卫，避免后续任何一次改动把云端调用悄悄带回来。 */
  S.case('天榜/云存档退役：源码零残留，且旧身份键有清理者', (t) => {
    const fs = require('fs');
    const path = require('path');
    const R = (p) => path.join(__dirname, '..', '..', p);

    // ① 后端模块文件必须已删除
    t.ok(!fs.existsSync(R('js/backend-api.js')), 'js/backend-api.js 必须已删除');

    // ② 任何源码都不得残留云端调用标识（.js 先剥注释，注释里提旧文件名属正常留痕）
    const IDENT = ['DedaoAPI', 'backend-api', 'fetchLeaderboard', 'fetchMyRank',
      'submitScore', 'uploadSave', 'downloadSave', 'reportToCloud',
      'appendLeaderboardSection', 'DEDAO_API_BASE'];
    const strip = (f, txt) => f.endsWith('.js')
      ? txt.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
      : txt;
    ['js/ui.js', 'js/engine.js', 'js/data.js', 'index.html', 'index_pc.html', 'sw.js']
      .forEach((f) => {
        const txt = strip(f, fs.readFileSync(R(f), 'utf8'));
        IDENT.forEach((k) => {
          t.ok(txt.indexOf(k) < 0, f + ' 不得残留云端标识 ' + k);
        });
      });

    // ③ 玩家可见的云端文案也一并摘净（用 UI 原文串，避免误命中注释里的「天榜」二字）
    const ui = fs.readFileSync(R('js/ui.js'), 'utf8');
    ['万道争锋', '叩问天榜', '上传云端', '从云端恢复', '自云端归来'].forEach((s) => {
      t.ok(ui.indexOf(s) < 0, '不得残留云端 UI 文案「' + s + '」');
    });

    // ④ 结算页结构不得再有天榜区块（应只剩：此生大事 / 轮回点明细 / 劫轮回）
    const secCount = (ui.match(/className = 'settle-section'/g) || []).length;
    t.ok(secCount <= 4, '结算页 settle-section 数量应已回落，实际 ' + secCount);

    // ⑤ 旧版写入的 dedao_api_identity 必须有人清（含道号与 api_key，属个人数据残留）
    t.ok(ui.indexOf('dedao_api_identity') >= 0, '开机必须清理旧版 dedao_api_identity');
    t.ok(/function\s+purgeLegacyCloudKeys/.test(ui), '应有 purgeLegacyCloudKeys()');
    t.ok(/purgeLegacyCloudKeys\(\);/.test(ui), 'purgeLegacyCloudKeys 必须被调用');
  });

  return S;
};
