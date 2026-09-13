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
  /* 2. 新命格 DESTINIES.effect：techTypeBonus / tribBonus              */
  /* ---------------------------------------------------------------- */
  S.case('新命格 effect：万剑归宗 techTypeBonus（心法效果 +25%）', (t) => {
    const s = bare('万剑归宗');
    s.techs = ['xt_xinfa4'];                       // 玄武真经 mult 2.30
    s.techEquip = { xinfa: null, shufa: [], dunshu: null };
    E.refreshStats(s);
    t.ok(Math.abs(E.techMult(s) - 2.30) < 1e-9, '无命格：心法倍率 = 2.30');
    t.eq(E.getTechTypeBonus(s, 'xinfa'), 0, '未选命格时 techTypeBonus 应为 0');
    s.destinies = ['wanjian'];
    E.refreshStats(s);
    t.eq(E.getTechTypeBonus(s, 'xinfa'), 0.25, '万剑归宗 techTypeBonus{xinfa:0.25}');
    t.ok(Math.abs(E.techMult(s) - 2.30 * 1.25) < 1e-9, '心法倍率应乘上 1.25 = 2.875');
    t.note('techMult = 心法倍率 × (1 + getTechTypeBonus(xinfa))；无心法不生效，避免白送');
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
    t.note('与命格 executeBonus（杀伐果断：气血<30% 提升伤害）区分：execute 是阈值以内直接斩杀');
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
    const realRandom = Math.random;
    function castLieDi(forceHit) {
      const s = bare('裂地诀');
      s.ling = 200;                                  // 抬升灵力上限，确保 22 点消耗必能施展
      E.refreshStats(s);
      s.techs = ['lie_di'];
      s.techEquip = { xinfa: null, shufa: ['lie_di'], dunshu: null };
      E.refreshStats(s);
      dummyFight(s, 100, 1000000);
      s.mp = s.mpMax;
      Math.random = () => (forceHit ? 0 : 0.99);      // 0 < 20% 命中；0.99 > 20% 未中
      const r = E.combatAct(s, 'spell', 'lie_di');
      Math.random = realRandom;
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

  return S;
};
