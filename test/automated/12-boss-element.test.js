/* DEDAO 自动化测试 —— 12 BOSS 五行属性与法术适配（2026-09-13 实装）
 * 覆盖：
 *   五行生克   —— 克 ×1.2 / 同属 ×0.9 / 被克 ×0.8 / 无属性法术恒 ×1.0
 *   无属性 BOSS —— 不参与生克，玩家任何伤害再乘 ×0.90
 *   镜像属性   —— 试炼之主 / 心魔：元素取玩家主灵根（不复制玩家法术）
 *   BOSS 施法  —— 按 spellChance 抽法术：伤害 / 眩晕冻结 / 灼烧中毒 / 治疗（全额）/ 自身减伤护盾
 *   黄阶双向   —— 敌人施放黄阶法术（落石/水弹/火球/藤蔓）→ 机制落在玩家侧字段（2026-09-15）
 *   玩家反制   —— 金系伐灾免控（applyPlayerControl 内含），消耗 = min(3, 本档上限)
 * 口径：BOSS 只使用「能作用在玩家身上」的效果，不使用玩家专属的 disaster（伐灾）。
 */
const { Suite, createGameContext } = require('./_harness');

module.exports = async function build() {
  const S = new Suite('12 BOSS 五行与法术适配');
  const G = createGameContext({ seed: 20260913 });
  const E = G.get('Engine');
  const T = G.get('TECHNIQUES');

  /* 沙箱内的 Math 是可复现随机（Object.create(Math) + seeded random），
     测试期间可整体钉死返回值，从而精确控制「BOSS 是否施法 / 控制是否命中」。 */
  function withRand(v, fn) {
    const fk = G.sandbox.Math;
    const orig = fk.random;
    fk.random = function () { return v; };
    try { return fn(); } finally { fk.random = orig; }
  }

  /* 清空一切外部加成，得到「裸体」状态（无暴击 / 无闪避 / 无额外攻击 → 伤害完全确定） */
  function bare(name) {
    const s = E.startLife(name || 'BOSS校验');
    E.commitStart(s, 'wuxing');
    s.talents = []; s.destinies = []; s.arts = [];
    s.linggen = null;
    s.ling = 300;
    s.equip = { weapon: null, head: null, body: null, accessory: null, treasure: [] };
    s.array = { wuxing: {}, juling: { level: 0 } };
    s.sect = null; s.elixirs = {};
    s.dun = 0; s.dodgePct = 0; s.atkPct = 0; s.critPct = 0; s.earthPct = 0;
    s.ti = 0; s.shen = 0; s.dao = 0;
    E.refreshStats(s);
    return s;
  }
  function equipSpell(s, id) {
    s.techs = [id];
    s.techEquip = { xinfa: null, shufa: [id], dunshu: null };
    E.refreshStats(s);
  }
  /* 对指定 name 的 BOSS 开战（木桩血 100 万，打不死） */
  function fightBoss(s, name, atk) {
    E.combatStart(s, { name: name, atk: atk || 10, hp: 1000000 });
    return s.battle;
  }

  /* ---------------- 一、五行生克系数（纯函数） ---------------- */
  S.case('生克①：克 ×1.2 / 同属 ×0.9 / 被克 ×0.8 / 无关 ×1.0', (t) => {
    t.eq(E.elemCounterMul('火', '金'), 1.2, '火克金 → ×1.2');
    t.eq(E.elemCounterMul('火', '火'), 0.9, '同属（火打火）→ ×0.9');
    t.eq(E.elemCounterMul('火', '水'), 0.8, '水克火（被克）→ ×0.8');
    t.eq(E.elemCounterMul('火', '土'), 1.0, '火与土无生克 → ×1.0');
    t.eq(E.elemCounterMul('金', '木'), 1.2, '金克木 → ×1.2');
    t.eq(E.elemCounterMul('木', '土'), 1.2, '木克土 → ×1.2');
    t.eq(E.elemCounterMul('土', '水'), 1.2, '土克水 → ×1.2');
    t.eq(E.elemCounterMul('水', '火'), 1.2, '水克火 → ×1.2');
  });

  S.case('生克②：无属性法术（青云剑宗）恒 ×1.0，无属性 BOSS 不吃生克', (t) => {
    t.eq(E.elemCounterMul('无', '金'), 1.0, '无属性法术对任何 BOSS 恒 ×1.0');
    t.eq(E.elemCounterMul('火', '无'), 1.0, '无属性 BOSS 不吃生克（×0.9 由 enemyTakenMul 叠加）');
    t.eq(E.elemCounterMul('火', null), 1.0, '未配置元素的敌人不吃生克');
  });

  S.case('生克③：无属性 BOSS 全系减伤 ×0.90（魔/心魔/虚空/天道）', (t) => {
    const b0 = { element: '无', fxBossDefUp: { amt: 0, turns: 0 } };
    t.eq(E.enemyTakenMul(b0, '火'), 0.9, '打无属性 BOSS：任何法术再乘 0.9');
    t.eq(E.enemyTakenMul(b0, null), 0.9, '普攻同样受 0.9 减伤（避免全普攻成为最优解）');
    const b1 = { element: undefined, fxBossDefUp: { amt: 0, turns: 0 } };
    t.eq(E.enemyTakenMul(b1, '火'), 1.0, '未配置元素的敌人不受无属性减伤（杂兵/测试木桩）');
    const b2 = { element: '金', fxBossDefUp: { amt: 40, turns: 2 } };
    t.eq(E.enemyTakenMul(b2, '火'), 1.2 * 0.6, '金 BOSS + 自身护盾 40% → 1.2 × 0.6');
  });

  /* ---------------- 二、端到端：玩家法术伤害 ---------------- */
  S.case('生克④：端到端 —— 火球术打金 BOSS（×1.2）伤害高于火 BOSS（×0.9）', (t) => {
    const s = bare('生克端到端');
    equipSpell(s, 'huoqiu');
    withRand(0.999, function () {   // 0.999 ≥ spellChance：BOSS 本回合不施法，伤害纯净可比
      const bGold = fightBoss(s, '仙宫守护者');        // 金 → 火克金 ×1.2
      const hp1 = bGold.hp;
      E.combatAct(s, 'spell', 'huoqiu');
      const dGold = hp1 - bGold.hp;

      const bFire = fightBoss(s, '火脉元灵');          // 火 → 同属 ×0.9
      const hp2 = bFire.hp;
      E.combatAct(s, 'spell', 'huoqiu');
      const dFire = hp2 - bFire.hp;

      t.ok(dGold > 0 && dFire > 0, '两次施法都应造成伤害（' + dGold + ' / ' + dFire + '）');
      const ratio = dGold / dFire;
      t.ok(ratio > 1.25 && ratio < 1.45, '金 BOSS 伤害 / 火 BOSS 伤害 ≈ 1.2/0.9 = 1.333（实际 ' + ratio.toFixed(3) + '）');
    });
  });

  S.case('生克⑤：端到端 —— 无属性 BOSS（无面）伤害为未配置敌人的 0.9 倍', (t) => {
    const s = bare('无属性减伤');
    equipSpell(s, 'huoqiu');
    withRand(0.999, function () {
      const bPlain = fightBoss(s, '木桩');             // 未配置 → ×1.0
      const h1 = bPlain.hp; E.combatAct(s, 'spell', 'huoqiu');
      const dPlain = h1 - bPlain.hp;

      const bNo = fightBoss(s, '无面');                // 显式无属性 → ×0.9
      const h2 = bNo.hp; E.combatAct(s, 'spell', 'huoqiu');
      const dNo = h2 - bNo.hp;

      t.ok(dPlain > 0 && dNo > 0, '两次施法都应造成伤害（' + dPlain + ' / ' + dNo + '）');
      const r = dNo / dPlain;
      t.ok(Math.abs(r - 0.9) < 0.02, '无属性 BOSS 伤害应为未配置敌人的 0.9 倍（实际比值 ' + r.toFixed(3) + '）');
      t.note('注：绝对伤害还含心法 spellMul / 灵根亲和等乘区，故只断言两者的相对比值');
    });
  });

  /* ---------------- 三、镜像属性与数据注入 ---------------- */
  S.case('镜像属性：试炼之主的元素 = 玩家主灵根（不复制玩家法术）', (t) => {
    const s = bare('镜像校验');
    s.linggen = { name: '火灵根', affinity: ['火'], affinityBonus: 15 };
    E.refreshStats(s);
    const b = fightBoss(s, '试炼之主');
    t.eq(b.element, '火', '试炼之主应镜像玩家主灵根（火）');
    t.ok(b.spells.length === 4, '法术表固定为 4 个（不复制玩家法术），实际 ' + b.spells.length);
    t.eq(b.spellChance, 0.15, '试炼之主 spellChance 0.15');
    // 心魔同理
    const b2 = fightBoss(s, '心魔 · 执念化形');
    t.eq(b2.element, '火', '心魔亦镜像玩家主灵根');
  });

  S.case('数据注入：剧情强敌按 name 命中（火脉元灵 / 吞星巨蟒）', (t) => {
    const s = bare('强敌注入');
    const b = fightBoss(s, '火脉元灵');
    t.eq(b.element, '火', '火脉元灵 → 火');
    t.eq(b.spellChance, 0.25, '火脉元灵 施法概率 0.25');
    t.eq(b.spells.length, 2, '火脉元灵 2 个法术');
    const b2 = fightBoss(s, '吞星巨蟒');
    t.eq(b2.element, '木', '吞星巨蟒 → 木');
    const b3 = fightBoss(s, '青纹狼');
    t.eq(b3.spellChance, 0, '低阶强敌（青纹狼）只标元素、不施法');
    t.eq(b3.element, '木', '青纹狼 → 木');
  });

  S.case('正式 BOSS 配置齐全：17 个 BOSS 均有元素与施法概率', (t) => {
    const s = bare('BOSS配置');
    const names = ['匪首', '黑山老妖', '洞天之主', '魔祖化身', '仙人残念', '试炼之主',
      '演武教头', '心魔 · 执念化形', '天劫化身 · 九天应元之形', '仙界守卫 · 白玉京执戟郎',
      '飞升天劫 · 天门之影', '狼王 · 赤瞳', '黑风寨主 · 屠九', '沧溟蛟 · 苍溟', '无面',
      '魔祖化身 · 渊', '魔祖仙帝 · 帝渊'];
    let missing = [];
    names.forEach(function (n) {
      const b = fightBoss(s, n);
      if (!b.element) missing.push(n);
    });
    t.eq(missing.length, 0, '所有正式 BOSS 都应命中配置（缺失：' + missing.join('、') + '）');
    const teach = fightBoss(s, '演武教头');
    t.eq(teach.spellChance, 0, '教学关（演武教头）不施法');
    const boss = fightBoss(s, '魔祖仙帝 · 帝渊');
    t.eq(boss.spellChance, 0.60, '帝渊 施法概率 0.60');
  });

  /* ---------------- 四、BOSS 施法 ---------------- */
  S.case('BOSS 施法①：施加中毒（腐毒刺 → pDotPoison）', (t) => {
    const s = bare('BOSS施毒');
    const b = fightBoss(s, '木桩');
    b.spells = [{ id: 'fu_du', w: 1 }];
    b.spellChance = 1;                     // 必定施法
    const out = [], fx = [];
    const cast = withRand(0.5, function () { return E.bossTryCast(s, b, out, fx); });
    t.eq(cast, true, 'spellChance=1 时应必定施法');
    t.eq(b.pDotPoison, T.fu_du.dotPoison, '腐毒刺应给玩家叠 ' + T.fu_du.dotPoison + ' 层中毒');
    t.ok(out.join('|').indexOf('施展【腐毒刺】') >= 0, '战报应出现 BOSS 施法提示');
  });

  S.case('BOSS 施法②：施加眩晕/冻结（霜寒禁锢 → pStunNext）', (t) => {
    const s = bare('BOSS施控');
    const b = fightBoss(s, '木桩');
    b.spells = [{ id: 'shuang_han', w: 1 }];
    b.spellChance = 1;
    const out = [], fx = [];
    withRand(0, function () { E.bossTryCast(s, b, out, fx); });  // random=0 → 概率判定必定命中
    t.eq(b.pStunNext, true, '控制命中后玩家下回合被控（pStunNext）');
    t.ok(out.join('|').indexOf('身形一滞') >= 0, '战报应提示玩家被控');
  });

  S.case('BOSS 施法③：金系伐灾 3 层免控（消耗 3 层抵消该次控制）', (t) => {
    const s = bare('伐灾免控');
    const b = fightBoss(s, '木桩');
    b.spells = [{ id: 'shuang_han', w: 1 }];
    b.spellChance = 1;
    b.disasterStacks = 3;
    b.disasterTurns = 3;
    const out = [], fx = [];
    withRand(0, function () { E.bossTryCast(s, b, out, fx); });
    t.eq(b.pStunNext, false, '伐灾 ≥3 层时该次控制被抵消');
    t.eq(b.disasterStacks, 0, '免控消耗 3 层伐灾');
    t.ok(out.join('|').indexOf('金光伐灾自行消抵') >= 0, '战报应提示伐灾消抵');
  });

  S.case('BOSS 施法④：治疗全额（万木回春 40% 气血上限，不折半）', (t) => {
    const s = bare('BOSS治疗');
    const b = fightBoss(s, '木桩');
    b.hp = Math.round(b.hpMax * 0.10);      // 压到 10% 便于观察回血
    b.spells = [{ id: 'wanmu', w: 1 }];
    b.spellChance = 1;
    const out = [], fx = [];
    withRand(0.5, function () { E.bossTryCast(s, b, out, fx); });
    const expect = Math.round(b.hpMax * 0.10) + Math.round(b.hpMax * 0.40);
    t.eq(b.hp, expect, '万木回春应全额回复 40% 上限（10% + 40%）');
    t.ok(out.join('|').indexOf('借法回元') >= 0, '战报应出现 BOSS 回血提示');
  });

  S.case('BOSS 施法⑤：自身减伤护盾（金光护体 defUp → fxBossDefUp）', (t) => {
    const s = bare('BOSS护盾');
    const b = fightBoss(s, '木桩');
    b.spells = [{ id: 'jinguanghu', w: 1 }];
    b.spellChance = 1;
    const out = [];
    withRand(0.5, function () { E.bossTryCast(s, b, out, []); });
    t.eq(b.fxBossDefUp.amt, 30, '金光护体给 BOSS 自身挂 30% 减伤');
    t.eq(E.enemyTakenMul(b, '火'), 0.7, 'BOSS 受伤倍率应为 0.7（1 - 30%）');
    E.tickBattleFx(b);
    t.eq(b.fxBossDefUp.turns, 2, '护盾计时随回合递减（3 → 2）');
  });

  S.case('BOSS 施法⑥：DoT 叠层封顶按阶（黄1 / 玄2 / 地4 / 天8）', (t) => {
    const s = bare('DoT封顶');
    const b = fightBoss(s, '木桩');
    b.spells = [{ id: 'jiu_you', w: 1 }];   // 九幽红莲（天）dotBurn 3
    b.spellChance = 1;
    withRand(0.5, function () {
      for (let i = 0; i < 5; i++) E.bossTryCast(s, b, [], []);
    });
    t.eq(b.pDotBurn, 8, '天阶上限 8 层：连施 5 次（每次 +3）应封顶在 8');
    t.eq(E.dotCapByGrade('天'), 8, '天阶 DoT 上限 8');
    t.eq(E.dotCapByGrade('地'), 4, '地阶 DoT 上限 4');
    t.eq(E.dotCapByGrade('玄'), 2, '玄阶 DoT 上限 2');
    t.eq(E.dotCapByGrade('黄'), 1, '黄阶 DoT 上限 1（2026-09-15 黄阶挂机制后新增）');
  });

  S.case('BOSS 施法⑦：法术伤害 = atk × dmg系数 × 0.35（压缩，避免秒杀）', (t) => {
    const s = bare('BOSS法伤');
    const b = fightBoss(s, '木桩', 1000);
    b.spells = [{ id: 'jinren', w: 1 }];    // 金刃术 dmg 2.0
    b.spellChance = 1;
    s.hp = s.hpMax;
    const hpBefore = s.hp;
    const out = [], fx = [];
    withRand(0.5, function () { E.bossTryCast(s, b, out, fx); });
    const dealt = hpBefore - s.hp;
    const expectRaw = Math.round(1000 * 2.0 * 0.35);   // = 700，再过玩家防御
    t.ok(dealt > 0, 'BOSS 法术应造成伤害（实际 ' + dealt + '）');
    t.ok(dealt <= expectRaw, 'BOSS 法术伤害应 ≤ 压缩后的原始值 ' + expectRaw + '（实际 ' + dealt + '）');
    t.note('注：法术伤害同样过玩家的防御/护盾通道，裸体状态下仍会被压到 ' + dealt + '；压缩系数 0.35 已避免高 atk BOSS 秒杀玩家');
  });

  S.case('BOSS 施法⑧：黄阶法术双向生效（敌人施放 → 落在玩家身上）', (t) => {
    /* 2026-09-15：黄阶法术挂上五大机制后，14 个在用黄阶法术的敌人同步获得机制（既定口径：敌我双向）。
       本用例守住「BOSS 分支真的把机制投到玩家侧字段」，避免只改 data 却没走通 bossCastSpell。 */
    function castOn(hit, spellId) {
      const s = bare('黄阶双向');
      const b = fightBoss(s, '木桩');
      b.spells = [{ id: spellId, w: 1 }];
      b.spellChance = 1;
      const out = [];
      withRand(hit ? 0 : 0.99, function () { E.bossTryCast(s, b, out, []); });
      return { s: s, b: b, lines: out.join('|') };
    }
    // 落石术（土，10% 眩晕）→ 玩家下回合无法行动
    const rock = castOn(true, 'luoshi');
    t.eq(rock.b.pStunNext, true, '落石术命中 → 玩家被眩晕（pStunNext）');
    t.eq(rock.b.pStunKind, 'stun', '土系控制种类 stun（💫眩晕）');
    // 水弹术（水，10% 冻结）→ 复用同一字段，仅文案/图标不同
    const water = castOn(true, 'shuidan');
    t.eq(water.b.pStunNext, true, '水弹术命中 → 玩家被冻结');
    t.eq(water.b.pStunKind, 'freeze', '水系控制种类 freeze（❄️冻结）');
    // 火球术（火）→ 玩家灼烧，黄阶上限 1
    const fire = castOn(false, 'huoqiu');
    t.eq(fire.b.pDotBurn, 1, '火球术 → 玩家身中灼烧 1 层（黄阶上限 1）');
    // 藤蔓术（木）→ 玩家中毒，黄阶上限 1
    const vine = castOn(false, 'tengman');
    t.eq(vine.b.pDotPoison, 1, '藤蔓术 → 玩家身中中毒 1 层');
    // 金刃术（金）：伐灾是玩家专属（bossCastSpell 不读 sp.disaster）→ 不得给玩家加伐灾
    const gold = castOn(false, 'jinren');
    t.eq(gold.b.disasterStacks, 0, 'BOSS 施金刃术不得给玩家加伐灾（伐灾为玩家专属免控）');
    t.ok(gold.lines.indexOf('伐灾') < 0, '战报不应出现伐灾相关提示');
    t.ok(gold.lines.indexOf('施展【金刃术】') >= 0, '但金刃术本身应正常施放（只取伤害）');
  });

  S.case('不施法：未配置 / 教学关的 BOSS 只走普攻', (t) => {
    const s = bare('不施法');
    const b = fightBoss(s, '木桩');
    t.eq(b.spellChance, 0, '未配置敌人 spellChance = 0');
    const out = [], fx = [];
    const cast = withRand(0, function () { return E.bossTryCast(s, b, out, fx); });
    t.eq(cast, false, 'spellChance=0 时不应施法');
    const b2 = fightBoss(s, '演武教头');
    t.eq(withRand(0, function () { return E.bossTryCast(s, b2, [], []); }), false, '教学关不施法');
  });

  return S;
};
