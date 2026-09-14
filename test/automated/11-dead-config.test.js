/* DEDAO 自动化测试 —— 11 死配置实装（数据定义了但引擎从不读的字段）
 * 覆盖：
 *   旧命格 TALENTS.apply  —— tiMul / shenMul / dunMul / doubleHit / trib / growDun
 *   新命格 DESTINIES.effect —— techTypeBonus（万剑归宗）/ tribBonus / controlImmune
 *   旧命格 战斗向 —— critDmgBoost（致命一击）/ execute（一剑封喉）
 *   心法   —— reduceDmg（玄武真经减伤）/ craftTimeReduce（丹道真解缩短炼丹）
 *   法术   —— buff（atkUp/defUp/critUp）/ debuff（atkDown）/ stun / dotBurn / dotPoison / disaster / heal / mpRestore / lifesteal
 * 口径铁律：这些字段此前只写在 data 里、引擎从不读取，等于玩家拿到手是「空命格/空法术」。
 */
const { Suite, createGameContext } = require('./_harness');

module.exports = async function build() {
  const S = new Suite('11 死配置实装（命格/心法/法术）');
  const G = createGameContext({ seed: 20260912 });
  const E = G.get('Engine');

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
  S.case('心法①：玄武真经 reduceDmg 与护盾 buff 走同一减伤通道', (t) => {
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

    // 装玄武真经（guard 0.20 常驻减伤 + reduceDmg 0.05）→ 100×0.75 = 75 - 18 = 57
    s.techs = ['xt_xinfa4'];
    s.techEquip = { xinfa: 'xt_xinfa4', shufa: [], dunshu: null };
    E.refreshStats(s);
    t.eq(E.getXinfaReduceDmg(s), 0.05, '玄武真经 reduceDmg = 0.05');
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
        t.eq(d, Math.max(1, Math.round(enemyAtk * 0.75) - defAbs), '心法常驻减伤 25%（guard20+reduceDmg5）= 75-18=57');
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

  S.case('心法③：宗门心法 atkMul / spellMul / hpMax 全部实装', (t) => {
    const s = bare('宗门心法');
    s.techs = ['qy_xinfa4'];                        // 太虚剑典：atkMul 0.20、spellMul 0.10
    s.techEquip = { xinfa: 'qy_xinfa4', shufa: [], dunshu: null };
    E.refreshStats(s);
    t.eq(E.getXinfaAtkMul(s), 0.20, '太虚剑典 atkMul = 0.20');
    t.eq(E.getXinfaSpellMul(s), 0.10, '太虚剑典 spellMul = 0.10');
    const atkWith = s.atk;
    s.techs = []; s.techEquip = { xinfa: null, shufa: [], dunshu: null };
    E.refreshStats(s);
    const atkWithout = s.atk;
    // 攻击基数 ×1.20（techMult 只影响修炼速度，不影响攻击）
    t.eq(atkWith, Math.round(atkWithout * 1.20), '心法 atkMul 应作用于攻击（+20%）');

    // 玄天门系 hpMax：玄武真经 +150（守护/天罡心法依次 +50/+100）
    const s2 = bare('玄天心法');
    const hp0 = s2.hpMax;
    s2.techs = ['xt_xinfa2'];                       // 护山心经 hpMax 50、guard 0.10
    s2.techEquip = { xinfa: 'xt_xinfa2', shufa: [], dunshu: null };
    E.refreshStats(s2);
    t.eq(E.getXinfaHpMax(s2), 50, '护山心经 hpMax = +50');
    t.eq(E.getXinfaGuard(s2), 0.10, '护山心经 guard = 0.10');
    t.eq(s2.hpMax - hp0, 50, '心法固定气血应计入气血上限');
    t.note('宗门心法附加效果（青云剑宗 atkMul/spellMul、玄天门 guard/hpMax、丹霞谷 atkMul）此前全是死配置，而 DEDAO_秘境功法法术池映射.md 已明文宣传');
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

  S.case('新机制④：DoT / 伐灾 叠层上限按阶（玄2 / 地4 / 天8）', (t) => {
    t.eq(E.dotCapByGrade('玄'), 2, '玄级叠层上限 2');
    t.eq(E.dotCapByGrade('地'), 4, '地级叠层上限 4');
    t.eq(E.dotCapByGrade('天'), 8, '天级叠层上限 8');
  });

  S.case('新机制⑤：伐灾 disaster（破厄诀 叠层 · 净化自身毒灼 · 每3层免控）', (t) => {
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
    // 净化：先给自身挂上毒/灼，再施放伐灾应清空
    s.battle.pDotBurn = 2; s.battle.pDotPoison = 2;
    s.mp = s.mpMax;
    E.combatAct(s, 'spell', 'po_e');
    t.eq(s.battle.pDotBurn, 0, '伐灾应净化自身灼烧');
    t.eq(s.battle.pDotPoison, 0, '伐灾应净化自身中毒');
    t.eq(s.battle.disasterStacks, 2, '二次施法叠至 2 层（玄级上限）');
    // 免控：灾厄 ≥3 层时消耗 3 层抵消一次外部控制（此处手动置 3 层以校验免控逻辑）
    const realRandom = Math.random;
    Math.random = () => 0;                            // 强制控制判定命中
    s.battle.disasterStacks = 3; s.battle.pStunNext = false;
    const immune = E.applyPlayerControl(s, s.battle, 1.0);
    t.eq(immune, false, '灾厄 3 层应免控（不被控）');
    t.eq(s.battle.disasterStacks, 0, '免控消耗 3 层灾厄');
    t.eq(s.battle.pStunNext, false, '免控时不应置玩家被控标记');
    // 灾厄不足 3 层则正常被控（双向入口）
    s.battle.disasterStacks = 2; s.battle.pStunNext = false;
    const controlled = E.applyPlayerControl(s, s.battle, 1.0);
    Math.random = realRandom;
    t.eq(controlled, true, '灾厄不足 3 层应被控');
    t.eq(s.battle.pStunNext, true, '被控时置 pStunNext（玩家下回合无法行动）');
  });

  /* ---------------------------------------------------------------- */
  /* 6. 万法不侵 controlImmune 免疫心魔扰神                              */
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
    t.eq(E.initExpCost({ exp: ['stone', 'juling0', 'life20', 'zaoyao'] }), 6, '全选四项净花 3+4+2-3 = 6 点');

    // 实际结算：殷实 +500 灵石 / 见面礼 聚气丹×3 / 延寿 +20 寿元
    const s = E.startLife('开荒经历');
    const lg = G.get('LINGGEN_POOL')[0], bg = G.get('BACKGROUNDS')[0];
    const baseStone = s.stone + ((bg.flavor && bg.flavor.stone) || 0);
    const baseLife = s.lifeMax + ((bg.flavor && bg.flavor.life) || 0);
    E.applyInit(s, { linggenId: lg.id, bgId: bg.id, points: {}, craft: {}, exp: ['stone', 'juling0', 'life20'] });
    t.eq(s.stone, baseStone + 500, '殷实应结算 +500 灵石（用户定稿值；旧轮回塔为 +100×等级）');
    t.eq(s.elixirs.juling, 3, '见面礼应结算 聚气丹 ×3');
    t.eq(s.lifeMax, baseLife + 20, '延寿应结算 寿元 +20');

    // 早夭：寿元 -20，且不得把寿元压成 0/负数
    const s2 = E.startLife('早夭');
    E.applyInit(s2, { linggenId: lg.id, bgId: bg.id, points: {}, craft: {}, exp: ['zaoyao'] });
    t.eq(s2.lifeMax, baseLife - 20, '早夭应结算 寿元 -20');
    t.gt(s2.lifeMax, 0, '寿元必须有地板（不得 ≤ 0）');
    t.note('引入负值效果一律补地板——早夭的 -20 与【九天玄体】的体魄-1 同源');
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
    t.eq(rep.lifeMax, base.lifeMax - 20, '重复早夭只扣一次寿元（应为 ' + (base.lifeMax - 20) + '，实 ' + rep.lifeMax + '）');
    t.gt(rep.lifeMax, 0, '寿元地板仍然成立');
    // 正常路径不受影响
    const all = mk(['stone', 'juling0', 'life20', 'zaoyao']);
    t.eq(all.stone - base.stone, 500, '全选四项：殷实照样 +500 灵石');
    t.eq(all.lifeMax, base.lifeMax, '全选四项：延寿+20 与早夭-20 抵消');
    t.eq(all.elixirs.juling, 3, '全选四项：见面礼照样给聚气丹 ×3');
    t.note('去重口径收在 initExpIds(sel)，initExpCost 与 applyInit 共用同一个「哪几项生效」真源');
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

  return S;
};
